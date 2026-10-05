import { Product, Order, ChannelConnection, Shop, OrderStatus, PlatformType } from '@/types';
import { INITIAL_SHOP, INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_CHANNELS } from './store';

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

export const MOCK_CHANNELS_MDY: ChannelConnection[] = [
  {
    id: 'ch-fb-mdy-01',
    shopId: 'shop-mdy-02',
    platform: 'facebook',
    accountName: 'Mandalay Closet FB Page',
    pageId: '209384756102938',
    accessToken: 'EAAX_MOCK_TOKEN_MDY',
    webhookSecret: 'whsec_mock_mdy_01',
    isActive: true,
  },
];

export interface StoredDatabase {
  shops: Shop[];
  products: Product[];
  channels: ChannelConnection[];
  orders: Order[];
}

function getNodeFs() {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = eval('require')('fs');
    const path = eval('require')('path');
    return { fs, path };
  } catch {
    return null;
  }
}

/**
 * MultiTenantDB: Persistent Multi-Tenant Database Store
 * ZERO CHAT STORAGE GUARANTEE: Exactly 4 entity types (shops, products, channels, orders).
 * Zero conversations or messages are ever stored in the database.
 */
export class MultiTenantDB {
  private shops: Map<string, Shop> = new Map();
  private products: Map<string, Product[]> = new Map();
  private channels: Map<string, ChannelConnection[]> = new Map();
  private orders: Map<string, Order[]> = new Map();
  private filePath: string;

  constructor(customPath?: string) {
    const nodeFs = getNodeFs();
    if (nodeFs) {
      this.filePath =
        customPath ||
        process.env.DB_FILE_PATH ||
        nodeFs.path.join(process.cwd(), 'data', 'db.json');
    } else {
      this.filePath = 'db.json';
    }
    this.loadData();
  }

  private initSeed(): void {
    this.shops.clear();
    this.products.clear();
    this.channels.clear();
    this.orders.clear();

    // 1. Seed Shop 1 (Yangon)
    this.shops.set(INITIAL_SHOP.id, { ...INITIAL_SHOP });
    this.products.set(INITIAL_SHOP.id, [...INITIAL_PRODUCTS]);
    this.channels.set(INITIAL_SHOP.id, [...INITIAL_CHANNELS]);
    this.orders.set(INITIAL_SHOP.id, [...INITIAL_ORDERS]);

    // 2. Seed Shop 2 (Mandalay)
    const mdyShop = MOCK_SHOPS[1];
    this.shops.set(mdyShop.id, { ...mdyShop });
    this.products.set(mdyShop.id, [...MOCK_PRODUCTS_MDY]);
    this.channels.set(mdyShop.id, [...MOCK_CHANNELS_MDY]);
    this.orders.set(mdyShop.id, []);

    // 3. Seed Shop 3 (Naypyitaw)
    const nptShop = MOCK_SHOPS[2];
    this.shops.set(nptShop.id, { ...nptShop });
    this.products.set(nptShop.id, []);
    this.channels.set(nptShop.id, []);
    this.orders.set(nptShop.id, []);
  }

  public reload(): void {
    this.loadData();
  }

