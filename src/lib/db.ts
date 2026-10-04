import { Product, Conversation, Message, Order, ChannelConnection, Shop, OrderStatus } from '@/types';
import { INITIAL_SHOP, INITIAL_PRODUCTS, INITIAL_CONVERSATIONS, INITIAL_MESSAGES, INITIAL_ORDERS, INITIAL_CHANNELS } from './store';

// Additional sample tenant shops for multi-tenant simulation
export const MOCK_SHOPS: Shop[] = [
  INITIAL_SHOP,
  {
    id: 'shop-mdy-02',
    name: 'Mandalay Trendy Closet (မန္တလေး)',
    ownerEmail: 'mandalay.closet@gmail.com',
    telegramChatId: '@mdy_closet_bot',
    telegramBotToken: '',
    googleSheetId: '',
    kpayNumber: '09451122334',
    kpayName: 'Ko Ye Yint Aung',
    waveNumber: '09451122334',
    waveName: 'Ko Ye Yint Aung',
  },
  {
    id: 'shop-npt-03',
    name: 'Naypyitaw Digital Store (နေပြည်တော်)',
    ownerEmail: 'naypyitaw.tech@gmail.com',
    telegramChatId: '',
    telegramBotToken: '',
    googleSheetId: '',
    kpayNumber: '09250099887',
    kpayName: 'Daw May Thu',
    waveNumber: '09250099887',
    waveName: 'Daw May Thu',
  },
];

export const MOCK_PRODUCTS_MDY: Product[] = [
  {
    id: 'prod-mdy-01',
    shopId: 'shop-mdy-02',
    sku: 'MDY-SILK-01',
    nameMm: 'မန္တလေး ချည်ပိုးထည် ပုဆိုး/လုံချည်',
    nameEn: 'Traditional Mandalay Silk Longyi',
    category: 'Traditional Fashion',
    priceMmk: 45000,
    stockQuantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&h=400&fit=crop',
    isAvailable: true,
  },
  {
    id: 'prod-mdy-02',
    shopId: 'shop-mdy-02',
    sku: 'MDY-SHIRT-02',
    nameMm: 'အဖြူရောင် ချည်သား ကော်လံရှပ်',
    nameEn: 'White Cotton Casual Shirt',
    category: 'Men Fashion',
    priceMmk: 32000,
    stockQuantity: 12,
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=400&fit=crop',
    isAvailable: true,
  },
];

// In-Memory state store keyed by shopId
class MultiTenantDB {
  private shops: Map<string, Shop> = new Map();
  private products: Map<string, Product[]> = new Map();
  private conversations: Map<string, Conversation[]> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private orders: Map<string, Order[]> = new Map();
  private channels: Map<string, ChannelConnection[]> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    // Seed Shop 1 (Yangon)
    this.shops.set(INITIAL_SHOP.id, INITIAL_SHOP);
    this.products.set(INITIAL_SHOP.id, [...INITIAL_PRODUCTS]);
    this.conversations.set(INITIAL_SHOP.id, [...INITIAL_CONVERSATIONS]);
    this.orders.set(INITIAL_SHOP.id, [...INITIAL_ORDERS]);
    this.channels.set(INITIAL_SHOP.id, [...INITIAL_CHANNELS]);

    Object.entries(INITIAL_MESSAGES).forEach(([convId, msgs]) => {
      this.messages.set(convId, [...msgs]);
    });

    // Seed Shop 2 (Mandalay)
    const mdyShop = MOCK_SHOPS[1];
    this.shops.set(mdyShop.id, mdyShop);
    this.products.set(mdyShop.id, [...MOCK_PRODUCTS_MDY]);
    this.conversations.set(mdyShop.id, [
      {
        id: 'conv-mdy-01',
        shopId: mdyShop.id,
        platform: 'facebook',
        customerPlatformId: 'fb_usr_mdy_01',
        customerName: 'Ko Zaw Min Tun',
        customerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        aiStatus: 'auto',
        lastMessage: 'မန္တလေးချည်ထည် ပုဆိုးအရောင်စုံရှိလားဗျာ? ချမ်းအေးသာစံကို ပို့ပေးပါ',
        lastMessageAt: '10:30 AM',
        unreadCount: 1,
        customerTownship: 'Chanayethazan',
      },
    ]);
    this.messages.set('conv-mdy-01', [
      {
        id: 'msg-mdy-101',
        conversationId: 'conv-mdy-01',
        senderType: 'customer',
        rawContent: 'မန္တလေးချည်ထည် ပုဆိုးအရောင်စုံရှိလားဗျာ? ချမ်းအေးသာစံကို ပို့ပေးပါ',
        normalizedContent: 'မန္တလေးချည်ထည် ပုဆိုးအရောင်စုံရှိလားဗျာ? ချမ်းအေးသာစံကို ပို့ပေးပါ',
        createdAt: '10:30 AM',
      },
    ]);
    this.orders.set(mdyShop.id, []);
    this.channels.set(mdyShop.id, [
      {
        id: 'ch-fb-mdy-01',
        shopId: mdyShop.id,
        platform: 'facebook',
        accountName: 'Mandalay Closet FB Page',
        pageId: '209384756102938',
        isActive: true,
      },
    ]);

