'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MapGrid from '@/components/MapGrid';
import OrderForm from '@/components/OrderForm';
import OrderList from '@/components/OrderList';
import BotStatus from '@/components/BotStatus';
import {
  MapData,
  Order,
  Stats,
  getMapData,
  getOrders,
  getStats,
  connectToStream,
  StreamData
} from '@/lib/api';

export default function Home() {
  // State
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [mapRes, ordersRes, statsRes] = await Promise.all([
        getMapData(),
        getOrders(),
        getStats(),
      ]);
      setMapData(mapRes.data);
      setOrders(ordersRes.data);
      setStats(statsRes.data);
      setError(null);

      // Update selected order if it exists
      if (selectedOrder) {
        const updatedOrder = ordersRes.data.find((o: Order) => o.id === selectedOrder.id);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        } else {
          setSelectedOrder(null);
        }
      }
    } catch (err) {
      setError('Failed to connect to server. Is backend running?');
    } finally {
      setLoading(false);
    }
  }, [selectedOrder]);

  // Load initial data
// Connect to SSE stream for real-time updates
useEffect(() => {
  let eventSource: EventSource | null = null;
  let pollInterval: NodeJS.Timeout | null = null;

  const connect = () => {
    eventSource = connectToStream(
      (data: StreamData) => {
        if (data.type === 'update') {
          setConnected(true);
          fetchData();
        }
      },
      (error) => {
        setConnected(false);
        setTimeout(connect, 5000);
      }
    );
  };

  connect();

  // Also poll every 1 second for bot position updates
  pollInterval = setInterval(() => {
    fetchData();
  }, 1000);

  return () => {
    if (eventSource) {
      eventSource.close();
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
}, []);

  // Connect to SSE stream for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      eventSource = connectToStream(
        (data: StreamData) => {
          if (data.type === 'update') {
            setConnected(true);
            fetchData();
          }
        },
        (error) => {
          setConnected(false);
          setTimeout(connect, 5000);
        }
      );
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Handle map click
  const handleNodeClick = (x: number, y: number) => {
    // Only allow selection when not viewing an order route
    if (!selectedOrder) {
      setSelectedPoint({ x, y });
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedPoint(null);
  };

  // Handle order selection
  const handleSelectOrder = (order: Order | null) => {
    setSelectedOrder(order);
    if (order) {
      setSelectedPoint(null); // Clear point selection when viewing order
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-10 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4 animate-bounce">🤖</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">fastroute</h2>
          <p className="text-gray-500">Loading delivery system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                🤖
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">fastroute</h1>
                <p className="text-sm text-gray-500">Route Optimization for Auto Delivery</p>
              </div>
            </div>
            
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              connected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="font-medium text-sm">
                {connected ? '🔴 Live Updates' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.total_orders}</p>
                </div>
                <div className="text-3xl opacity-50">📦</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Deliveries</p>
                  <p className="text-3xl font-bold text-orange-500">{stats.active_deliveries}</p>
                </div>
                <div className="text-3xl opacity-50">🚚</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-500">{stats.completed_deliveries}</p>
                </div>
                <div className="text-3xl opacity-50">✅</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Available Bots</p>
                  <p className="text-3xl font-bold text-purple-500">{stats.available_bots}<span className="text-lg text-gray-400">/5</span></p>
                </div>
                <div className="text-3xl opacity-50">🤖</div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Order Banner */}
        {selectedOrder && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🗺️</span>
              <div>
                <p className="font-bold text-lg">Viewing Route for Order #{selectedOrder.id}</p>
                <p className="text-purple-100">
                  {selectedOrder.customer_name} • {selectedOrder.customer_address}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              ✕ Close Route View
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Map & Order Form */}
          <div className="lg:col-span-2 space-y-6">
            <MapGrid
              mapData={mapData}
              selectedPoint={selectedPoint}
              onNodeClick={handleNodeClick}
              selectedOrder={selectedOrder}
            />
            {!selectedOrder && (
              <OrderForm
                restaurants={mapData?.restaurants || []}
                selectedPoint={selectedPoint}
                onOrderCreated={fetchData}
                onClearSelection={handleClearSelection}
              />
            )}
          </div>

          {/* Right Column - Orders & Bots */}
          <div className="space-y-6">
            <OrderList
              orders={orders}
              restaurants={mapData?.restaurants || []}
              onRefresh={fetchData}
              onSelectOrder={handleSelectOrder}
              selectedOrderId={selectedOrder?.id}
            />
            <BotStatus bots={mapData?.bots || []} />
          </div>
        </div>

        {/* Feature Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-md text-center">
            <div className="text-3xl mb-2">📍</div>
            <h3 className="font-bold text-gray-800">Select Points</h3>
            <p className="text-sm text-gray-500">Click map to choose delivery location</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md text-center">
            <div className="text-3xl mb-2">🗺️</div>
            <h3 className="font-bold text-gray-800">Auto Route</h3>
            <p className="text-sm text-gray-500">A* algorithm finds optimal path</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md text-center">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="font-bold text-gray-800">Bot Assignment</h3>
            <p className="text-sm text-gray-500">Auto-assign to available bots</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md text-center">
            <div className="text-3xl mb-2">📡</div>
            <h3 className="font-bold text-gray-800">Live Updates</h3>
            <p className="text-sm text-gray-500">Real-time status via SSE</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center py-6 border-t border-gray-200">
          <div className="flex justify-center items-center gap-2 mb-3">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-gray-700">fastroute v1.0</span>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>🗺️ Grid: 9×9 | 🤖 Bots: 5 | 📦 Max Orders/Bot: 3</p>
            <p>⏱️ Restaurant Rate Limit: 3 orders per 30 seconds</p>
            <p>📍 Address Format: Tokyo, Japan</p>
          </div>
        </footer>
      </main>
    </div>
  );
}