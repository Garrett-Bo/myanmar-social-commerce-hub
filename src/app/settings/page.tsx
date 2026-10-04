'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { ChannelConnection, Shop } from '@/types';
import {
  Settings,
  Smartphone,
  Send,
  CreditCard,
  CheckCircle2,
  Key,
  Save,
  Link2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { FacebookIcon, TikTokIcon } from '@/components/icons';

export default function SettingsPage() {
  const { currentShop, updateCurrentShop } = useAuth();
  const [shop, setShop] = useState<Shop>(currentShop);
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setShop(currentShop);
    async function loadChannels() {
      const chs = await db.getChannels(currentShop.id);
      setChannels(chs);
    }
    loadChannels();
  }, [currentShop]);

  // Gemini API key state
  const [geminiKey, setGeminiKey] = useState('');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCurrentShop({
      name: shop.name,
      ownerEmail: shop.ownerEmail,
      kpayNumber: shop.kpayNumber,
      kpayName: shop.kpayName,
      waveNumber: shop.waveNumber,
      waveName: shop.waveName,
      telegramChatId: shop.telegramChatId,
      telegramBotToken: shop.telegramBotToken,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const toggleChannel = (channelId: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, isActive: !c.isActive } : c))
    );
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Settings className="w-6 h-6 text-indigo-600" />
              <span>Channels, AI Agent & Payment Settings</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure your Facebook Pages, TikTok Shop, Telegram Alerts, and Myanmar KPay details.
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Saved Successfully!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
          {/* 1. Connected Channels (Facebook & TikTok) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Link2 className="w-4 h-4 text-indigo-600" />
              <span>Connected Multi-Channel Inboxes</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Facebook Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <FacebookIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Facebook Page Messenger</h3>
                    <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                      Page ID: 109283746501928
                    </p>
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Webhook Connected & Active
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleChannel('ch-fb-01')}
                  className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                    channels.find((c) => c.id === 'ch-fb-01')?.isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {channels.find((c) => c.id === 'ch-fb-01')?.isActive ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* TikTok Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
                    <TikTokIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">TikTok Shop & Direct Messages</h3>
                    <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                      Account: @aungthukha_trend
                    </p>
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Webhook Connected & Active
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleChannel('ch-tt-01')}
                  className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                    channels.find((c) => c.id === 'ch-tt-01')?.isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {channels.find((c) => c.id === 'ch-tt-01')?.isActive ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Myanmar Payments & Bank Account Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Myanmar Payment Details (KPay / WavePay)</span>
            </h2>
            <p className="text-slate-500 text-[11px]">
              The AI Agent automatically provides these exact payment details to customers when they confirm an order.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <h4 className="font-bold text-blue-700">KBZPay (KPay) Details</h4>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KPay Phone Number</label>
                  <input
                    type="text"
                    value={shop.kpayNumber || ''}
                    onChange={(e) => setShop({ ...shop, kpayNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KPay Account Name</label>
                  <input
                    type="text"
                    value={shop.kpayName || ''}
                    onChange={(e) => setShop({ ...shop, kpayName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-yellow-700">WavePay Details</h4>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WavePay Phone Number</label>
                  <input
                    type="text"
                    value={shop.waveNumber || ''}
                    onChange={(e) => setShop({ ...shop, waveNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WavePay Account Name</label>
                  <input
                    type="text"
                    value={shop.waveName || ''}
                    onChange={(e) => setShop({ ...shop, waveName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Telegram Instant Order Alerts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Send className="w-4 h-4 text-sky-500" />
              <span>Free Telegram Bot Order Alerts</span>
            </h2>
            <p className="text-slate-500 text-[11px]">
              Receive instant push alerts with customer address and KPay slips directly on your smartphone via Telegram.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telegram Bot Token</label>
                <input
                  type="text"
                  value={shop.telegramBotToken || ''}
                  onChange={(e) => setShop({ ...shop, telegramBotToken: e.target.value })}
                  placeholder="e.g. 789123456:AAFd9s8a7df98asd7f"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telegram Chat ID / Group</label>
                <input
                  type="text"
                  value={shop.telegramChatId || ''}
                  onChange={(e) => setShop({ ...shop, telegramChatId: e.target.value })}
                  placeholder="e.g. @aungthukha_orders_bot or -100123456"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* 4. Google Gemini Flash AI Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Google Gemini 2.5 / 3.0 Flash AI Engine</span>
            </h2>
            <p className="text-slate-500 text-[11px]">
              Optional: Enter your Google Gemini API key to enable direct cloud LLM generation for nuanced Burmese conversations.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gemini API Key</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-[11px]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center space-x-2 shadow-md shadow-indigo-100 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save All Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
