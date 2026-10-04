'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Bot, Store, ArrowRight, CheckCircle2, Sparkles, Plus, Building2 } from 'lucide-react';

export default function LoginPage() {
  const { availableShops, switchShop, createNewShop, currentShop } = useAuth();
  const router = useRouter();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newKpayPhone, setNewKpayPhone] = useState('');
  const [newKpayName, setNewKpayName] = useState('');

  const handleSelectShop = (shopId: string) => {
    switchShop(shopId);
    router.push('/');
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    await createNewShop(newShopName, newEmail, newKpayPhone, newKpayName);
    router.push('/');
  };

  return (
    <div className="flex-1 bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 p-8 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">ShweShop AI Multi-Tenant</h1>
          <p className="text-indigo-200 text-xs mt-1">
            Myanmar AI Social Commerce Platform • Seller Portal
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {!isCreatingNew ? (
            <>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
                  <span>Select Active Shop Account</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                    {availableShops.length} Registered Shops
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Each online shop operates in complete isolation with its own Facebook Page, catalog, stock, and orders.
                </p>
              </div>

              {/* Shop List */}
              <div className="space-y-3">
                {availableShops.map((shop) => {
                  const isActive = shop.id === currentShop.id;
                  return (
                    <div
                      key={shop.id}
                      onClick={() => handleSelectShop(shop.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900">{shop.name}</span>
                            {isActive && (
                              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{shop.ownerEmail}</p>
                          {shop.kpayNumber && (
                            <p className="text-[11px] text-indigo-600 font-medium">
                              KPay: {shop.kpayNumber} ({shop.kpayName})
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-indigo-600 font-semibold text-xs space-x-1">
                        <span>Open Inbox</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Register New Shop Button */}
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="w-full py-3 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/40 transition-all flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Register a New Myanmar Online Shop</span>
              </button>
            </>
          ) : (
            /* Register New Shop Form */
            <form onSubmit={handleCreateShop} className="space-y-4 text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Register New Online Shop</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up your brand name and Myanmar payment details to start receiving automated AI orders.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Shop Name (မြန်မာအမည်) *
                </label>
                <input
                  type="text"
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. Shwe Taung Fashion (ရန်ကုန်)"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="seller@gmail.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    KBZPay (KPay) Number
                  </label>
                  <input
                    type="text"
                    value={newKpayPhone}
                    onChange={(e) => setNewKpayPhone(e.target.value)}
                    placeholder="09xxxxxxxxx"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    KPay Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={newKpayName}
                    onChange={(e) => setNewKpayName(e.target.value)}
                    placeholder="e.g. Daw Aye Aye"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Back to List
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 transition-colors flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create & Launch Shop</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
