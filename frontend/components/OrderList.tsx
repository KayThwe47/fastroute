'use client';

import React from 'react';
import { Order, Restaurant, updateOrderStatus, deleteOrder, cancelOrder } from '@/lib/api';

interface OrderListProps {
  orders: Order[];
  restaurants: Restaurant[];
  onRefresh: () => void;
  onSelectOrder?: (order: Order | null) => void;
  selectedOrderId?: number | null;
}

export default function OrderList({ 
  orders, 
  restaurants, 
  onRefresh, 
  onSelectOrder,
  selectedOrderId 
}: OrderListProps) {
  
  // Get restaurant name by ID
  const getRestaurantName = (id: number) => {
    const restaurant = restaurants.find((r) => r.id === id);
    return restaurant?.name || 'Unknown';
  };

  const getRestaurantEmoji = (id: number) => {
    const restaurant = restaurants.find((r) => r.id === id);
    const emojis: Record<string, string> = {
      RAMEN: '🍜',
      CURRY: '🍛',
      PIZZA: '🍕',
      SUSHI: '🍣',
    };
    return restaurant ? emojis[restaurant.restaurant_type] || '🍽️' : '🍽️';
  };

  // Status flow and progress
  const statusFlow = ['pending', 'assigned', 'picking_up', 'picked_up', 'delivering', 'delivered'];
  
  const getProgress = (status: string) => {
    const index = statusFlow.indexOf(status);
    if (index === -1) return 0;
    return Math.round((index / (statusFlow.length - 1)) * 100);
  };

  const getNextStatus = (currentStatus: string) => {
    const index = statusFlow.indexOf(currentStatus);
    if (index >= 0 && index < statusFlow.length - 1) {
      return statusFlow[index + 1];
    }
    return null;
  };

  // Estimated time based on status
  const getEstimatedTime = (order: Order) => {
    const statusTimes: Record<string, string> = {
      pending: 'Waiting for bot...',
      assigned: '~5 min (Bot assigned)',
      picking_up: '~4 min (Going to restaurant)',
      picked_up: '~3 min (Picked up food)',
      delivering: '~2 min (On the way)',
      delivered: 'Delivered! ✅',
      cancelled: 'Cancelled ❌',
    };
    return statusTimes[order.status] || 'Unknown';
  };

  // Handle status update
  const handleAdvanceStatus = async (orderId: number, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus) {
      try {
        await updateOrderStatus(orderId, nextStatus);
        onRefresh();
      } catch (error) {
        alert('Failed to update status');
      }
    }
  };

  // Handle start simulation
  const handleStartSimulation = async (orderId: number) => {
    try {
      await fetch(`http://localhost:8000/api/simulation/start/${orderId}`, {
        method: 'POST'
      });
      onRefresh();
    } catch (error) {
      alert('Failed to start simulation');
    }
  };

  // Handle cancel
  const handleCancel = async (orderId: number) => {
    if (confirm('Cancel this order?')) {
      try {
        await cancelOrder(orderId);
        onRefresh();
      } catch (error) {
        alert('Failed to cancel order');
      }
    }
  };

  // Handle delete
  const handleDelete = async (orderId: number) => {
    if (confirm('Delete this order?')) {
      try {
        await deleteOrder(orderId);
        onRefresh();
      } catch (error) {
        alert('Failed to delete order');
      }
    }
  };

  // Status colors
  const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    assigned: 'bg-blue-100 text-blue-800 border-blue-300',
    picking_up: 'bg-purple-100 text-purple-800 border-purple-300',
    picked_up: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    delivering: 'bg-orange-100 text-orange-800 border-orange-300',
    delivered: 'bg-green-100 text-green-800 border-green-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };

  const statusIcons: Record<string, string> = {
    pending: '⏳',
    assigned: '🤖',
    picking_up: '📦',
    picked_up: '✅',
    delivering: '🚚',
    delivered: '🎉',
    cancelled: '❌',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">📦 Orders ({orders.length})</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          🔄 Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">📭</div>
          <p>No orders yet. Create your first order!</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {orders.map((order) => {
            const progress = getProgress(order.status);
            const isSelected = selectedOrderId === order.id;
            
            return (
              <div 
                key={order.id} 
                className={`border-2 rounded-xl p-4 transition-all cursor-pointer
                  ${isSelected ? 'ring-4 ring-blue-400' : 'hover:shadow-md'}
                  ${statusStyles[order.status]}`}
                onClick={() => onSelectOrder?.(isSelected ? null : order)}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getRestaurantEmoji(order.restaurant_id)}</span>
                    <div>
                      <h3 className="font-bold text-lg">Order #{order.id}</h3>
                      <p className="text-sm opacity-75">{order.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/50">
                    <span>{statusIcons[order.status]}</span>
                    <span className="font-medium capitalize">{order.status.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-current opacity-50 transition-all duration-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <span>🏪</span>
                    <span>{getRestaurantName(order.restaurant_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{order.customer_address}</span>
                  </div>
                  {order.bot_id && (
                    <div className="flex items-center gap-2">
                      <span>🤖</span>
                      <span>Bot #{order.bot_id}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span>⏱️</span>
                    <span>{getEstimatedTime(order)}</span>
                  </div>
                </div>

                {/* Route Info - Show when selected */}
                {isSelected && order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="mb-3 p-2 bg-white/30 rounded-lg text-sm">
                    <p className="font-medium mb-1">📍 Route Info:</p>
                    <p>• Pickup: Restaurant Node {order.pickup_node_id}</p>
                    <p>• Delivery: Node {order.delivery_node_id}</p>
                    <p className="text-xs mt-1 opacity-75">Route is shown on the map</p>
                  </div>
                )}

                {/* Actions */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-current/20">
                    {/* Start Simulation Button */}
                    {(order.status === 'assigned' || order.status === 'pending') && order.bot_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartSimulation(order.id);
                        }}
                        className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1"
                      >
                        🚀 Start Delivery
                      </button>
                    )}
                    
                    {/* Manual status advance (for testing) */}
                    {getNextStatus(order.status) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdvanceStatus(order.id, order.status);
                        }}
                        className="px-3 py-1.5 bg-white text-gray-800 text-sm rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 shadow-sm"
                      >
                        ➡️ {getNextStatus(order.status)?.replace('_', ' ')}
                      </button>
                    )}
                    
                    {/* Cancel Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(order.id);
                      }}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                    >
                      ❌ Cancel
                    </button>
                    
                    {/* Delete Button (only for pending) */}
                    {order.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(order.id);
                        }}
                        className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-1"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                )}

                {/* Completed/Cancelled badge */}
                {(order.status === 'delivered' || order.status === 'cancelled') && (
                  <div className="pt-3 border-t border-current/20 text-center">
                    <span className="text-sm font-medium">
                      {order.status === 'delivered' ? '✅ Order Completed' : '❌ Order Cancelled'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}