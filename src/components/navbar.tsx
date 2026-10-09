'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { MessageSquare, Package, ShoppingBag, Settings, Bot, Store, ChevronDown, ShieldCheck } from 'lucide-react';

export function Navbar() {
  const { currentShop, availableShops, switchShop } = useAuth();
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Dynamic Shop Title / Switcher */}
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0"
          >
            <Bot className="w-5 h-5" />
          </Link>

          <div className="relative group">
            <div className="flex items-center space-x-1.5 cursor-pointer">
              <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight truncate max-w-[180px] sm:max-w-xs burmese-heading">
                {currentShop?.name || 'ShweShop AI'}
              </span>
              {currentShop?.subscription?.plan === 'business' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold badge-royal">
                  Business
                </span>
              ) : currentShop?.subscription?.plan === 'pro' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold badge-shwe">
                  ★ Pro
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium badge-thanaka">
                  Starter
                </span>
              )}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium badge-jade">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                Live
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </div>

            {/* Quick Switch Dropdown */}
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 hidden group-hover:block z-50">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Shop Account
              </div>
              {availableShops.map((s) => (
                <button
                  key={s.id}
                  onClick={() => switchShop(s.id)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-amber-50/50 transition-colors ${
                    s.id === currentShop?.id ? 'text-amber-800 font-bold bg-amber-50/70' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate burmese-text">{s.name}</span>
                  {s.id === currentShop?.id && <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <Link
                  href="/login"
                  className="block px-3 py-1.5 text-xs text-amber-700 hover:text-amber-800 font-semibold"
                >
                  + Add or Manage Shops
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <Link
            href="/"
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/'
                ? 'text-indigo-700 bg-indigo-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Live Inbox</span>
          </Link>
          <Link
            href="/catalog"
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/catalog'
                ? 'text-indigo-700 bg-indigo-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Catalog & Stock</span>
          </Link>
          <Link
            href="/orders"
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/orders'
                ? 'text-indigo-700 bg-indigo-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Orders & Slips</span>
          </Link>
          <Link
            href="/settings"
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/settings'
                ? 'text-indigo-700 bg-indigo-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Channels & AI</span>
          </Link>
        </nav>

        {/* SaaS Provider Console & Shop Switcher */}
        <div className="flex items-center space-x-2">
          <Link
            href="/provider"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              pathname === '/provider'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'border-purple-200 text-purple-700 hover:bg-purple-50 bg-purple-50/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Provider Console</span>
          </Link>

          <Link
            href="/login"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden md:inline">Shops Portal</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
