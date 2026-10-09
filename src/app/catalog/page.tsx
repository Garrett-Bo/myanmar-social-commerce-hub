'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { Product } from '@/types';
import { exportProductsToCsv, parseGoogleSheetCsv } from '@/lib/google-sheets';
import { toBurmeseNumerals } from '@/lib/burmese-converter';
import {
  Package,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Check,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  ExternalLink,
  Download,
  Upload,
} from 'lucide-react';


export default function CatalogPage() {
  const { currentShop } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newSku, setNewSku] = useState('');
  const [newNameMm, setNewNameMm] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCategory, setNewCategory] = useState('Cosmetics');
  const [newPrice, setNewPrice] = useState('25000');
  const [newStock, setNewStock] = useState('10');
  const [newImageUrl, setNewImageUrl] = useState('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop');

  useEffect(() => {
    async function loadProducts() {
      const prods = await db.getProducts(currentShop.id);
      setProducts(prods);
    }
    loadProducts();
  }, [currentShop.id]);

  const handleSyncGoogleSheets = () => {
    setIsSyncing(true);
    setSyncSuccess(false);

    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    }, 1200);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameMm.trim()) return;

    const prod: Product = {
      id: `prod-${Date.now()}`,
      shopId: currentShop.id,
      sku: newSku || `SKU-${Math.floor(Math.random() * 8999 + 1000)}`,
      nameMm: newNameMm,
      nameEn: newNameEn || newNameMm,
      category: newCategory,
      priceMmk: parseInt(newPrice, 10) || 0,
      stockQuantity: parseInt(newStock, 10) || 0,
      imageUrl: newImageUrl,
      isAvailable: parseInt(newStock, 10) > 0,
    };

    await db.addProduct(prod);
    setProducts([prod, ...products]);
    setShowAddModal(false);
    // Reset form
    setNewNameMm('');
    setNewNameEn('');
  };

  const handleQuickStockUpdate = async (id: string, delta: number) => {
    await db.updateProductStock(currentShop.id, id, delta);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updatedStock = Math.max(0, p.stockQuantity + delta);
          return {
            ...p,
            stockQuantity: updatedStock,
            isAvailable: updatedStock > 0,
          };
        }
        return p;
      })
    );
  };

  const handleExportCsv = () => {
    const csv = exportProductsToCsv(products);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shwe_shop_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Package className="w-6 h-6 text-amber-600" />
              <span className="burmese-heading">ကုန်ပစ္စည်းများနှင့် လက်ကျန်စာရင်း (Catalog & Live Stock)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 burmese-text">
              AI Sales Agent မှ Facebook နှင့် TikTok ဖောက်သည်များထံ ပစ္စည်းဈေးနှုန်းနှင့် လက်ကျန်ကို တိုက်ရိုက် စစ်ဆေးဖြေကြားပေးပါသည်။
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleSyncGoogleSheets}
              disabled={isSyncing}
              className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center space-x-1.5 shadow-xs shadow-emerald-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Sheet...' : 'Sync Google Sheet'}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm shadow-amber-200/50"
            >
              <Plus className="w-4 h-4" />
              <span className="burmese-heading">+ ပစ္စည်းအသစ်ထည့်မည်</span>
            </button>
          </div>
        </div>

        {/* Sync Success Alert */}
        {syncSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-fade-in shadow-2xs">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="burmese-text">
                <strong>Google Sheets ချိတ်ဆက် အောင်မြင်ပါသည်!</strong> ပစ္စည်းဈေးနှုန်းနှင့် လက်ကျန်စာရင်းများကို AI အရောင်းကိုယ်စားလှယ်ထံ တိုက်ရိုက် ထည့်သွင်းပြီးပါပြီ။
              </span>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${currentShop.googleSheetId || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 underline font-semibold flex items-center space-x-1"
            >
              <span>Open Sheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Google Sheet Live Connection Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-teal-500/10 border border-emerald-200/80 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Connected Google Sheet: <span className="font-mono text-emerald-800 font-semibold">Aung Thukha Official Inventory (2026)</span>
              </p>
              <p className="text-slate-600 burmese-text">
                Google Sheets တွင် ပစ္စည်းစာရင်းနှင့် လက်ကျန်အရေအတွက် ပြင်ဆင်ပြီးပါက Sync ကို နှိပ်ပြီး ချက်ချင်း အပ်ဒိတ်လုပ်နိုင်ပါသည်။
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-slate-600 shrink-0 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>2-Way Live Sync Active</span>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col group"
            >
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                <img
                  src={prod.imageUrl}
                  alt={prod.nameMm}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-xs text-white text-[11px] font-mono font-medium rounded-full">
                  {prod.sku}
                </span>
                <span className="absolute bottom-3 left-3 px-2 py-0.5 bg-white/90 backdrop-blur-xs text-slate-800 text-[10px] font-semibold rounded-md shadow-2xs">
                  {prod.category}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug burmese-heading">
                    {prod.nameMm}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{prod.nameEn}</p>

                  <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Price (ဈေးနှုန်း):</span>
                      <p className="text-base font-extrabold text-amber-900 font-mono">
                        {prod.priceMmk.toLocaleString()} MMK
                      </p>
                      <p className="text-[11px] text-amber-700 burmese-text">
                        ({toBurmeseNumerals(prod.priceMmk.toLocaleString())} ကျပ်)
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block font-medium">Stock (လက်ကျန်):</span>
                      {prod.stockQuantity > 0 ? (
                        <div className="mt-1">
                          <span className="badge-jade text-[11px] px-2 py-0.5 rounded-full font-bold inline-flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            {prod.stockQuantity} units
                          </span>
                          <span className="text-[10px] text-emerald-700 block burmese-text mt-0.5">
                            (လက်ကျန် {toBurmeseNumerals(prod.stockQuantity)} ခု)
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold inline-flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1 text-rose-500" />
                            Out of Stock
                          </span>
                          <span className="text-[10px] text-rose-600 block burmese-text mt-0.5">
                            (ပစ္စည်းပြတ်နေပါသည်)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stock Modifier Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Quick Stock:</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleQuickStockUpdate(prod.id, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
                    >
                      -1
                    </button>
                    <span className="px-2 font-mono font-bold text-slate-800">
                      {prod.stockQuantity}
                    </span>
                    <button
                      onClick={() => handleQuickStockUpdate(prod.id, 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleQuickStockUpdate(prod.id, 10)}
                      className="px-2.5 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold flex items-center justify-center transition-colors text-[11px] border border-amber-200"
                    >
                      +10
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Add New Product to Catalog</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Product Name in Burmese (မြန်မာအမည်) *
                </label>
                <input
                  type="text"
                  required
                  value={newNameMm}
                  onChange={(e) => setNewNameMm(e.target.value)}
                  placeholder="e.g. ပန်းပွင့်ဂါဝန် အသစ်"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Product Name in English
                </label>
                <input
                  type="text"
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  placeholder="e.g. Summer French Floral Dress"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="e.g. DRESS-009"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="Cosmetics">Cosmetics</option>
                    <option value="Skincare">Skincare</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Bags & Accessories">Bags & Accessories</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Price (MMK) *</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Initial Stock Count *</label>
                  <input
                    type="number"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Image URL</label>
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
