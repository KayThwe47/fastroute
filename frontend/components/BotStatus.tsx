'use client';

import React from 'react';
import { Bot } from '@/lib/api';

interface BotStatusProps {
  bots: Bot[];
}

export default function BotStatus({ bots }: BotStatusProps) {
  
  // Status configurations
  const statusConfig: Record<string, { color: string; bg: string; text: string; icon: string }> = {
    available: {
      color: 'bg-green-500',
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
      text: 'text-green-700',
      icon: '✅'
    },
    busy: {
      color: 'bg-yellow-500',
      bg: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200',
      text: 'text-yellow-700',
      icon: '🚚'
    },
    returning: {
      color: 'bg-blue-500',
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
      text: 'text-blue-700',
      icon: '🔄'
    },
    offline: {
      color: 'bg-gray-500',
      bg: 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200',
      text: 'text-gray-700',
      icon: '⭕'
    },
  };

  // Calculate summary
  const availableCount = bots.filter(b => b.status === 'available').length;
  const busyCount = bots.filter(b => b.status === 'busy').length;
  const totalCapacity = bots.reduce((sum, b) => sum + (3 - b.current_orders_count), 0);

  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        🤖 Bot Fleet
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
          <p className="text-2xl font-bold text-green-600">{availableCount}</p>
          <p className="text-xs text-green-700">Available</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
          <p className="text-2xl font-bold text-yellow-600">{busyCount}</p>
          <p className="text-xs text-yellow-700">Busy</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{totalCapacity}</p>
          <p className="text-xs text-blue-700">Capacity</p>
        </div>
      </div>

      {/* Bot List */}
      <div className="space-y-3">
        {bots.map((bot) => {
          const config = statusConfig[bot.status] || statusConfig.offline;
          const capacityPercent = (bot.current_orders_count / 3) * 100;
          
          return (
            <div 
              key={bot.id} 
              className={`border-2 rounded-xl p-4 transition-all hover:shadow-md ${config.bg}`}
            >
              {/* Bot Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${config.color} shadow-lg`}>
                    🤖
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{bot.name}</h3>
                    <p className="text-sm text-gray-500">
                      📍 L{bot.current_y}{bot.current_x} ({bot.current_x}, {bot.current_y})
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bg} border`}>
                    <span>{config.icon}</span>
                    <span className={`font-semibold capitalize ${config.text}`}>
                      {bot.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Orders Capacity</span>
                  <span className="font-semibold">{bot.current_orders_count} / 3</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      bot.current_orders_count === 3
                        ? 'bg-red-500'
                        : bot.current_orders_count >= 2
                        ? 'bg-yellow-500'
                        : bot.current_orders_count >= 1
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-between text-sm text-gray-500 pt-2 border-t border-current/10">
                <span>🎯 Total Deliveries: {bot.total_deliveries}</span>
                {bot.current_orders_count > 0 && (
                  <span className="text-orange-600 font-medium">
                    📦 {bot.current_orders_count} active order{bot.current_orders_count > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
        <p>⚡ Bots automatically pick up and deliver orders</p>
        <p>📦 Each bot can carry max 3 orders</p>
      </div>
    </div>
  );
}