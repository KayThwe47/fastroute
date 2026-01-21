/**
 * API Client - Connects frontend to backend
 */
import axios from 'axios';

// Backend URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
});


// ============ TYPES ============

export interface Node {
  id: number;
  x: number;
  y: number;
  is_delivery_point: boolean;
  is_restaurant: boolean;
  restaurant_type: string | null;
}

export interface Bot {
  id: number;
  name: string;
  status: 'available' | 'busy' | 'returning' | 'offline';
  current_x: number;
  current_y: number;
  current_orders_count: number;
  total_deliveries: number;
}

export interface Restaurant {
  id: number;
  name: string;
  restaurant_type: 'RAMEN' | 'CURRY' | 'PIZZA' | 'SUSHI';
  node_id: number;
  is_active: boolean;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_address: string;
  pickup_node_id: number;
  delivery_node_id: number;
  restaurant_id: number;
  bot_id: number | null;
  status: string;
  estimated_time: number | null;
  created_at: string;
}

export interface MapData {
  grid_size: number;
  nodes: Node[];
  blocked_paths: { from_id: number; to_id: number }[];
  restaurants: Restaurant[];
  bots: Bot[];
}

export interface Stats {
  total_orders: number;
  pending_orders: number;
  active_deliveries: number;
  completed_deliveries: number;
  available_bots: number;
  busy_bots: number;
}

export interface RoutePoint {
  x: number;
  y: number;
}

export interface RouteData {
  path: RoutePoint[];
  distance: number;
  estimated_time: number;
}

export interface StreamData {
  type: string;
  timestamp: string;
  orders: Order[];
  bots: Bot[];
}


// ============ API FUNCTIONS ============

// Orders
export const getOrders = () => api.get<Order[]>('/api/orders');

export const createOrder = (data: {
  customer_name: string;
  customer_address: string;
  restaurant_id: number;
  delivery_x: number;
  delivery_y: number;
}) => api.post('/api/orders', null, { params: data });

export const updateOrderStatus = (orderId: number, status: string) =>
  api.put(`/api/orders/${orderId}/status/${status}`);

export const deleteOrder = (orderId: number) =>
  api.delete(`/api/orders/${orderId}`);

export const cancelOrder = (orderId: number) =>
  api.post(`/api/orders/${orderId}/cancel`);

// Bots
export const getBots = () => api.get<Bot[]>('/api/bots');

// Restaurants
export const getRestaurants = () => api.get<Restaurant[]>('/api/restaurants');

// Map
export const getMapData = () => api.get<MapData>('/api/map/data');
export const getStats = () => api.get<Stats>('/api/map/stats');
export const getRoute = (startX: number, startY: number, endX: number, endY: number) =>
  api.get<RouteData>('/api/map/route', {
    params: { start_x: startX, start_y: startY, end_x: endX, end_y: endY }
  });


// ============ SSE STREAMING ============

export const getStreamUrl = () => `${API_URL}/api/stream/orders`;

export const connectToStream = (
  onMessage: (data: StreamData) => void,
  onError?: (error: Event) => void
): EventSource => {
  const eventSource = new EventSource(getStreamUrl());
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Failed to parse SSE data:', e);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    if (onError) {
      onError(error);
    }
  };
  
  return eventSource;
};

export default api;