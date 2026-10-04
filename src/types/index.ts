export type PlatformType = 'facebook' | 'tiktok';

export type AIStatus = 'auto' | 'paused' | 'human_takeover';

export type SenderType = 'customer' | 'ai' | 'human_agent';

export type PaymentMethod = 'kpay' | 'wavepay' | 'cod' | 'cbpay' | 'ayapay';

export type OrderStatus = 'pending_slip' | 'pending_approval' | 'confirmed' | 'shipped' | 'cancelled';

export interface Shop {
  id: string;
  name: string;
  ownerEmail: string;
  telegramChatId?: string;
  telegramBotToken?: string;
  googleSheetId?: string;
  kpayNumber?: string;
  kpayName?: string;
  waveNumber?: string;
  waveName?: string;
}

export interface ChannelConnection {
  id: string;
  shopId: string;
  platform: PlatformType;
  accountName: string;
  pageId: string;
  isActive: boolean;
  avatarUrl?: string;
}

export interface Product {
  id: string;
  shopId: string;
  sku: string;
  nameMm: string;
  nameEn: string;
  category: string;
  priceMmk: number;
  stockQuantity: number;
  imageUrl: string;
  isAvailable: boolean;
  variants?: string[]; // e.g. ['Red - M', 'Black - L']
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  rawContent: string;
  normalizedContent: string;
  mediaUrl?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  priceMmk: number;
}

export interface Order {
  id: string;
  shopId: string;
  conversationId: string;
  customerName: string;
  customerPhone: string;
  township: string;
  fullAddress: string;
  items: OrderItem[];
  subtotalMmk: number;
  deliveryFeeMmk: number;
  totalMmk: number;
  paymentMethod: PaymentMethod;
  paymentSlipUrl?: string;
  status: OrderStatus;
  createdAt: string;
}

export interface Conversation {
  id: string;
  shopId: string;
  platform: PlatformType;
  customerPlatformId: string;
  customerName: string;
  customerAvatar?: string;
  aiStatus: AIStatus;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  customerPhone?: string;
  customerTownship?: string;
}
