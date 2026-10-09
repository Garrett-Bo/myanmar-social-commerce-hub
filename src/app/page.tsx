'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { getEphemeralConversations, getEphemeralMessages } from '@/lib/store';
import { Conversation, Message, Product } from '@/types';
import { processCustomerMessage } from '@/lib/gemini-agent';
import { normalizeBurmese, toBurmeseNumerals } from '@/lib/burmese-converter';
import {
  Bot,
  User,
  Send,
  Sparkles,
  ShoppingBag,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  MessageSquare,
  Play,
  Share2,
  Receipt,
  Tag,
} from 'lucide-react';
import { FacebookIcon, TikTokIcon } from '@/components/icons';

const BURMESE_QUICK_REPLIES = [
  { label: '🛍️ ဆီရမ် ဈေးဘယ်လောက်လဲ', query: 'Serum ဈေးဘယ်လောက်လဲရှင့်? instock ရှိလား?' },
  { label: '🚚 စမ်းချောင်း ပို့ခ ဘယ်လောက်လဲ', query: 'စမ်းချောင်းမြို့နယ် ပို့ခ ဘယ်လောက်ကျမလဲ?' },
  { label: '💳 KPay နဲ့ ရှင်းမယ်', query: 'Lip tint ၁ ဘူး KPay နဲ့ ဝယ်ပါမယ်' },
  { label: '📦 COD ရလား', query: 'ပစ္စည်းရောက်မှ ငွေချေ (COD) ရလားခင်ဗျာ?' },
  { label: '🚌 မန္တလေး ကားဂိတ်ပို့', query: 'မန္တလေး ကားဂိတ်ကနေ ပို့ပေးလို့ရမလား?' },
];

const SIMULATOR_PERSONAS = [
  {
    name: 'Ma Thiri San',
    nameMm: 'မသီရိစံ',
    township: 'Sanchaung',
    channel: 'facebook' as const,
    presetQuery: 'Serum နဲ့ lip tint စမ်းချောင်းကို ပို့ခဘယ်လောက်ကျမလဲ? KPay နဲ့ ဝယ်ချင်လို့ပါ',
    badge: 'Yangon COD',
  },
  {
    name: 'Ko Min Min',
    nameMm: 'ကိုမင်းမင်း',
    township: 'Chanayethazan',
    channel: 'tiktok' as const,
    presetQuery: 'ေလာင္ဂ်ီ ၂ ထည္ မႏၲေလး ခ်မ္းေအးသာစံကို ပို႔ေပးပါ KPay နဲ႔ခ်င္ပါတယ္',
    badge: 'Mandalay Zawgyi',
  },
  {
    name: 'Ma Nan Hsai',
    nameMm: 'မနန်းဆိုင်',
    township: 'Taunggyi',
    channel: 'tiktok' as const,
    presetQuery: 'Vintage bag တောင်ကြီးကို ကားဂိတ်ကနေ ပို့ပေးလို့ရမလား? KPay နဲ့ ရှင်းပါမယ်',
    badge: 'Highway Bus Gate',
  },
];

function BurmeseVoucherPreview({ content }: { content: string }) {
  const hasVoucher = content.includes('ဘောက်ချာ') || (content.includes('အော်ဒါ') && content.includes('MMK'));
  if (!hasVoucher) return null;

  return (
    <div className="mt-3 p-3.5 rounded-xl receipt-paper voucher-sawtooth text-xs text-slate-800 shadow-sm border border-amber-300/80">
      <div className="flex items-center justify-between border-b border-dashed border-amber-300/80 pb-2 mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="text-amber-600 font-bold text-sm">⚜️</span>
          <span className="font-bold text-amber-950 burmese-heading tracking-tight">
            တရားဝင် အော်ဒါဘောက်ချာ (Order Voucher)
          </span>
        </div>
        <span className="badge-jade px-2 py-0.5 rounded-full text-[10px] font-bold">
          Verified
        </span>
      </div>
      <div className="text-[11px] text-slate-700 burmese-text whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
      <div className="mt-2.5 pt-2 border-t border-dashed border-amber-300/80 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span>Myanmar Social Commerce</span>
        <span className="font-bold text-amber-800">ShweShop Hub Certified</span>
      </div>
    </div>
  );
}

