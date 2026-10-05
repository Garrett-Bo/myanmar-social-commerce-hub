# Technical Handoff Report: Milestone 1 Types & Downstream Consumer Alignment

- **Agent**: `explorer_m1_3` (teamwork_preview_explorer)
- **Target Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m1_3`
- **Date**: 2026-10-04
- **Milestone**: Milestone 1 (Multi-Tenant Database Persistence & Zero-Chat Storage)

---

## 1. Observation

### 1.1 Current Type Definitions (`src/types/index.ts`)
- **`ChannelConnection`** (`src/types/index.ts:24-32`):
  ```typescript
  export interface ChannelConnection {
    id: string;
    shopId: string;
    platform: PlatformType;
    accountName: string;
    pageId: string;
    isActive: boolean;
    avatarUrl?: string;
  }
  ```
  - Directly lacks `accessToken: string` and optional `webhookSecret?: string`.
  - In `src/app/api/webhooks/facebook/route.ts:66`, the outbound dispatcher was forced to fall back to `process.env.FB_PAGE_ACCESS_TOKEN || channel?.pageId` due to missing token on the channel connection model.

- **`Order`** (`src/types/index.ts:65-81`):
  ```typescript
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
  ```
  - Contains `conversationId: string` (line 68). In a Zero-Chat Storage architecture, no conversations table exists in the database.
  - Lacks `platform: PlatformType` and `customerPlatformId: string` (such as Facebook PSID or TikTok User ID).
  - Numeric fields: `subtotalMmk`, `deliveryFeeMmk`, and `totalMmk` are typed as `number`.

- **`Conversation` & `Message`** (`src/types/index.ts:48-56, 83-96`):
  - Currently declared alongside database entities without JSDoc or architectural comments indicating they are ephemeral-only types.
  - Used in `src/app/page.tsx` for client-side chat rendering and simulation.

- **`TownshipDeliveryInfo`**:
  - Missing from `src/types/index.ts`. Currently declared locally in `src/lib/myanmar-townships.ts:6-13`.

### 1.2 Downstream Consumers of `db.ts` Chat Methods
- **`src/app/page.tsx`** (Unified Inbox):
  - Line 40: `db.getConversations(currentShop.id)`
  - Line 48: `db.getMessages(convs[0].id)`
  - Line 63: `db.getMessages(selectedConvId)`
  - These are the **only three lines in the entire application** that call `getConversations` or `getMessages` on `db`.
  - When sending manual messages (lines 110-117) or simulating inbound customer messages (lines 153-157, 179-194), `src/app/page.tsx` operates purely in React local state (`useState`) without calling `db.addMessage` or `db.addConversation`.

### 1.3 Static Seed Objects (`src/lib/store.ts`)
- **`INITIAL_CHANNELS`** (`src/lib/store.ts:16-35`):
  - Declares two `ChannelConnection` literals (`ch-fb-01` and `ch-tt-01`) without `accessToken`.
- **`INITIAL_ORDERS`** (`src/lib/store.ts:204-243`):
  - `ord-9021` specifies `conversationId: 'conv-02'`.
  - `ord-9018` specifies `conversationId: 'conv-01'`.
  - Neither specifies `platform` or `customerPlatformId`.
- **`INITIAL_CONVERSATIONS` & `INITIAL_MESSAGES`** (`src/lib/store.ts:105-202`):
  - Contain mock conversations and messages for `shop-yangon-01`.

### 1.4 In-Memory Database Methods (`src/lib/db.ts`)
- `MultiTenantDB` retains internal maps for `conversations` (line 64) and `messages` (line 65).
- In `init()` (lines 89-113), it seeds `conv-mdy-01` and `msg-mdy-101` for `shop-mdy-02`.
- `this.channels.set(mdyShop.id, ...)` (lines 115-124) instantiates a `ChannelConnection` without `accessToken`.
- Implements:
  - `getConversations(shopId: string): Promise<Conversation[]>` (line 200)
  - `addConversation(conv: Conversation): Promise<void>` (line 204)
  - `updateConversation(shopId, convId, updates): Promise<void>` (line 209)
  - `getMessages(conversationId: string): Promise<Message[]>` (line 218)
  - `addMessage(msg: Message): Promise<void>` (line 222)

### 1.5 Other Consumers
- **`src/app/orders/page.tsx`**:
  - Uses `db.getOrders(currentShop.id)` and `db.updateOrderStatus(...)`.
  - Displays customer information, township, items, and total.
  - **Does NOT reference `conversationId`.**
- **`src/app/catalog/page.tsx`**:
  - Uses `Product` only. Does not reference `Order`, `Conversation`, or `ChannelConnection`.
- **`src/app/settings/page.tsx`**:
  - Uses `db.getChannels(currentShop.id)`. Does not instantiate new channel objects directly.
- **`src/lib/telegram.ts`**:
  - Formats order alert notifications using customer and pricing fields. Does not reference `conversationId`.
- **Baseline Build Verification**:
  - Executed `cmd /c "npm run build"`: Exit code 0, 12/12 static/dynamic pages compiled cleanly with 0 TypeScript errors.

---

## 2. Logic Chain

1. **Step 1: Enforcing Zero-Chat Storage Invariant (`ORIGINAL_REQUEST.md`, `PROJECT.md`)**
   - The user directive states: *"chat wont store on ourside we will jsut pull the tik tok and facebook api messaging .. it's expensive to store"*.
   - Therefore, our database layer (`db.ts`) must NOT persist conversations or messages. All `conversations` and `messages` maps, methods, and seeds must be deleted from `db.ts`.

2. **Step 2: Decoupling `Order` from Non-Existent Conversations**
   - Because no `conversations` table or map exists in the persistent database, `Order.conversationId` has no foreign key or logical referent.
   - To link finalized orders to customer channels, `Order` must record `platform: PlatformType` and `customerPlatformId: string` (e.g. Facebook PSID or TikTok User ID).
   - In `src/lib/store.ts`, `INITIAL_ORDERS` must be updated to remove `conversationId` and provide `platform` and `customerPlatformId` to prevent TypeScript object literal excess/missing property errors.

3. **Step 3: Storing Channel Credentials on `ChannelConnection`**
   - Outbound Meta Graph API calls (`sendFacebookMessage`) and future on-demand conversation fetchers require the shop's Page Access Token.
   - `ChannelConnection` must include `accessToken: string` and optional `webhookSecret?: string`.
   - In `src/lib/store.ts`, `INITIAL_CHANNELS` must provide mock access tokens for `ch-fb-01` and `ch-tt-01`.
   - In `src/lib/db.ts`, the seed channel for `shop-mdy-02` must also provide `accessToken`.

4. **Step 4: Preventing Build Breakage in `src/app/page.tsx`**
   - If `db.ts` removes `getConversations` and `getMessages`, `src/app/page.tsx` will fail compilation on lines 40, 48, and 63.
   - To decouple `src/app/page.tsx` from `db.ts` without losing UI chat capability, `src/lib/store.ts` should export ephemeral mock getters (`getEphemeralConversations(shopId)` and `getEphemeralMessages(convId)`).
   - `src/app/page.tsx` should call these ephemeral helpers for initial state rather than `db`, leaving `db.getProducts(currentShop.id)` as the only database call.
   - This maintains 100% functionality of the UI inbox, filter tabs, manual staff messaging, and live inbound simulator while strictly upholding the Zero-Chat DB invariant.

5. **Step 5: Impact on `src/app/orders/page.tsx` and `src/app/catalog/page.tsx`**
   - Neither page accesses `conversationId` or chat methods.
   - `src/app/orders/page.tsx` compiles with zero errors and can immediately read `ord.platform` if UI display is desired.
   - `src/app/catalog/page.tsx` is completely unaffected.

---

## 3. Caveats

1. **Read-Only Scope**:
   - In accordance with the Explorer archetype constraints, no application source files were modified during this investigation.
2. **Ephemeral UI in Milestone 1 vs Live On-Demand API in Milestone 3**:
   - In Milestone 1, `src/app/page.tsx` will use ephemeral in-memory state from `store.ts`. In Milestone 3, live on-demand fetching via Meta Graph API (`fetchFacebookConversations`) and TikTok API (`fetchTikTokConversations`) will replace/augment this ephemeral seed without changing `db.ts`.
3. **Database Method Compatibility**:
   - `PROJECT.md` specifies interface contract method names like `db.saveProduct`, `db.createOrder`, `db.findShopByChannel`. The implementer for Milestone 1 must provide these methods while retaining existing method names (`addProduct`, `addOrder`, `findShopByPageId`) as backwards-compatible aliases so existing route handlers and pages continue to compile seamlessly.

---

## 4. Conclusion & Actionable Specifications

### 4.1 Proposed Modification for `src/types/index.ts`

```typescript
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
  accessToken: string;
  webhookSecret?: string;
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

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  priceMmk: number;
}