  private loadData(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('shweshop_db');
        if (stored) {
          this.applyParsedData(JSON.parse(stored));
          return;
        }
      } catch {}
      this.initSeed();
      this.persistData();
      return;
    }

    const nodeFs = getNodeFs();
    if (nodeFs) {
      if (nodeFs.fs.existsSync(this.filePath)) {
        try {
          const content = nodeFs.fs.readFileSync(this.filePath, 'utf-8');
          const parsed: StoredDatabase = JSON.parse(content);
          this.applyParsedData(parsed);
          return;
        } catch (e) {
          console.warn('[MultiTenantDB] Failed to parse db.json, re-seeding:', e);
        }
      }
      this.initSeed();
      this.persistData();
    }
  }

  private applyParsedData(data: StoredDatabase): void {
    this.shops.clear();
    this.products.clear();
    this.channels.clear();
    this.orders.clear();

    for (const shop of data.shops || []) {
      this.shops.set(shop.id, shop);
      this.products.set(shop.id, []);
      this.channels.set(shop.id, []);
      this.orders.set(shop.id, []);
    }

    for (const prod of data.products || []) {
      const list = this.products.get(prod.shopId) || [];
      list.push(prod);
      this.products.set(prod.shopId, list);
    }

    for (const ch of data.channels || []) {
      const list = this.channels.get(ch.shopId) || [];
      list.push(ch);
      this.channels.set(ch.shopId, list);
    }

    for (const ord of data.orders || []) {
      const list = this.orders.get(ord.shopId) || [];
      list.push(ord);
      this.orders.set(ord.shopId, list);
    }
  }

  public exportData(): StoredDatabase {
    const shops = Array.from(this.shops.values());
    const products: Product[] = [];
    for (const pList of this.products.values()) products.push(...pList);
    const channels: ChannelConnection[] = [];
    for (const cList of this.channels.values()) channels.push(...cList);
    const orders: Order[] = [];
    for (const oList of this.orders.values()) orders.push(...oList);

    return { shops, products, channels, orders };
  }

  private persistData(): void {
    const payload = this.exportData();

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('shweshop_db', JSON.stringify(payload));
      } catch {}
      return;
    }

    const nodeFs = getNodeFs();
    if (nodeFs) {
      try {
        const dir = nodeFs.path.dirname(this.filePath);
        if (!nodeFs.fs.existsSync(dir)) {
          nodeFs.fs.mkdirSync(dir, { recursive: true });
        }
        const jsonContent = JSON.stringify(payload, null, 2);
        const tempPath = `${this.filePath}.tmp.${Date.now()}`;
        try {
          nodeFs.fs.writeFileSync(tempPath, jsonContent, 'utf-8');
          nodeFs.fs.renameSync(tempPath, this.filePath);
        } catch {
          // Windows NTFS lock fallback: direct writeSync
          nodeFs.fs.writeFileSync(this.filePath, jsonContent, 'utf-8');
          try {
            nodeFs.fs.unlinkSync(tempPath);
          } catch {}
        }
      } catch (err) {
        console.error('[MultiTenantDB] Disk write failed:', err);
      }
    }
  }

  // ============================================================================
  // SHOP OPERATIONS (Canonical contracts & aliases)
  // ============================================================================

  async getShop(shopId: string): Promise<Shop | null> {
    return this.shops.get(shopId) || null;
  }

  async getShopById(id: string): Promise<Shop | null> {
    return this.getShop(id);
  }

  async listShops(): Promise<Shop[]> {
    return Array.from(this.shops.values());
  }

  async getShops(): Promise<Shop[]> {
    return this.listShops();
  }

  async saveShop(shop: Shop): Promise<Shop> {
    this.shops.set(shop.id, { ...shop });
    if (!this.products.has(shop.id)) this.products.set(shop.id, []);
    if (!this.channels.has(shop.id)) this.channels.set(shop.id, []);
    if (!this.orders.has(shop.id)) this.orders.set(shop.id, []);
    this.persistData();
    return shop;
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
    return this.saveShop(newShop);
  }

  async updateShop(id: string, updates: Partial<Shop>): Promise<Shop | null> {
    const current = this.shops.get(id);
    if (!current) return null;
    const updated = { ...current, ...updates };
    await this.saveShop(updated);
    return updated;
  }

  // ============================================================================
  // PRODUCT OPERATIONS (Canonical contracts & aliases)
  // ============================================================================

  async getProducts(shopId: string): Promise<Product[]> {
    return [...(this.products.get(shopId) || [])];
  }

  async saveProduct(
    shopId: string,
    product: Omit<Product, 'shopId'> & { shopId?: string }
  ): Promise<Product> {
    const item: Product = { ...product, shopId };
    const list = this.products.get(shopId) || [];
    const idx = list.findIndex((p) => p.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.products.set(shopId, list);
    this.persistData();
    return item;
  }

  async addProduct(product: Product): Promise<Product> {
    return this.saveProduct(product.shopId, product);
  }

  async updateProductStock(shopId: string, productId: string, delta: number): Promise<Product | null> {
    const list = this.products.get(shopId) || [];
    let updatedProduct: Product | null = null;
    this.products.set(
      shopId,
      list.map((p) => {
        if (p.id === productId) {
          const newQty = Math.max(0, p.stockQuantity + delta);
          updatedProduct = { ...p, stockQuantity: newQty, isAvailable: newQty > 0 };
          return updatedProduct;
        }
        return p;
      })
    );
    if (updatedProduct) {
      this.persistData();
    }
    return updatedProduct;
  }

  // ============================================================================
  // ORDER OPERATIONS (Canonical contracts & aliases)
  // ============================================================================

  async getOrders(shopId: string): Promise<Order[]> {
    return [...(this.orders.get(shopId) || [])];
  }

  async createOrder(
    shopId: string,
    orderData: Omit<Order, 'id' | 'createdAt' | 'shopId'> & { shopId?: string }
  ): Promise<Order> {
    const id = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = new Date().toISOString();
    const order: Order = { ...orderData, id, shopId, createdAt };
    const list = this.orders.get(shopId) || [];
    list.unshift(order);
    this.orders.set(shopId, list);
    this.persistData();
    return order;
  }

  async addOrder(order: Order): Promise<Order> {
    const list = this.orders.get(order.shopId) || [];
    const idx = list.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      list[idx] = order;
    } else {
      list.unshift(order);
    }
    this.orders.set(order.shopId, list);
    this.persistData();
    return order;
  }

  async updateOrderStatus(shopId: string, orderId: string, status: OrderStatus): Promise<Order | null> {
    const list = this.orders.get(shopId) || [];
    let updated: Order | null = null;
    this.orders.set(
      shopId,
      list.map((o) => {
        if (o.id === orderId) {
          updated = { ...o, status };
          return updated;
        }
        return o;
      })
    );
    if (updated) {
      this.persistData();
    }
    return updated;
  }

  // ============================================================================
  // CHANNEL CONNECTION OPERATIONS (Canonical contracts & aliases)
  // ============================================================================

  async getChannels(shopId: string): Promise<ChannelConnection[]> {
    return [...(this.channels.get(shopId) || [])];
  }

  async saveChannelConnection(
    shopId: string,
    channel: Omit<ChannelConnection, 'shopId'> & { shopId?: string }
  ): Promise<ChannelConnection> {
    const item: ChannelConnection = { ...channel, shopId };
    const list = this.channels.get(shopId) || [];
    const idx = list.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.channels.set(shopId, list);
    this.persistData();
    return item;
  }

  async findShopByChannel(
    platform: PlatformType,
    channelIdentifier: string
  ): Promise<{ shop: Shop; channel: ChannelConnection } | null> {
    for (const [shopId, channelsList] of this.channels.entries()) {
      const match = channelsList.find(
        (ch) => ch.platform === platform && (ch.pageId === channelIdentifier || ch.id === channelIdentifier)
      );
      if (match) {
        const shop = this.shops.get(shopId);
        if (shop) return { shop, channel: match };
      }
    }
    return null;
  }

  async findShopByPageId(pageId: string): Promise<{ shop: Shop; channel: ChannelConnection } | null> {
    const found = await this.findShopByChannel('facebook', pageId);
    if (found) return found;
    // Default fallback to initial shop if page ID not specifically configured
    return { shop: INITIAL_SHOP, channel: INITIAL_CHANNELS[0] };
  }

  // ============================================================================
  // TEST & RESET UTILITIES
  // ============================================================================

  async resetToSeed(): Promise<void> {
    this.initSeed();
    this.persistData();
  }

  async clear(): Promise<void> {
    this.shops.clear();
    this.products.clear();
    this.channels.clear();
    this.orders.clear();
    this.persistData();
  }
}

// Global singleton instance
export const db = new MultiTenantDB();
