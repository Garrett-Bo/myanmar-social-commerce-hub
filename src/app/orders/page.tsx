'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { Order, OrderStatus } from '@/types';
import {
  ShoppingBag,
  CheckCircle2,
  Clock,
  Truck,
  CreditCard,
  Eye,
  AlertTriangle,
  Phone,
  MapPin,
  Filter,
} from 'lucide-react';

export default function OrdersPage() {
  const { currentShop } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [selectedSlipOrder, setSelectedSlipOrder] = useState<Order | null>(null);

  useEffect(() => {
    async function loadOrders() {
      const ords = await db.getOrders(currentShop.id);
      setOrders(ords);
    }
    loadOrders();
  }, [currentShop.id]);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    await db.updateOrderStatus(currentShop.id, orderId, newStatus);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const totalRevenueMmk = orders
    .filter((o) => o.status === 'confirmed' || o.status === 'shipped')
    .reduce((acc, o) => acc + o.totalMmk, 0);

  const pendingApprovalCount = orders.filter(
    (o) => o.status === 'pending_approval' || o.status === 'pending_slip'
  ).length;

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <ShoppingBag className="w-6 h-6 text-indigo-600" />
              <span>Myanmar Social Commerce Orders & Slip Verification</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Orders automatically captured by AI from Facebook and TikTok conversations.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="bg-indigo-50 border border-indigo-100 px-3.5 py-2 rounded-xl text-center">
              <span className="text-slate-500 block text-[10px]">Total Revenue</span>
              <span className="font-extrabold text-indigo-700 text-sm">
                {totalRevenueMmk.toLocaleString()} MMK
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-100 px-3.5 py-2 rounded-xl text-center">
              <span className="text-slate-500 block text-[10px]">Pending Slips/Approval</span>
              <span className="font-extrabold text-amber-700 text-sm">
                {pendingApprovalCount} Orders
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 overflow-x-auto">
          <Filter className="w-4 h-4 ml-2 text-slate-400 shrink-0" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'all' ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-slate-100'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending_approval')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'pending_approval' ? 'bg-amber-600 text-white font-semibold' : 'hover:bg-slate-100'
            }`}
          >
            Pending KPay Slip Check
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'confirmed' ? 'bg-emerald-600 text-white font-semibold' : 'hover:bg-slate-100'
            }`}
          >
            Confirmed (Ready to Pack)
          </button>
          <button
            onClick={() => setStatusFilter('shipped')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'shipped' ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100'
            }`}
          >
            Shipped (Delivered to Gate/Deli)
          </button>
        </div>

        {/* Orders Table / Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Order ID & Date</th>
                  <th className="p-4">Customer Info</th>
                  <th className="p-4">Township & Deli</th>
                  <th className="p-4">Items Ordered</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Total (MMK)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-medium text-slate-900">
                      <div>#{ord.id}</div>
                      <div className="text-[10px] text-slate-400">{ord.createdAt}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{ord.customerName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center mt-0.5">
                        <Phone className="w-3 h-3 mr-1 text-slate-400" />
                        {ord.customerPhone}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-indigo-700 flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-indigo-500" />
                        {ord.township}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs" title={ord.fullAddress}>
                        {ord.fullAddress}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="space-y-1">
                        {ord.items.map((item, i) => (
                          <div key={i} className="text-slate-800">
                            <span className="font-semibold">{item.name}</span>{' '}
                            <span className="text-slate-500 font-mono">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          ord.paymentMethod === 'kpay'
                            ? 'bg-blue-100 text-blue-800'
                            : ord.paymentMethod === 'wavepay'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <CreditCard className="w-3 h-3 mr-1" />
                        {ord.paymentMethod.toUpperCase()}
                      </span>
                      {ord.paymentSlipUrl && (
                        <button
                          onClick={() => setSelectedSlipOrder(ord)}
                          className="mt-1 block text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center"
                        >
                          <Eye className="w-3 h-3 mr-0.5" />
                          View Slip
                        </button>
                      )}
                    </td>

                    <td className="p-4 font-mono font-bold text-slate-900 text-sm">
                      {ord.totalMmk.toLocaleString()} MMK
                      <div className="text-[10px] text-slate-400 font-normal">
                        Deli: {ord.deliveryFeeMmk.toLocaleString()}
                      </div>
                    </td>

                    <td className="p-4">
                      {ord.status === 'pending_approval' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Verify Slip
                        </span>
                      )}
                      {ord.status === 'confirmed' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Confirmed
                        </span>
                      )}
                      {ord.status === 'shipped' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                          <Truck className="w-3 h-3 mr-1" />
                          Shipped
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {ord.status === 'pending_approval' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'confirmed')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] shadow-xs"
                          >
                            Approve Slip
                          </button>
                        )}
                        {ord.status === 'confirmed' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'shipped')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px]"
                          >
                            Mark Shipped
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slip Preview Modal */}
      {selectedSlipOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  KPay / Bank Transaction Slip
                </h3>
                <p className="text-xs text-slate-500">Order #{selectedSlipOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedSlipOrder(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-64">
              <img
                src={selectedSlipOrder.paymentSlipUrl}
                alt="Payment Slip"
                className="max-h-80 object-contain rounded-lg"
              />
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block">Total Due:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedSlipOrder.totalMmk.toLocaleString()} MMK
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    updateOrderStatus(selectedSlipOrder.id, 'confirmed');
                    setSelectedSlipOrder(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Verify & Approve Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