export interface Order {
  id: string;
  shopId: string;
  platform: PlatformType;
  customerPlatformId: string; // PSID or TikTok User ID
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

/**
 * EPHEMERAL CHANNEL TYPES (Zero-Chat Storage Architecture)
 * The types below represent live conversation threads and message payloads fetched
 * on-demand from Facebook Graph API / TikTok API or processed in-memory.
 * STRICT INVARIANT: These are NOT database entities and must NEVER be persisted in the DB.
 */

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  rawContent: string;
  normalizedContent: string;
  mediaUrl?: string;
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

/**
 * Logistics & Delivery Information Type
 */
export interface TownshipDeliveryInfo {
  nameMm: string;
  nameEn: string;
  region: 'Yangon' | 'Mandalay' | 'Naypyitaw' | 'State/Region';
  standardFeeMmk: number;
  codAvailable: boolean;
  estDays: string;
}
```

### 4.2 Proposed Updates for `src/lib/store.ts`

1. **Update `INITIAL_CHANNELS`**:
   ```typescript
   export const INITIAL_CHANNELS: ChannelConnection[] = [
     {
       id: 'ch-fb-01',
       shopId: 'shop-yangon-01',
       platform: 'facebook',
       accountName: 'Aung Thukha Fashion - FB Page',
       pageId: '109283746501928',
       accessToken: 'EAA_mock_fb_access_token_yangon_01',
       webhookSecret: 'whsec_mock_fb_01',
       isActive: true,
       avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&h=100&fit=crop&crop=faces',
     },
     {
       id: 'ch-tt-01',
       shopId: 'shop-yangon-01',
       platform: 'tiktok',
       accountName: '@aungthukha_trend',
       pageId: 'tt_shop_8291029',
       accessToken: 'tt_mock_access_token_yangon_01',
       webhookSecret: 'whsec_mock_tt_01',
       isActive: true,
       avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
     },
   ];
   ```

2. **Update `INITIAL_ORDERS`**:
   ```typescript
   export const INITIAL_ORDERS: Order[] = [
     {
       id: 'ord-9021',
       shopId: 'shop-yangon-01',
       platform: 'tiktok',
       customerPlatformId: 'tt_user_4481',
       customerName: 'Ko Kyaw Swar Lin',
       customerPhone: '09791234567',
       township: 'Tamwe',
       fullAddress: 'No. 45, Kyaikkasan Road, Tamwe Township, Yangon',
       items: [
         { productId: 'prod-02', name: 'Matte Velvet Lip Tint (#01 Cherry Red)', quantity: 1, priceMmk: 14500 },
         { productId: 'prod-03', name: 'Vintage Leather Crossbody Bag (Brown)', quantity: 1, priceMmk: 35000 },
       ],
       subtotalMmk: 49500,
       deliveryFeeMmk: 2500,
       totalMmk: 52000,
       paymentMethod: 'kpay',
       paymentSlipUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=600&fit=crop',
       status: 'pending_approval',
       createdAt: '2026-10-04 12:30 PM',
     },
     {
       id: 'ord-9018',
       shopId: 'shop-yangon-01',
       platform: 'facebook',
       customerPlatformId: 'fb_user_9921',
       customerName: 'Ma Sandar',
       customerPhone: '09450011223',
       township: 'Sanchaung',
       fullAddress: 'Shin Saw Pu Road, Sanchaung, Yangon',
       items: [
         { productId: 'prod-01', name: 'Niacinamide Whitening Serum', quantity: 2, priceMmk: 28000 },
       ],
       subtotalMmk: 56000,
       deliveryFeeMmk: 2500,
       totalMmk: 58500,
       paymentMethod: 'cod',
       status: 'confirmed',
       createdAt: '2026-10-04 10:15 AM',
     },
   ];
   ```

3. **Add Ephemeral Seed Helpers to `src/lib/store.ts`**:
   ```typescript
   export function getEphemeralConversations(shopId: string): Conversation[] {
     return INITIAL_CONVERSATIONS.filter((c) => c.shopId === shopId);
   }

