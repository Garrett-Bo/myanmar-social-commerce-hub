'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';

import { Order, OrderStatus } from '@/types';
import { toBurmeseNumerals } from '@/lib/burmese-converter';
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
  X,
  Check,
  Receipt,
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
              <ShoppingBag className="w-6 h-6 text-amber-600" />
              <span className="burmese-heading">အော်ဒါများနှင့် ငွေလွှဲစလစ် စစ်ဆေးခြင်း (Orders & Slips)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 burmese-text">
              Facebook Messenger နှင့် TikTok မှ AI စနစ်ဖြင့် အလိုအလျောက် ရယူထားသော အော်ဒါများ
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="bg-amber-50/80 border border-amber-200 px-3.5 py-2 rounded-xl text-center shadow-2xs">
              <span className="text-slate-500 block text-[10px] font-medium">Total Revenue (စုစုပေါင်း)</span>
              <span className="font-extrabold text-amber-900 text-sm">
                {totalRevenueMmk.toLocaleString()} MMK
              </span>
              <span className="text-[10px] text-amber-700 block burmese-text">
                ({toBurmeseNumerals(totalRevenueMmk.toLocaleString())} ကျပ်)
              </span>
            </div>

            <div className="bg-amber-100/60 border border-amber-300 px-3.5 py-2 rounded-xl text-center shadow-2xs">
              <span className="text-amber-800 block text-[10px] font-semibold">Pending Slips (စလစ်စစ်ရန်)</span>
              <span className="font-extrabold text-amber-950 text-sm">
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
              statusFilter === 'all' ? 'bg-slate-900 text-white font-semibold' : 'hover:bg-slate-100'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending_approval')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'pending_approval' ? 'bg-amber-600 text-white font-semibold' : 'hover:bg-slate-100 text-amber-800'
            }`}
          >
            Pending KPay Slip Check
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'confirmed' ? 'bg-emerald-600 text-white font-semibold' : 'hover:bg-slate-100 text-emerald-800'
            }`}
          >
            Confirmed (Ready to Pack)
          </button>
          <button
            onClick={() => setStatusFilter('shipped')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'shipped' ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-slate-100 text-indigo-800'
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
                {filteredOrders.map((ord) => {
                  const isBusGate = ord.township?.includes('Gate') || ord.township?.includes('ဂိတ်') || !['Yangon', 'Mandalay', 'Sanchaung', 'Bahan', 'Kamayut', 'Chanayethazan', 'Mahaaungmye'].some(t => ord.township?.includes(t));

                  return (
                    <tr key={ord.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="p-4 font-mono font-medium text-slate-900">
                        <div className="text-amber-800 font-bold">#{ord.id}</div>
                        <div className="text-[10px] text-slate-400">{ord.createdAt}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900 burmese-heading">{ord.customerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center mt-0.5 font-mono">
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          {ord.customerPhone}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-900 flex items-center">
                          <MapPin className="w-3 h-3 mr-1 text-amber-600" />
                          <span className="burmese-text">{ord.township}</span>
                          {isBusGate && (
                            <span className="ml-1.5 badge-busgate text-[9px] px-1.5 py-0.2 rounded font-bold">
                              ကားဂိတ်
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs burmese-text" title={ord.fullAddress}>
                          {ord.fullAddress}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          {ord.items.map((item, i) => (
                            <div key={i} className="text-slate-800 burmese-text">
                              <span className="font-medium">{item.name}</span>{' '}
                              <span className="text-slate-500 font-mono">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            ord.paymentMethod === 'kpay'
                              ? 'badge-royal'
                              : ord.paymentMethod === 'wavepay'
                              ? 'badge-shwe'
                              : 'badge-jade'
                          }`}
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          {ord.paymentMethod.toUpperCase()}
                        </span>
                        {ord.paymentSlipUrl && (
                          <button
                            onClick={() => setSelectedSlipOrder(ord)}
                            className="mt-1 text-[11px] text-amber-700 hover:text-amber-900 font-bold flex items-center transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-0.5" />
                            View Slip
                          </button>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-extrabold text-amber-900 text-sm font-mono">
                          {ord.totalMmk.toLocaleString()} MMK
                        </div>
                        <div className="text-[10px] text-slate-500 burmese-text">
                          ({toBurmeseNumerals(ord.totalMmk.toLocaleString())} ကျပ်)
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Deli: {ord.deliveryFeeMmk.toLocaleString()} MMK
                        </div>
                      </td>

                      <td className="p-4">
                        {ord.status === 'pending_approval' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold badge-shwe">
                            <Clock className="w-3 h-3 mr-1" />
                            Verify Slip
                          </span>
                        )}
                        {ord.status === 'confirmed' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold badge-jade">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirmed
                          </span>
                        )}
                        {ord.status === 'shipped' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold badge-busgate">
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
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] shadow-xs transition-colors"
                            >
                              Approve Slip
                            </button>
                          )}
                          {ord.status === 'confirmed' && (
                            <button
                              onClick={() => updateOrderStatus(ord.id, 'shipped')}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[11px] transition-colors"
                            >
                              Mark Shipped
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slip Preview Modal */}
      {selectedSlipOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm burmese-heading">
                    KPay / WavePay ငွေလွှဲစလစ် စစ်ဆေးခြင်း
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Order #{selectedSlipOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlipOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-64 relative">
              <img
                src={selectedSlipOrder.paymentSlipUrl}
                alt="Payment Slip"
                className="max-h-80 object-contain rounded-lg border border-slate-800 shadow-md"
              />
              <div className="absolute top-6 right-6 badge-jade px-2 py-0.5 rounded text-[10px] font-bold shadow-xs">
                KBZPay Live Slip
              </div>
            </div>

            <div className="p-4 bg-amber-50/50 border-t border-amber-200/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Customer:</span>
                <span className="font-bold text-slate-900 burmese-text">{selectedSlipOrder.customerName} ({selectedSlipOrder.customerPhone})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Destination:</span>
                <span className="font-bold text-slate-900 burmese-text">{selectedSlipOrder.township}</span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-amber-300 pt-1.5">
                <span className="text-amber-900 font-semibold">Total Transfer Amount:</span>
                <div className="text-right">
                  <span className="font-extrabold text-amber-900 text-sm font-mono block">
                    {selectedSlipOrder.totalMmk.toLocaleString()} MMK
                  </span>
                  <span className="text-[10px] text-amber-700 burmese-text">
                    ({toBurmeseNumerals(selectedSlipOrder.totalMmk.toLocaleString())} ကျပ်)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end space-x-2 bg-white">
              <button
                onClick={() => setSelectedSlipOrder(null)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  updateOrderStatus(selectedSlipOrder.id, 'confirmed');
                  setSelectedSlipOrder(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm shadow-emerald-200"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Verify & Approve Order</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