export default function UnifiedInboxPage() {

  const { currentShop } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [inputText, setInputText] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<'all' | 'facebook' | 'tiktok'>('all');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Load tenant-scoped data when currentShop changes
  useEffect(() => {
    async function loadTenantData() {
      const prods = await db.getProducts(currentShop.id);
      setProducts(prods);

      // Ephemeral UI simulator state (Zero Chat Storage: chats are NOT stored in DB)
      const convs = getEphemeralConversations(currentShop.id);
      setConversations(convs);

      if (convs.length > 0) {
        setSelectedConvId(convs[0].id);
        const msgs = getEphemeralMessages(convs[0].id);
        setMessages({ [convs[0].id]: msgs });
      } else {
        setSelectedConvId('');
        setMessages({});
      }
    }
    loadTenantData();
  }, [currentShop.id]);

  // Load messages when conversation selection changes
  useEffect(() => {
    if (!selectedConvId) return;
    setMessages((prev) => {
      if (prev[selectedConvId]) return prev;
      const msgs = getEphemeralMessages(selectedConvId);
      return { ...prev, [selectedConvId]: msgs };
    });
  }, [selectedConvId]);

  // Simulator State
  const [simChannel, setSimChannel] = useState<'facebook' | 'tiktok'>('facebook');
  const [simCustomerName, setSimCustomerName] = useState('Ma Thiri San');
  const [simMessage, setSimMessage] = useState('Serum နဲ့ lip tint စမ်းချောင်းကို ပို့ခဘယ်လောက်ကျမလဲ? KPay နဲ့ ဝယ်ချင်လို့ပါ');

  const activeConversation = conversations.find((c) => c.id === selectedConvId) || conversations[0];
  const activeMessages = messages[activeConversation?.id] || [];

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterPlatform === 'all') return true;
    return c.platform === filterPlatform;
  });

  // Toggle AI Automation vs Human Takeover
  const toggleAiStatus = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const newStatus = c.aiStatus === 'auto' ? 'human_takeover' : 'auto';
          return { ...c, aiStatus: newStatus };
        }
        return c;
      })
    );
  };

  // Human Staff Sends a Manual Message
  const handleSendManualMessage = () => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: activeConversation.id,
      senderType: 'human_agent',
      rawContent: inputText,
      normalizedContent: normalizeBurmese(inputText),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), newMsg],
    }));

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, lastMessage: inputText, lastMessageAt: 'Just now' } : c))
    );

    setInputText('');
  };

  // Simulate Inbound Customer Message (from Facebook Messenger or TikTok)
  const handleSimulateInbound = async () => {
    if (!simMessage.trim()) return;

    const convId = `conv-sim-${Date.now()}`;
    const newConv: Conversation = {
      id: convId,
      shopId: currentShop.id,
      platform: simChannel,
      customerPlatformId: `${simChannel}_usr_${Math.floor(Math.random() * 8999 + 1000)}`,
      customerName: simCustomerName,
      customerAvatar:
        simChannel === 'facebook'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'
          : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
      aiStatus: 'auto',
      lastMessage: simMessage,
      lastMessageAt: 'Just now',
      unreadCount: 1,
    };

    const customerMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: convId,
      senderType: 'customer',
      rawContent: simMessage,
      normalizedContent: normalizeBurmese(simMessage),
      createdAt: 'Just now',
    };

    // Add to conversations and select
    setConversations((prev) => [newConv, ...prev]);
    setMessages((prev) => ({
      ...prev,
      [convId]: [customerMsg],
    }));
    setSelectedConvId(convId);
    setIsAiProcessing(true);

    // Run Burmese AI Agent
    setTimeout(async () => {
      const response = await processCustomerMessage(simMessage, {
        shop: currentShop,
        products,
        customerName: simCustomerName,
        conversationHistory: [{ role: 'user', content: simMessage }],
      });

      const aiMsg: Message = {
        id: `msg-ai-${Date.now()}`,
        conversationId: convId,
        senderType: 'ai',
        rawContent: response.replyTextMm,
        normalizedContent: response.replyTextMm,
        createdAt: 'Just now',
      };

      setMessages((prev) => ({
        ...prev,
        [convId]: [...(prev[convId] || []), aiMsg],
      }));

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                customerTownship: response.detectedTownship || c.customerTownship,
                lastMessage: response.replyTextMm.slice(0, 60) + '...',
              }
            : c
        )
      );

      setIsAiProcessing(false);
    }, 900);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      {/* 1. LEFT SIDEBAR: Conversations List & Filters */}
      <div className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Filter Tabs */}
        <div className="p-3 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-800 flex items-center">
              <MessageSquare className="w-4 h-4 mr-1.5 text-indigo-600" />
              Inbox ({conversations.length})
            </h2>
            <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium rounded-full">
              Myanmar Live
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setFilterPlatform('all')}
              className={`py-1 rounded-md transition-all ${
                filterPlatform === 'all' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              All Channels
            </button>
            <button
              onClick={() => setFilterPlatform('facebook')}
              className={`py-1 rounded-md flex items-center justify-center space-x-1 transition-all ${
                filterPlatform === 'facebook'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'hover:text-blue-600'
              }`}
            >
              <FacebookIcon className="w-3 h-3" />
              <span>Facebook</span>
            </button>
            <button
              onClick={() => setFilterPlatform('tiktok')}
              className={`py-1 rounded-md flex items-center justify-center space-x-1 transition-all ${
                filterPlatform === 'tiktok'
                  ? 'bg-black text-white shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <TikTokIcon className="w-3 h-3" />
              <span>TikTok</span>
            </button>
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedConvId;
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`p-3.5 cursor-pointer transition-colors relative flex space-x-3 items-start ${
                  isSelected ? 'bg-amber-50/50 border-l-4 border-amber-600' : 'hover:bg-slate-50'
                }`}
              >
                {/* Avatar with Platform Badge */}
                <div className="relative shrink-0">
                  <img
                    src={conv.customerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'}
                    alt={conv.customerName}
                    className={`w-11 h-11 rounded-full object-cover border border-slate-200 ${
                      conv.platform === 'facebook' ? 'ring-2 ring-blue-500/30' : 'ring-2 ring-pink-500/30'
                    }`}
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 p-0.5 rounded-full text-white ${
                      conv.platform === 'facebook' ? 'bg-blue-600' : 'bg-black'
                    }`}
                  >
                    {conv.platform === 'facebook' ? (
                      <FacebookIcon className="w-3 h-3" />
                    ) : (
                      <TikTokIcon className="w-3 h-3" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-sm text-slate-900 truncate burmese-heading">
                      {conv.customerName}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0 flex items-center">
                      <Clock className="w-3 h-3 mr-0.5" />
                      {conv.lastMessageAt}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 truncate leading-relaxed burmese-text">
                    {conv.lastMessage}
                  </p>

                  <div className="flex items-center space-x-2 mt-2">
                    {conv.aiStatus === 'auto' ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold badge-jade">
                        <Bot className="w-2.5 h-2.5 mr-1 text-emerald-600" />
                        AI Auto-Replying
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold badge-shwe">
                        <User className="w-2.5 h-2.5 mr-1 text-amber-600" />
                        Human Takeover
                      </span>
                    )}

                    {conv.customerTownship && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] badge-thanaka font-medium">
                        <MapPin className="w-2.5 h-2.5 mr-0.5 text-amber-700" />
                        {conv.customerTownship}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CENTER: Live Conversation Chat Window */}
      <div className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <img
                  src={activeConversation?.customerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'}
                  alt={activeConversation?.customerName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      {activeConversation?.customerName}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white flex items-center space-x-1 ${
                        activeConversation?.platform === 'facebook' ? 'bg-blue-600' : 'bg-black'
                      }`}
                    >
                      {activeConversation?.platform === 'facebook' ? 'Facebook' : 'TikTok Shop'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center space-x-2">
                    <span>ID: {activeConversation?.customerPlatformId}</span>
                    {activeConversation?.customerTownship && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-600 font-medium">
                          Township: {activeConversation.customerTownship}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* AI vs Human Toggle Switch */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => toggleAiStatus(activeConversation.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    activeConversation?.aiStatus === 'auto'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {activeConversation?.aiStatus === 'auto' ? (
                    <>
                      <Bot className="w-4 h-4 text-emerald-600" />
                      <span>AI Handling (Click to Takeover)</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 text-amber-600" />
                      <span>Manual Mode (Click for AI Auto)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Message Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8fafc]">
              {activeMessages.map((msg) => {
                const isCustomer = msg.senderType === 'customer';
                const isAi = msg.senderType === 'ai';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 text-[11px] text-slate-400">
                      {isAi && <Sparkles className="w-3 h-3 text-amber-500" />}
                      <span className="font-medium">
                        {isCustomer
                          ? activeConversation?.customerName
                          : isAi
                          ? 'Gemini Flash Sales AI'
                          : 'Staff Agent'}
                      </span>
                      <span>•</span>
                      <span>{msg.createdAt}</span>
                    </div>

                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 text-sm burmese-text leading-relaxed whitespace-pre-line shadow-xs transition-all ${
                        isCustomer
                          ? 'bg-[#fdfcf9] border border-amber-200/60 text-slate-900 rounded-tl-xs shadow-slate-200/50'
                          : isAi
                          ? 'bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 text-white rounded-tr-xs shadow-indigo-200/40'
                          : 'bg-slate-900 text-white rounded-tr-xs'
                      }`}
                    >
                      {msg.rawContent}

                      {/* Authentic Myanmar Order Voucher Card */}
                      {isAi && <BurmeseVoucherPreview content={msg.rawContent} />}
                    </div>
                  </div>
                );
              })}

              {isAiProcessing && (
                <div className="flex items-center space-x-2 text-xs text-amber-800 bg-amber-50/90 p-3 rounded-xl border border-amber-200 animate-pulse">
                  <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                  <span className="burmese-text">AI မှ ပစ္စည်းလက်ကျန် စစ်ဆေးနေပြီး မြို့နယ်အလိုက် ပို့ခ တွက်ချက်နေပါသည်...</span>
                </div>
              )}
            </div>

            {/* Burmese Quick Reply Action Chips */}
            <div className="px-3 py-2 bg-slate-50/90 border-t border-slate-200 flex items-center space-x-1.5 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-semibold shrink-0 text-[10px] uppercase tracking-wider flex items-center">
                <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                Quick Ask:
              </span>
              {BURMESE_QUICK_REPLIES.map((qr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(qr.query);
                    setSimMessage(qr.query);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 whitespace-nowrap transition-colors shadow-2xs burmese-text text-[11px]"
                >
                  {qr.label}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendManualMessage()}
                  placeholder={
                    activeConversation?.aiStatus === 'auto'
                      ? 'Type to reply manually (AI is currently actively answering)...'
                      : 'Type a message as staff agent...'
                  }
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/60 burmese-text"
                />
                <button
                  onClick={handleSendManualMessage}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 shadow-sm shadow-amber-200/50"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">No Active Conversations</h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              This shop has no customer threads yet. Use the Live Inbound Simulator on the right to test Burmese AI replies, or connect a Facebook Page!
            </p>
          </div>
        )}
      </div>

      {/* 3. RIGHT SIDEBAR: Inbound Channel Simulator & Live Stock Quick Lookup */}
      <div className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
        {/* Inbound Multi-Channel Message Simulator */}
        <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center space-x-1.5">
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Live Inbound Simulator</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full font-mono text-indigo-200">
              Test Agent
            </span>
          </div>
          <p className="text-xs text-indigo-200 mb-3">
            Simulate a customer sending a message via Facebook Messenger or TikTok in Burmese.
          </p>

          <div className="space-y-2.5 text-xs">
            {/* Persona Scenarios Quick Buttons */}
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>Select Customer Persona:</span>
                <span className="text-[10px] text-amber-300">1-Click Auto Fill</span>
              </label>
              <div className="grid grid-cols-1 gap-1">
                {SIMULATOR_PERSONAS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSimCustomerName(p.name);
                      setSimChannel(p.channel);
                      setSimMessage(p.presetQuery);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 flex items-center justify-between text-[11px] transition-all text-left"
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-slate-400 text-[10px] burmese-text">({p.nameMm})</span>
                    </div>
                    <span className="badge-shwe px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0">
                      {p.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Channel Pick */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSimChannel('facebook')}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 border transition-all ${
                  simChannel === 'facebook'
                    ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-xs'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <FacebookIcon className="w-3.5 h-3.5 mr-1" />
                <span>Facebook Msg</span>
              </button>
              <button
                type="button"
                onClick={() => setSimChannel('tiktok')}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 border transition-all ${
                  simChannel === 'tiktok'
                    ? 'bg-slate-900 border-pink-500 text-pink-400 font-semibold shadow-xs'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <TikTokIcon className="w-3.5 h-3.5 mr-1" />
                <span>TikTok Shop</span>
              </button>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Customer Name:</label>
              <input
                type="text"
                value={simCustomerName}
                onChange={(e) => setSimCustomerName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium"
              />
            </div>

            {/* Sample Message presets */}
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Burmese Query / Order:</label>
              <textarea
                rows={2}
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 burmese-text"
              />
            </div>

            <button
              type="button"
              onClick={handleSimulateInbound}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-950/40"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Send Simulated Customer Message</span>
            </button>
          </div>
        </div>

        {/* Live Catalog Stock Quick View */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center uppercase tracking-wider">
              <ShoppingBag className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Live Stock Status ({products.length})
            </h4>
            <span className="badge-jade text-[10px] px-2 py-0.5 rounded-full font-bold">
              Google Sheets Live
            </span>
          </div>

          <div className="space-y-2.5">
            {products.map((prod) => (
              <div
                key={prod.id}
                onClick={() => {
                  setSimMessage(`${prod.nameMm} ဈေးဘယ်လောက်လဲရှင့်? instock ရှိလား?`);
                }}
                className="flex items-center space-x-3 p-2.5 rounded-xl border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/30 transition-all text-xs cursor-pointer group shadow-2xs"
                title="Click to test inquiry for this item"
              >
                <img
                  src={prod.imageUrl}
                  alt={prod.nameMm}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate burmese-heading">{prod.nameMm}</p>
                  <div className="flex items-baseline space-x-1.5 mt-0.5">
                    <span className="text-xs text-amber-800 font-extrabold">
                      {prod.priceMmk.toLocaleString()} MMK
                    </span>
                    <span className="text-[10px] text-slate-400 burmese-text">
                      ({toBurmeseNumerals(prod.priceMmk.toLocaleString())} ကျပ်)
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-1">
                    {prod.stockQuantity > 0 ? (
                      <span className="badge-jade text-[9px] px-1.5 py-0.2 rounded font-bold flex items-center">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                        {prod.stockQuantity} in stock
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold flex items-center">
                        <AlertCircle className="w-2.5 h-2.5 mr-0.5 text-rose-500" />
                        Out of stock
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
