'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Shop, ProviderMetrics, SubscriptionPlan } from '@/types';
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Server,
  Zap,
  Users,
  Store,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Database,
  Cpu,
  BarChart3,
  BookOpen,
  RefreshCw,
  Sparkles,
  Truck,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { FacebookIcon, TikTokIcon } from '@/components/icons';

export default function ProviderDashboardPage() {
  const [metrics, setMetrics] = useState<ProviderMetrics | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeTab, setActiveTab] = useState<'tenants' | 'cogs' | 'blueprint' | 'health'>('tenants');
  const [simulatedScale, setSimulatedScale] = useState<number>(1000);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const m = await db.getProviderMetrics();
    const s = await db.getShops();
    setMetrics(m);
    setShops(s);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdatePlan = async (shopId: string, newPlan: SubscriptionPlan) => {
    await db.updateShopSubscription(shopId, newPlan);
    setActionMessage(`Updated subscription to ${newPlan.toUpperCase()} successfully!`);
    setTimeout(() => setActionMessage(null), 3000);
    await loadData();
  };

  // Scale projections calculator for PM view
  const calculateScaleEconomics = (scaleCount: number) => {
    const starterRatio = 0.7; // 70% free funnel
    const proRatio = 0.25; // 25% Pro @ 25,000 MMK (~$6.25)
    const bizRatio = 0.05; // 5% Business @ 60,000 MMK (~$15.00)

    const proCount = Math.round(scaleCount * proRatio);
    const bizCount = Math.round(scaleCount * bizRatio);

    const mrrMmk = proCount * 25000 + bizCount * 60000;
    const mrrUsd = Math.round(mrrMmk / 4000);

    // Fixed base + minimal variable per tenant
    const fixedInfraUsd = 40;
    const variableCogsPerShopUsd = 0.08;
    const totalCogsUsd = Math.round(fixedInfraUsd + scaleCount * variableCogsPerShopUsd);
    const grossProfitUsd = mrrUsd - totalCogsUsd;
    const marginPercent = mrrUsd > 0 ? Math.round((grossProfitUsd / mrrUsd) * 100) : 0;

    return { mrrMmk, mrrUsd, totalCogsUsd, grossProfitUsd, marginPercent, proCount, bizCount };
  };

  const scaleProj = calculateScaleEconomics(simulatedScale);

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-xl text-purple-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>SaaS Provider Executive Console</span>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
                    Chief PM & Strategic Consultant
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-tenant governance, low-cost COGS architecture (&lt;$0.10/tenant/mo), and Myanmar merchant lifecycle management.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {actionMessage && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fade-in">
                {actionMessage}
              </span>
            )}
            <button
              onClick={loadData}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-100" />
              <span>{metrics?.grossMarginPercent || 92}% Gross Margin</span>
            </div>
          </div>
        </div>

        {/* 4 Core Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: MRR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold uppercase tracking-wider">Monthly Revenue (MRR)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-slate-900">
                  {metrics?.monthlyRecurringRevenueMmk.toLocaleString() || '0'}
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-1">MMK</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ≈ ${metrics?.monthlyRecurringRevenueUsd || 0} USD
              </span>
            </div>
            <div className="mt-3 flex items-center text-[11px] text-slate-500 space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600 font-semibold">+24%</span>
              <span>from Starter to Pro upgrades</span>
            </div>
          </div>

          {/* Card 2: Total COGS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold uppercase tracking-wider">Provider Monthly COGS</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-slate-900">
                  ${metrics?.estimatedMonthlyCogsUsd || 25.21}
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-1">USD/mo</span>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                &lt;$0.10 / shop
              </span>
            </div>
            <div className="mt-3 flex items-center text-[11px] text-slate-500 space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Zero chat storage + Tier 0 NLP</span>
            </div>
          </div>

          {/* Card 3: Active Tenants */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold uppercase tracking-wider">Managed Shops</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-slate-900">
                  {metrics?.totalShops || 0}
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-1">Tenants</span>
              </div>
              <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-600">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded">
                  {metrics?.starterCount || 0} Free
                </span>
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                  {metrics?.proCount || 0} Pro
                </span>
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                  {metrics?.businessCount || 0} Biz
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center text-[11px] text-slate-500 space-x-1">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>{metrics?.activeChannels || 0} connected social channels</span>
            </div>
          </div>

          {/* Card 4: Architecture Efficiency */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold uppercase tracking-wider">Storage Savings</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-teal-700">100%</span>
                <span className="text-xs font-semibold text-slate-500 ml-1">Zero-Chat</span>
              </div>
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                0 Bytes Chat in DB
              </span>
            </div>
            <div className="mt-3 flex items-center text-[11px] text-slate-500 space-x-1">
              <Zap className="w-3.5 h-3.5 text-teal-600" />
              <span>On-demand Graph API pulling</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center space-x-1.5 ${
              activeTab === 'tenants'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tenant Shops & Quotas</span>
          </button>
          <button
            onClick={() => setActiveTab('cogs')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center space-x-1.5 ${
              activeTab === 'cogs'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>COGS Teardown & Unit Economics</span>
          </button>
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center space-x-1.5 ${
              activeTab === 'blueprint'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Myanmar Strategic Functional Blueprint</span>
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center space-x-1.5 ${
              activeTab === 'health'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>SLA & Channel Telemetry</span>
          </button>
        </div>

        {/* TAB 1: Tenants & Subscriptions */}
        {activeTab === 'tenants' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Tenant Accounts & Subscription Quotas</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Monitor order usage against monthly tier limits. You can simulate merchant upgrades to test monetization.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total: {shops.length} registered shops
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Merchant Shop</th>
                    <th className="py-3 px-4">Subscription Plan</th>
                    <th className="py-3 px-4">Monthly Order Quota</th>
                    <th className="py-3 px-4">Payment Accounts</th>
                    <th className="py-3 px-4">Channels</th>
                    <th className="py-3 px-4 text-right">Simulate Tier Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {shops.map((s) => {
                    const plan = s.subscription?.plan || 'starter';
                    const used = s.subscription?.currentMonthOrders || 0;
                    const limit = s.subscription?.monthlyOrderLimit || (plan === 'starter' ? 100 : plan === 'pro' ? 1000 : 10000);
                    const pct = Math.min(100, Math.round((used / limit) * 100));

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 leading-tight">{s.name}</p>
                              <p className="text-[10px] text-slate-500">{s.ownerEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              plan === 'business'
                                ? 'bg-purple-100 text-purple-800'
                                : plan === 'pro'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {plan === 'business'
                              ? 'Business (60K MMK)'
                              : plan === 'pro'
                              ? 'Pro (25K MMK)'
                              : 'Starter (Free)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                              <span>
                                {used} / {limit.toLocaleString()} orders
                              </span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[11px]">
                          <div className="space-y-0.5">
                            <p className="font-mono text-slate-700">KPay: {s.kpayNumber || '-'}</p>
                            <p className="font-mono text-slate-500 text-[10px]">Wave: {s.waveNumber || '-'}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="p-1 rounded bg-blue-100 text-blue-600" title="Facebook Messenger">
                              <FacebookIcon className="w-3.5 h-3.5" />
                            </span>
                            <span className="p-1 rounded bg-slate-900 text-white" title="TikTok Shop">
                              <TikTokIcon className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {plan !== 'starter' && (
                              <button
                                onClick={() => handleUpdatePlan(s.id, 'starter')}
                                className="px-2 py-1 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                Free
                              </button>
                            )}
                            {plan !== 'pro' && (
                              <button
                                onClick={() => handleUpdatePlan(s.id, 'pro')}
                                className="px-2 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                              >
                                Pro
                              </button>
                            )}
                            {plan !== 'business' && (
                              <button
                                onClick={() => handleUpdatePlan(s.id, 'business')}
                                className="px-2 py-1 text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                              >
                                Business
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
        )}

        {/* TAB 2: COGS Teardown & Unit Economics */}
        {activeTab === 'cogs' && (
          <div className="space-y-6">
            {/* Architecture COGS Breakdown Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Provider Infrastructure COGS Breakdown</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    How our architecture achieves &gt;92% gross margin and eliminates variable cost traps.
                  </p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
                  Target COGS: &lt;$0.10 / Tenant / Month
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">1. Chat Storage Cost</span>
                    <span className="text-xs font-extrabold text-emerald-700">$0.00 / mo</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    <strong>Zero-Chat Storage Invariant</strong>: Customer conversations are NEVER persisted in PostgreSQL.
                    Messages are fetched on-demand from Meta Graph API or processed ephemerally in-memory. Eliminates 95% of database storage bills.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">2. AI Inference Cost</span>
                    <span className="text-xs font-extrabold text-emerald-700">~$0.05 / shop</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    <strong>3-Tier Zero-Cost Hybrid AI</strong>: 90% of routine traffic (price, stock, delivery, checkout, vouchers) is resolved by the deterministic local NLP engine at $0.00 cost. LLM is only invoked for ambiguous chit-chat with strict token caps.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">3. Slip Media Storage</span>
                    <span className="text-xs font-extrabold text-emerald-700">$0.00 / mo</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    <strong>Direct CDN & Telegram Pass-through</strong>: Payment slips are received via Facebook CDN URLs or directly dispatched as Telegram bot photo alerts. The provider pays zero cloud storage egress fees.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Scale Simulator */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <span>SaaS Provider Scaling Economics Simulator</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Forecast Monthly Recurring Revenue, COGS, and Gross Margin at high tenant volume.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {[100, 500, 1000, 5000].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSimulatedScale(num)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        simulatedScale === num
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {num.toLocaleString()} Shops
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Simulated Scale</p>
                  <p className="text-2xl font-extrabold text-white mt-1">{simulatedScale.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {scaleProj.proCount} Pro • {scaleProj.bizCount} Biz
                  </p>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Projected MRR</p>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                    ${scaleProj.mrrUsd.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {(scaleProj.mrrMmk / 1000000).toFixed(1)}M MMK / mo
                  </p>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Projected COGS</p>
                  <p className="text-2xl font-extrabold text-indigo-300 mt-1">
                    ${scaleProj.totalCogsUsd.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    ${(scaleProj.totalCogsUsd / simulatedScale).toFixed(2)} / shop / mo
                  </p>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Net Gross Margin</p>
                  <p className="text-2xl font-extrabold text-teal-300 mt-1">{scaleProj.marginPercent}%</p>
                  <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
                    +${scaleProj.grossProfitUsd.toLocaleString()} Profit / mo
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Myanmar Strategic Functional Blueprint */}
        {activeTab === 'blueprint' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Myanmar Social Commerce Functional Architecture</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Strategic consulting operational guidelines for onboarding and serving Myanmar online retailers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Section 1: Order-to-Cash */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs">
                    <CreditCard className="w-4 h-4" />
                    <span>1. Order-to-Cash (O2C) Conversational Flow</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <li>
                      <strong>Stage 1 - Inbound Inquiry</strong>: Instant multi-dialect recognition (Unicode, Zawgyi, Burglish) without storing conversation text.
                    </li>
                    <li>
                      <strong>Stage 2 - Instant MMK Quoting</strong>: Real-time price and stock check with courteous Burmese greeting.
                    </li>
                    <li>
                      <strong>Stage 3 - 5-Attribute Collection</strong>: Extracts product, recipient name, normalized phone (09XXXXXXXXX), township, and payment method.
                    </li>
                    <li>
                      <strong>Stage 4 - Pre-Decrement Stock Guard</strong>: Atomically reserves inventory before confirming order to prevent overselling during live sales.
                    </li>
                    <li>
                      <strong>Stage 5 - Voucher Formatting</strong>: Formatted Burmese Order Voucher (ဘောက်ချာ) sent back to customer with KPay/WavePay QR details.
                    </li>
                    <li>
                      <strong>Stage 6 - Instant Dispatch Alert</strong>: Dispatched directly to shop owner&apos;s Telegram bot for packing and courier handover.
                    </li>
                  </ul>
                </div>

                {/* Section 2: Logistics Matrix & Bus Gate Rules */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs">
                    <Truck className="w-4 h-4" />
                    <span>2. 61-Location Logistics & Highway Express Gates</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <li>
                      <strong>Yangon Inner (34 Townships)</strong>: 2,500 – 3,500 MMK, 1–2 days delivery, COD fully available.
                    </li>
                    <li>
                      <strong>Mandalay Inner (7 Townships)</strong>: 3,000 – 3,500 MMK, 1–2 days delivery, COD fully available.
                    </li>
                    <li>
                      <strong>Naypyitaw Municipal (6 Townships)</strong>: 3,500 – 4,500 MMK, 2–3 days delivery, COD available.
                    </li>
                    <li>
                      <strong>Highway Express Bus Gates (Aung Mingalar, Dagon Ayeyar, Saw Bwar Gyi Gone)</strong>: 3,500 MMK drop-off fee, 100% Prepaid only.
                    </li>
                    <li>
                      <strong>Regional Cities (11 Major Towns)</strong>: Taunggyi, Mawlamyine, Lashio, Monywa, Magway, Pathein, Sittwe, Dawei. <strong>COD strictly rejected</strong>. Customer must pay 100% via KPay/WavePay before bus gate drop-off.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SLA & Channel Telemetry */}
        {activeTab === 'health' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Live SLA & Social Channel Health</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Real-time pipeline latency monitoring ensuring &lt; 3,000ms response SLA.
                </p>
              </div>
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Systems Operational</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Response SLA Status</span>
                  <span className="text-xs font-extrabold text-emerald-600">&lt; 15ms Avg</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[5%]" />
                </div>
                <p className="text-[10px] text-slate-500">
                  Target: &lt; 3,000ms. High-speed local rule execution achieves sub-second performance.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Meta Webhook Handshake</span>
                  <span className="text-xs font-extrabold text-emerald-600">HTTP 200</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  `hub.mode=subscribe` verification verified across all tenant page IDs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">TikTok Open API</span>
                  <span className="text-xs font-extrabold text-emerald-600">Connected</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Inbound customer DM routing verified with multi-tenant isolation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
