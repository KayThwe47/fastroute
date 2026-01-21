'use client';

import React, { useState } from 'react';
import { Restaurant, createOrder } from '@/lib/api';

interface OrderFormProps {
  restaurants: Restaurant[];
  selectedPoint: { x: number; y: number } | null;
  onOrderCreated: () => void;
  onClearSelection: () => void;
}

export default function OrderForm({
  restaurants,
  selectedPoint,
  onOrderCreated,
  onClearSelection,
}: OrderFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const restaurantEmoji: Record<string, string> = {
    RAMEN: '🍜',
    CURRY: '🍛',
    PIZZA: '🍕',
    SUSHI: '🍣',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!customerName.trim()) {
      setMessage({ type: 'error', text: 'Please enter customer name' });
      return;
    }
    if (!restaurantId) {
      setMessage({ type: 'error', text: 'Please select a restaurant' });
      return;
    }
    if (!selectedPoint) {
      setMessage({ type: 'error', text: 'Please click on the map to select delivery location' });
      return;
    }

    setLoading(true);

    try {
      await createOrder({
        customer_name: customerName,
        customer_address: customerAddress || '',
        restaurant_id: parseInt(restaurantId),
        delivery_x: selectedPoint.x,
        delivery_y: selectedPoint.y,
      });

      setMessage({ type: 'success', text: `Order created! Delivery to L${selectedPoint.y}${selectedPoint.x}` });
      setCustomerName('');
      setCustomerAddress('');
      setRestaurantId('');
      onClearSelection();
      onOrderCreated();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to create order';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
        📝 Create New Order
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            👤 Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Enter customer name"
          />
        </div>

        {/* Address Description (Optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🏠 Address Details (Optional)
          </label>
          <input
            type="text"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="e.g., Apartment 3B, Gate Code: 1234"
          />
        </div>

        {/* Restaurant Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🍽️ Select Restaurant <span className="text-red-500">*</span>
          </label>
          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
          >
            <option value="">-- Choose Restaurant --</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {restaurantEmoji[r.restaurant_type]} {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Delivery Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📍 Delivery Location <span className="text-red-500">*</span>
          </label>
          {selectedPoint ? (
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="font-bold text-green-800">
                    L{selectedPoint.y}{selectedPoint.x}
                  </p>
                  <p className="text-sm text-green-600">
                    Grid position: ({selectedPoint.x}, {selectedPoint.y})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClearSelection}
                className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium"
              >
                ✕ Clear
              </button>
            </div>
          ) : (
            <div className="px-4 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 border-dashed rounded-xl text-center">
              <span className="text-3xl">👆</span>
              <p className="text-yellow-800 font-medium mt-1">
                Click on the map above to select delivery location
              </p>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`px-4 py-3 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border-2 border-green-300 text-green-800' 
              : 'bg-red-50 border-2 border-red-300 text-red-800'
          }`}>
            <span className="text-xl">{message.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !selectedPoint}
          className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg transition-all transform
            ${loading || !selectedPoint
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-[1.02] shadow-lg hover:shadow-xl'
            }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Creating Order...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              🚀 Create Order
            </span>
          )}
        </button>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center">
          ⚡ Orders are automatically assigned to available bots
          <br />
          📍 Address format: L{'{row}'}{'{col}'} (e.g., L00, L74)
        </p>
      </form>
    </div>
  );
}