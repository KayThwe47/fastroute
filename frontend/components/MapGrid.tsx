'use client';

import React, { useEffect, useState } from 'react';
import { MapData, Order, getRoute, RoutePoint } from '@/lib/api';

interface MapGridProps {
  mapData: MapData | null;
  selectedPoint: { x: number; y: number } | null;
  onNodeClick: (x: number, y: number) => void;
  selectedOrder?: Order | null;
}

export default function MapGrid({ mapData, selectedPoint, onNodeClick, selectedOrder }: MapGridProps) {
  const [routePath, setRoutePath] = useState<RoutePoint[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; time: number } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Calculate route when order is selected
  useEffect(() => {
    const calculateRoute = async () => {
      if (!selectedOrder || !mapData || selectedOrder.status === 'delivered' || selectedOrder.status === 'cancelled') {
        setRoutePath([]);
        setRouteInfo(null);
        return;
      }

      setLoadingRoute(true);

      try {
        // Get pickup node coordinates
        const pickupNode = mapData.nodes.find(n => n.id === selectedOrder.pickup_node_id);
        const deliveryNode = mapData.nodes.find(n => n.id === selectedOrder.delivery_node_id);

        if (!pickupNode || !deliveryNode) {
          setRoutePath([]);
          setRouteInfo(null);
          return;
        }

        // Get bot position or use pickup as start
        let startX = pickupNode.x;
        let startY = pickupNode.y;

        if (selectedOrder.bot_id) {
          const bot = mapData.bots.find(b => b.id === selectedOrder.bot_id);
          if (bot) {
            startX = bot.current_x;
            startY = bot.current_y;
          }
        }

        // Calculate route from bot/pickup to delivery
        const response = await getRoute(startX, startY, deliveryNode.x, deliveryNode.y);
        setRoutePath(response.data.path);
        setRouteInfo({
          distance: response.data.distance,
          time: response.data.estimated_time
        });
      } catch (error) {
        console.error('Failed to calculate route:', error);
        setRoutePath([]);
        setRouteInfo(null);
      } finally {
        setLoadingRoute(false);
      }
    };

    calculateRoute();
  }, [selectedOrder, mapData]);

  if (!mapData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  const gridSize = 9;

  // Check if a point is in the route
  const isInRoute = (x: number, y: number) => {
    return routePath.some(p => p.x === x && p.y === y);
  };

  // Get route index for a point (for coloring)
  const getRouteIndex = (x: number, y: number) => {
    return routePath.findIndex(p => p.x === x && p.y === y);
  };

  // Helper: Check if path is blocked
  const isBlocked = (x1: number, y1: number, x2: number, y2: number) => {
    const id1 = y1 * 9 + x1;
    const id2 = y2 * 9 + x2;
    return mapData.blocked_paths.some(
      (bp) => (bp.from_id === id1 && bp.to_id === id2) ||
              (bp.from_id === id2 && bp.to_id === id1)
    );
  };

  // Helper: Get restaurant at position
  const getRestaurant = (x: number, y: number) => {
    const nodeId = y * 9 + x;
    return mapData.restaurants.find((r) => r.node_id === nodeId);
  };

  // Helper: Get bot at position
  const getBot = (x: number, y: number) => {
    return mapData.bots.find((b) => b.current_x === x && b.current_y === y);
  };

  // Helper: Get node info
  const getNode = (x: number, y: number) => {
    const nodeId = y * 9 + x;
    return mapData.nodes.find((n) => n.id === nodeId);
  };

  // Check if this is pickup or delivery point for selected order
  const isPickupPoint = (x: number, y: number) => {
    if (!selectedOrder) return false;
    const node = mapData.nodes.find(n => n.id === selectedOrder.pickup_node_id);
    return node?.x === x && node?.y === y;
  };

  const isDeliveryPoint = (x: number, y: number) => {
    if (!selectedOrder) return false;
    const node = mapData.nodes.find(n => n.id === selectedOrder.delivery_node_id);
    return node?.x === x && node?.y === y;
  };

  // Emoji for restaurant type
  const restaurantEmoji: Record<string, string> = {
    RAMEN: '🍜',
    CURRY: '🍛',
    PIZZA: '🍕',
    SUSHI: '🍣',
  };

  // Bot status colors
  const botColors: Record<string, string> = {
    available: 'bg-green-500',
    busy: 'bg-yellow-500',
    returning: 'bg-blue-500',
    offline: 'bg-gray-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">📍 Delivery Map</h2>
        <div className="text-sm text-gray-500">9×9 Grid • Click to select delivery</div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-5 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍜</span>
          <span className="text-gray-600">Restaurant</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-gray-600">Bot</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🏠</span>
          <span className="text-gray-600">Delivery Point</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-red-400 rounded"></div>
          <span className="text-gray-600">Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-400 rounded"></div>
          <span className="text-gray-600">Route</span>
        </div>
      </div>

      {/* Route Info (when order selected) */}
      {selectedOrder && routeInfo && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗺️</span>
              <div>
                <p className="font-bold text-purple-800">Route for Order #{selectedOrder.id}</p>
                <p className="text-sm text-purple-600">
                  {selectedOrder.customer_name} • {selectedOrder.customer_address}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-700">{routeInfo.time}s</p>
              <p className="text-sm text-purple-500">{routeInfo.distance} nodes</p>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-sm">
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
              📦 Pickup: Node {selectedOrder.pickup_node_id}
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
              🏠 Delivery: Node {selectedOrder.delivery_node_id}
            </span>
          </div>
        </div>
      )}

      {loadingRoute && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-blue-700 text-center">
          ⏳ Calculating optimal route...
        </div>
      )}

      {/* Grid Container */}
      <div className="flex justify-center">
        <div className="inline-block border-2 border-gray-300 rounded-lg overflow-hidden shadow-inner bg-gray-100">
          {Array.from({ length: gridSize }, (_, y) => (
            <div key={y} className="flex">
              {Array.from({ length: gridSize }, (_, x) => {
                const restaurant = getRestaurant(x, y);
                const bot = getBot(x, y);
                const node = getNode(x, y);
                const isSelected = selectedPoint?.x === x && selectedPoint?.y === y;
                const inRoute = isInRoute(x, y);
                const routeIndex = getRouteIndex(x, y);
                const isPickup = isPickupPoint(x, y);
                const isDelivery = isDeliveryPoint(x, y);

                // Calculate route color intensity
                const routeIntensity = inRoute ? Math.max(0.3, 1 - (routeIndex / routePath.length) * 0.7) : 0;

                return (
                  <div
                    key={`${x}-${y}`}
                    onClick={() => onNodeClick(x, y)}
                    className={`
                      w-14 h-14 border border-gray-200 flex items-center justify-center
                      cursor-pointer relative transition-all duration-200
                      ${isSelected 
                        ? 'bg-blue-400 ring-4 ring-blue-300 scale-110 z-10' 
                        : ''
                      }
                      ${isPickup && !isSelected
                        ? 'bg-orange-300 ring-2 ring-orange-400'
                        : ''
                      }
                      ${isDelivery && !isSelected
                        ? 'bg-green-300 ring-2 ring-green-400'
                        : ''
                      }
                      ${inRoute && !isSelected && !isPickup && !isDelivery
                        ? 'bg-purple-300'
                        : ''
                      }
                      ${!inRoute && !isSelected && !isPickup && !isDelivery
                        ? 'hover:bg-blue-100 hover:scale-105'
                        : ''
                      }
                      ${node?.is_delivery_point && !isSelected && !inRoute ? 'bg-green-50' : ''}
                      ${restaurant && !isSelected && !inRoute ? 'bg-orange-50' : ''}
                    `}
                    style={inRoute && !isSelected ? { opacity: routeIntensity + 0.3 } : {}}
                    title={`Position: L${y}${x} (${x}, ${y})${inRoute ? ' - On Route' : ''}`}
                  >
                    {/* Route number */}
                    {inRoute && !restaurant && !bot && (
                      <span className="absolute top-0 left-1 text-[10px] font-bold text-purple-700">
                        {routeIndex + 1}
                      </span>
                    )}

                    {/* Pickup marker */}
                    {isPickup && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs z-20">
                        P
                      </div>
                    )}

                    {/* Delivery marker */}
                    {isDelivery && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs z-20">
                        D
                      </div>
                    )}

                    {/* Restaurant */}
                    {restaurant && (
                      <span className="text-2xl drop-shadow-md" title={restaurant.name}>
                        {restaurantEmoji[restaurant.restaurant_type]}
                      </span>
                    )}

                    {/* Bot */}
                    {bot && (
                      <div
                        className={`
                          absolute w-8 h-8 rounded-full flex items-center justify-center
                          text-lg shadow-lg ${botColors[bot.status]}
                          ${bot.status === 'busy' ? 'animate-pulse' : ''}
                        `}
                        title={`${bot.name} (${bot.status}) - Orders: ${bot.current_orders_count}/3`}
                      >
                        🤖
                      </div>
                    )}

                    {/* Delivery point (house) */}
                    {node?.is_delivery_point && !restaurant && !bot && (
                      <span className="text-xl opacity-60">🏠</span>
                    )}

                    {/* Empty node */}
                    {!restaurant && !bot && !node?.is_delivery_point && !inRoute && (
                      <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                    )}

                    {/* Route dot for empty route nodes */}
                    {!restaurant && !bot && !node?.is_delivery_point && inRoute && (
                      <span className="w-3 h-3 bg-purple-500 rounded-full shadow"></span>
                    )}

                    {/* Position label */}
                    <span className="absolute bottom-0 right-0.5 text-[8px] text-gray-400">
                      {y}{x}
                    </span>

                    {/* Blocked path indicators */}
                    {x < 8 && isBlocked(x, y, x + 1, y) && (
                      <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-10 bg-red-400 rounded z-20"></div>
                    )}
                    {y < 8 && isBlocked(x, y, x, y + 1) && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-10 bg-red-400 rounded z-20"></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected location info */}
      {selectedPoint && !selectedOrder && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <span className="text-blue-800 font-medium">
            📍 Selected: L{selectedPoint.y}{selectedPoint.x} (Position: {selectedPoint.x}, {selectedPoint.y})
          </span>
        </div>
      )}

      {/* Instructions */}
      {!selectedOrder && (
        <p className="mt-3 text-sm text-gray-500 text-center">
          💡 Click an order to see its delivery route on the map
        </p>
      )}
    </div>
  );
}