    // Seed Shop 3 (Naypyitaw)
    const nptShop = MOCK_SHOPS[2];
    this.shops.set(nptShop.id, nptShop);
    this.products.set(nptShop.id, []);
    this.conversations.set(nptShop.id, []);
    this.orders.set(nptShop.id, []);
    this.channels.set(nptShop.id, []);
  }

  // --- Shop Methods ---
  async getShops(): Promise<Shop[]> {
    return Array.from(this.shops.values());
  }

  async getShopById(id: string): Promise<Shop | null> {
    return this.shops.get(id) || null;
  }

  async createShop(data: Partial<Shop>): Promise<Shop> {
    const id = `shop-${Date.now()}`;
    const newShop: Shop = {
      id,
      name: data.name || 'New Myanmar Shop',
      ownerEmail: data.ownerEmail || 'seller@example.com',
      telegramChatId: data.telegramChatId || '',
      telegramBotToken: data.telegramBotToken || '',
      googleSheetId: data.googleSheetId || '',
      kpayNumber: data.kpayNumber || '',
      kpayName: data.kpayName || '',
      waveNumber: data.waveNumber || '',
      waveName: data.waveName || '',
    };
    this.shops.set(id, newShop);
    this.products.set(id, []);
    this.conversations.set(id, []);
    this.orders.set(id, []);
    this.channels.set(id, []);
    return newShop;
  }

  async updateShop(id: string, updates: Partial<Shop>): Promise<Shop | null> {
    const current = this.shops.get(id);
    if (!current) return null;
    const updated = { ...current, ...updates };
    this.shops.set(id, updated);
    return updated;
  }

  // --- Tenant-Scoped Products ---
  async getProducts(shopId: string): Promise<Product[]> {
    return this.products.get(shopId) || [];
  }

  async addProduct(product: Product): Promise<Product> {
    const current = this.products.get(product.shopId) || [];
    this.products.set(product.shopId, [product, ...current]);
    return product;
  }

  async updateProductStock(shopId: string, productId: string, delta: number): Promise<void> {
    const prods = this.products.get(shopId) || [];
    this.products.set(
      shopId,
      prods.map((p) => {
        if (p.id === productId) {
          const newQty = Math.max(0, p.stockQuantity + delta);
          return { ...p, stockQuantity: newQty, isAvailable: newQty > 0 };
        }
        return p;
      })
    );
  }

  // --- Tenant-Scoped Conversations ---
  async getConversations(shopId: string): Promise<Conversation[]> {
    return this.conversations.get(shopId) || [];
  }

  async addConversation(conv: Conversation): Promise<void> {
    const current = this.conversations.get(conv.shopId) || [];
    this.conversations.set(conv.shopId, [conv, ...current]);
  }

  async updateConversation(shopId: string, convId: string, updates: Partial<Conversation>): Promise<void> {
    const current = this.conversations.get(shopId) || [];
    this.conversations.set(
      shopId,
      current.map((c) => (c.id === convId ? { ...c, ...updates } : c))
    );
  }

  // --- Messages ---
  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messages.get(conversationId) || [];
  }

  async addMessage(msg: Message): Promise<void> {
    const current = this.messages.get(msg.conversationId) || [];
    this.messages.set(msg.conversationId, [...current, msg]);
  }

  // --- Tenant-Scoped Orders ---
  async getOrders(shopId: string): Promise<Order[]> {
    return this.orders.get(shopId) || [];
  }

  async addOrder(order: Order): Promise<Order> {
    const current = this.orders.get(order.shopId) || [];
    this.orders.set(order.shopId, [order, ...current]);
    return order;
  }

  async updateOrderStatus(shopId: string, orderId: string, status: OrderStatus): Promise<void> {
    const current = this.orders.get(shopId) || [];
    this.orders.set(
      shopId,
      current.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  }

  // --- Channels ---
  async getChannels(shopId: string): Promise<ChannelConnection[]> {
    return this.channels.get(shopId) || [];
  }

  // Find shop by Meta Facebook Page ID
  async findShopByPageId(pageId: string): Promise<{ shop: Shop; channel: ChannelConnection } | null> {
    for (const [shopId, channelsList] of this.channels.entries()) {
      const match = channelsList.find((ch) => ch.pageId === pageId && ch.platform === 'facebook');
      if (match) {
        const shop = this.shops.get(shopId);
        if (shop) return { shop, channel: match };
      }
    }
    // Default fallback to initial shop if page ID not specifically configured
    return { shop: INITIAL_SHOP, channel: INITIAL_CHANNELS[0] };
  }
}

// Global singleton instance
export const db = new MultiTenantDB();
