import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { MessageSquare, Package, ShoppingBag, Settings, Bot, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Myanmar AI Social Commerce Hub | FB & TikTok Inbox',
  description: 'Low-cost unified chat centralization for Facebook Messenger and TikTok Shop in Myanmar.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="my">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo & Shop Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base text-slate-900 tracking-tight">
                    ShweShop AI
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-normal">
                  FB & TikTok Unified Chat • ရန်ကုန်
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-1 sm:space-x-2">
              <Link
                href="/"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Live Inbox</span>
              </Link>
              <Link
                href="/catalog"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Catalog & Stock</span>
              </Link>
              <Link
                href="/orders"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Orders & Slips</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Channels & AI</span>
              </Link>
            </nav>

            {/* Quick Status / AI Toggle Indicator */}
            <div className="hidden lg:flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-600">Gemini Flash AI:</span>
              <span className="font-semibold text-emerald-600">Active (Unicode/Zawgyi)</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