   export function getEphemeralMessages(conversationId: string): Message[] {
     return INITIAL_MESSAGES[conversationId] || [];
   }
   ```
   (And include `conv-mdy-01` and `msg-mdy-101` in `INITIAL_CONVERSATIONS` and `INITIAL_MESSAGES` for Mandalay shop support).

### 4.3 Proposed Updates for `src/app/page.tsx`

Replace lines 38-68:
```typescript
  // Load tenant-scoped data when currentShop changes
  useEffect(() => {
    async function loadTenantData() {
      const prods = await db.getProducts(currentShop.id);
      const convs = getEphemeralConversations(currentShop.id);
      setConversations(convs);
      setProducts(prods);

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
    if (!messages[selectedConvId]) {
      const msgs = getEphemeralMessages(selectedConvId);
      setMessages((prev) => ({ ...prev, [selectedConvId]: msgs }));
    }
  }, [selectedConvId]);
```

### 4.4 Proposed Updates for `src/lib/db.ts`

- Remove `conversations` and `messages` maps, methods, and seeds completely.
- Add `accessToken` to seeded channels.
- Support both `PROJECT.md` contracts and existing aliases:
  ```typescript
  // Canonical PROJECT.md Contracts with Backwards-Compatible Aliases:
  getShop(shopId: string): Promise<Shop | null> // Alias: getShopById
  listShops(): Promise<Shop[]>                  // Alias: getShops
  saveShop(shop: Shop): Promise<Shop>           // Alias: updateShop / createShop
  getProducts(shopId: string): Promise<Product[]>
  saveProduct(shopId: string, product: Product): Promise<Product> // Alias: addProduct
  updateProductStock(shopId: string, productId: string, delta: number): Promise<Product | null>
  findShopByChannel(platform: 'facebook' | 'tiktok', channelIdentifier: string) // Alias: findShopByPageId
  saveChannelConnection(shopId: string, channel: ChannelConnection): Promise<ChannelConnection>
  getOrders(shopId: string): Promise<Order[]>
  createOrder(shopId: string, order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> // Alias: addOrder
  updateOrderStatus(shopId: string, orderId: string, status: OrderStatus): Promise<Order | null>
  ```

---

## 5. Verification Method

1. **Independent Build Verification**:
   - Command: `cmd /c "npm run build"`
   - Expected Output:
     - 0 TypeScript compiler errors.
     - Build exits with code 0.
     - All 12 routes generated successfully.
2. **Type Invariant Verification**:
   - Inspect `src/types/index.ts`:
     - `ChannelConnection` contains `accessToken: string`.
     - `Order` contains `platform: PlatformType` and `customerPlatformId: string`, with `conversationId` completely absent.
     - `Conversation` and `Message` are documented as ephemeral types with zero DB persistence.
3. **Zero Chat DB Invariant Verification**:
   - In `src/lib/db.ts`, grep for `conversation` or `message`.
   - Result: 0 occurrences of conversation/message storage maps or methods in `MultiTenantDB`.
4. **Invalidation Conditions**:
   - Any commit that reintroduces `conversationId` into `Order`.
   - Any commit that adds `conversations` or `messages` tables/methods to `db.ts`.
   - Any omission of `accessToken` in `INITIAL_CHANNELS` causing TypeScript build failure.
