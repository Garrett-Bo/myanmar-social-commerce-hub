# Milestone 4 Handoff Report: Order Closing, Stock Decrement, Telegram Alerts & Test Harness

**Agent**: explorer_m4_3  
**Role**: Order Closing, Telegram Alerts & Test Harness Explorer  
**Milestone**: Milestone 4 (AI Sales Closing Engine & Checkout Collection)  
**Target Path**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_3\handoff.md`  

---

## 1. Observation

### 1.1 Existing Database Layer (`src/lib/db.ts`)
- **Stock Decrement Logic** (lines 340–358):
  ```typescript
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
  ```
  *Observation*: `updateProductStock` accepts a `delta` number and automatically clamps negative values to `0` (`Math.max(0, p.stockQuantity + delta)`). It sets `isAvailable = newQty > 0` and writes through to disk via `persistData()`. However, the calling sales agent (`src/lib/gemini-agent.ts`) currently does not invoke this method nor does it check whether stock is sufficient before creating an order.

- **Order Creation Logic** (lines 368–380):
  ```typescript
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
  ```
  *Observation*: `createOrder` accepts partial order data, automatically generates an order ID with prefix `ord-`, timestamps it with `createdAt`, persists it to memory and disk, and returns the full `Order` entity. It enforces tenant isolation by indexing orders strictly under `shopId`.

- **Order Status Update** (lines 395–412):
  ```typescript
  async updateOrderStatus(shopId: string, orderId: string, status: OrderStatus): Promise<Order | null>
  ```
  *Observation*: Updates the status of an existing order and persists the change to disk.

### 1.2 Existing Types (`src/types/index.ts`)
- **OrderStatus** (line 9):
  ```typescript
  export type OrderStatus = 'pending_slip' | 'pending_approval' | 'confirmed' | 'shipped' | 'cancelled';
  ```
- **Order Interface** (lines 57–74):
  ```typescript
  export interface Order {
    id: string;
    shopId: string;
    platform: PlatformType;
    customerPlatformId: string;
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
  *Observation*: Orders strictly store `customerPlatformId` (e.g., PSID or TikTok User ID) as the external channel reference. In strict compliance with the Zero-Chat Storage Invariant, there is **zero foreign key** to any conversation or message table.

### 1.3 Existing Telegram Dispatcher (`src/lib/telegram.ts`)
- **Current Implementation** (lines 8–52):
  ```typescript
  export async function sendTelegramOrderNotification(order: Order, shop: Shop): Promise<boolean> {
    if (!shop.telegramBotToken || !shop.telegramChatId) {
      console.log('[Telegram Alert Mock]: No Telegram token configured. Alert payload:', order);
      return false;
    }
    // ...
  ```
  *Observations*:
  1. Method signature is `sendTelegramOrderNotification(order: Order, shop: Shop)`, whereas DISPATCH requires `sendTelegramOrderAlert(shop: Shop, order: Order, products?: Product[])`.
  2. The alert text template (lines 18–33) omits the **Order ID** (`order.id`).
  3. When tokens are missing or during automated offline testing, the function returns `false`. This causes callers to perceive mock execution as a failure.
  4. There is no in-memory test spy tracker (e.g. `telegramAlertSpy`) to allow automated test harnesses to inspect dispatched alert payloads.

### 1.4 Current Sales Agent (`src/lib/gemini-agent.ts`)
- **AgentResponse Interface** (lines 13–20):
  ```typescript
  export interface AgentResponse {
    replyTextMm: string;
    detectedTownship?: string;
    detectedItems?: { productId: string; quantity: number }[];
    deliveryFeeMmk?: number;
    isOrderIntent: boolean;
    orderDraft?: Partial<Order>;
  }
  ```
  *Observations*:
  1. `AgentResponse` lacks `completedOrder?: Order`, `intent: string`, `confidence: number`, and contract alias `replyText: string`.
  2. `processCustomerMessage` only drafts partial orders; it does not finalize them, does not decrement stock, does not verify stock availability (`product.stockQuantity >= requestedQuantity`), and does not trigger Telegram alerts.

### 1.5 Verification Scripts & Test Infrastructure
- Executing `npx tsx ...` directly in Windows PowerShell fails due to script execution policy restrictions:
  `npx : File C:\Program Files\nodejs\npx.ps1 cannot be loaded because running scripts is disabled on this system.`
- Executing commands via `cmd.exe /c "npx tsx scripts/verify_m3_channels.ts"` or `cmd.exe /c "npm.cmd test"` succeeds with 100% passing assertions (M1: 45/45, M2: 127/127, Zero-Chat probe: 106/106, M3: 88/88).

---

## 2. Logic Chain

1. **Order Persistence Contract Alignment**:
   - User Request R1 & PROJECT.md specify that finalized customer orders must be persisted in `db.orders`.
   - When all 5 checkout attributes (Product & Qty, Customer Name, Phone, Township/Address, Payment Method) are satisfied and confirmed, `processCustomerMessage` must call `db.createOrder(shop.id, orderData)`.
   - The initial status must be `'confirmed'` for COD orders (payment upon delivery) and `'pending_slip'` (or `'confirmed'`) for prepaid KPay/WavePay transfers.
   - The persisted `Order` object must be returned in `AgentResponse.completedOrder`.

2. **Atomic Inventory Decrement & Concurrency Guard**:
   - When an order is finalized, inventory must be updated via `db.updateProductStock(shop.id, productId, -quantity)`.
   - Crucially, before executing any decrements, the system must inspect current stock: `product.stockQuantity >= item.quantity`.
   - If stock is insufficient (e.g., remaining stock = 1 but requested quantity = 2, or stock = 0):
     - The sales closing engine must **refuse** order finalization.
     - `db.createOrder` must **not** be called.
     - `db.updateProductStock` must **not** be called.
     - The engine must return a courteous Burmese error notification stating the deficit and available stock (e.g. `စိတ်မကောင်းပါဘူးရှင့်၊ ... သည် လက်ကျန် (N) ခုသာ ရှိပါသဖြင့် မှာယူ၍ မရနိုင်ပါရှင့်။`).
   - If stock is sufficient, the atomic decrement proceeds and writes to disk, ensuring that concurrent orders cannot drive stock below 0.

3. **Telegram Seller Alert Architecture**:
   - Myanmar social commerce merchants rely on immediate Telegram alerts to dispatch goods and verify payment slips.
   - The alert message must be formatted in clean Telegram Markdown and include:
     - 🛒 Shop Name
     - 🆔 Order ID
     - 👤 Customer Name
     - 📞 Customer Phone (`09XXXXXXXXX`)
     - 📍 Township & Detailed Address
     - 💳 Payment Method
     - 📦 Itemized list with quantities and unit prices
     - 💰 Subtotal in MMK
     - 🚚 Delivery Fee in MMK
     - 💵 Grand Total in MMK
   - To support automated testing without live Telegram credentials:
     - Define `isTelegramMockMode(token?: string)` following the established pattern in `facebook.ts` and `tiktok.ts`.
     - When mock mode is active, record the alert payload into `telegramAlertSpy` and return `{ success: true, mocked: true }`.
     - Retain `sendTelegramOrderNotification` as a backward-compatible wrapper.

4. **Milestone 4 Verification Test Harness (`scripts/verify_m4_sales_closing.ts`)**:
   - Design a self-contained, automated TypeScript verification script with 7 distinct test suites:
     - **Suite 1**: Burmese & Burglish Intent Classification (Greeting, Price, Stock, Delivery, Payment, Buy/Order, Fallback).
     - **Suite 2**: Real-time Product Search & MMK Price Formatting (English/Burmese name, SKU, in-stock/out-of-stock badges, MMK formatting).
     - **Suite 3**: 5-Attribute Conversational Checkout Extraction (Product & Qty, Name, Phone normalizer, Township/Address, Payment method, Missing field prompting).
     - **Suite 4**: Township Delivery Calculation & Prepaid Policy Enforcement (Yangon downtown COD vs Taunggyi/Regional 100% Prepaid requirement).
     - **Suite 5**: Order Voucher Generation (`ဘောက်ချာ` format, mathematical accuracy `total = subtotal + fee`, polite Burmese closing).
     - **Suite 6**: Order Finalization, Atomic Stock Decrement & Negative Stock Guard (Order persistence, stock decrement, insufficient stock rejection, 0-stock guard).
     - **Suite 7**: Telegram Notification Alert & Zero-Chat DB Invariant Verification (Telegram payload inspection via spy, disk/runtime probe confirming 0 chat tables).

---

## 3. Caveats

1. **Windows Command Execution**:
   - Commands must be run using `cmd.exe /c "npx tsx scripts/..."` or `cmd.exe /c "npm.cmd test"` due to Windows PowerShell ExecutionPolicy (`UnauthorizedAccess` on `.ps1` wrapper).
2. **Deterministic Offline Fallback**:
   - `scripts/verify_m4_sales_closing.ts` must run cleanly without an external `GEMINI_API_KEY` or live Telegram bot token. The deterministic rule engine and mock Telegram dispatcher must be fully tested.
3. **Database Test Isolation**:
   - To avoid polluting `data/db.json` with temporary verification data, test instances can instantiate `new MultiTenantDB(testDbPath)` or use `db.resetToSeed()` after executing mutations.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Telegram Alert Dispatcher Blueprint (`src/lib/telegram.ts`)

```typescript
import { Order, Shop, Product } from '@/types';

export interface TelegramSendResult {
  success: boolean;
  mocked?: boolean;
  messageId?: string;
  error?: string;
}

export interface TelegramAlertLog {
  timestamp: string;
  shopId: string;
  shopName: string;
  orderId: string;
  chatId: string;
  text: string;
  order: Order;
  mocked: boolean;
}

// In-memory test spy tracker (Zero disk / zero DB persistence)
export const _mockTelegramAlerts: TelegramAlertLog[] = [];

export const telegramAlertSpy = {
  get logs(): TelegramAlertLog[] {
    return _mockTelegramAlerts;
  },
  record(log: TelegramAlertLog): void {
    _mockTelegramAlerts.push(log);
  },
  getLatest(): TelegramAlertLog | undefined {
    return _mockTelegramAlerts[_mockTelegramAlerts.length - 1];
  },
  getByOrderId(orderId: string): TelegramAlertLog | undefined {
    return _mockTelegramAlerts.find((l) => l.orderId === orderId);
  },
  count(): number {
    return _mockTelegramAlerts.length;
  },
  reset(): void {
    _mockTelegramAlerts.length = 0;
  },
};

export function isTelegramMockMode(token?: string): boolean {
  if (process.env.MOCK_TELEGRAM === 'true' || process.env.MOCK_CHANNELS === 'true') return true;
  if (!token) return true;
  const lower = token.toLowerCase();
  if (lower.includes('mock') || lower.startsWith('test_') || lower === 'mock-token') return true;
  if (process.env.NODE_ENV === 'test' && !process.env.TELEGRAM_LIVE_CREDENTIALS) return true;
  return false;
}

export function formatTelegramOrderAlertText(shop: Shop, order: Order): string {
  const itemsList = order.items
    .map(
      (item, idx) =>
        `  ${idx + 1}. *${item.name}* x ${item.quantity} = ${(item.priceMmk * item.quantity).toLocaleString()} MMK`
    )
    .join('\n');

  return `🚨 *အော်ဒါအသစ် ရောက်ရှိပါသည်!* (New Order Alert)
━━━━━━━━━━━━━━━━━━━━
🛒 *ဆိုင်ခွဲ:* ${shop.name}
🆔 *Order ID:* \`${order.id}\`
👤 *ဝယ်သူအမည်:* ${order.customerName}
📞 *ဖုန်းနံပါတ်:* ${order.customerPhone}
📍 *ပို့ဆောင်မည့် မြို့နယ်/လိပ်စာ:* ${order.township} (${order.fullAddress})
💳 *ငွေချေစနစ်:* ${order.paymentMethod.toUpperCase()}

📦 *မှာယူထားသော ပစ္စည်းများ:*
${itemsList}

💰 *ပစ္စည်းကျသင့်ငွေ:* ${order.subtotalMmk.toLocaleString()} MMK
🚚 *ပို့ဆောင်ခ:* ${order.deliveryFeeMmk.toLocaleString()} MMK
💵 *စုစုပေါင်း ကျသင့်ငွေ:* *${order.totalMmk.toLocaleString()} MMK*
━━━━━━━━━━━━━━━━━━━━
👉 _ကျေးဇူးပြု၍ Web Inbox တွင် KPay ပြေစာနှင့် အော်ဒါအား စစ်ဆေးပေးပါရှင့်_`;
}

export async function sendTelegramOrderAlert(
  shop: Shop,
  order: Order,
  products?: Product[]
): Promise<TelegramSendResult> {
  const text = formatTelegramOrderAlertText(shop, order);
  const chatId = shop.telegramChatId || '@mock_chat';
  const token = shop.telegramBotToken;

  if (isTelegramMockMode(token) || !token || !shop.telegramChatId) {
    const log: TelegramAlertLog = {
      timestamp: new Date().toISOString(),
      shopId: shop.id,
      shopName: shop.name,
      orderId: order.id,
      chatId,
      text,
      order,
      mocked: true,
    };
    telegramAlertSpy.record(log);
    return { success: true, mocked: true, messageId: `tg_mock_${Date.now()}` };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: shop.telegramChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Telegram API error: ${response.statusText}` };
    }

    telegramAlertSpy.record({
      timestamp: new Date().toISOString(),
      shopId: shop.id,
      shopName: shop.name,
      orderId: order.id,
      chatId: shop.telegramChatId,
      text,
      order,
      mocked: false,
    });

    return { success: true, mocked: false };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

// Backward-compatible wrapper
export async function sendTelegramOrderNotification(order: Order, shop: Shop): Promise<boolean> {
  const result = await sendTelegramOrderAlert(shop, order);
  return result.success;
}
```

---

### 4.2 AI Sales Closing & Order Finalization Integration Blueprint (`src/lib/gemini-agent.ts`)

```typescript
export interface AgentContext {
  shop: Shop;
  products: Product[];
  customerName?: string;
  conversationHistory?: { role: 'user' | 'model'; content: string }[];
  channel?: ChannelConnection;
  senderPlatformId?: string;
  currentDraft?: Partial<Order>;
}

export interface AgentResponse {
  replyTextMm: string;
  replyText: string; // Alias for PROJECT.md contract compatibility
  intent: string;    // 'greeting' | 'price_inquiry' | 'stock_inquiry' | 'delivery_inquiry' | 'payment_inquiry' | 'order_intent' | 'checkout_info' | 'general_inquiry'
  confidence: number;
  detectedTownship?: string;
  detectedItems?: { productId: string; quantity: number }[];
  deliveryFeeMmk?: number;
  isOrderIntent: boolean;
  orderDraft?: Partial<Order>;
  completedOrder?: Order;
}
```

#### Order Finalization Logic & Stock Guard:
```typescript
// When all 5 attributes are satisfied:
// 1. Product & Quantity
// 2. Customer Name
// 3. Customer Phone (normalized)
// 4. Township & Detailed Address
// 5. Payment Method

// Step 1: Pre-decrement Inventory Guard
for (const item of orderItems) {
  const product = context.products.find((p) => p.id === item.productId);
  if (!product || product.stockQuantity < item.quantity) {
    const available = product ? product.stockQuantity : 0;
    const name = product ? product.nameMm : item.name;
    const replyText = `စိတ်မကောင်းပါဘူးရှင့်၊ "${name}" သည် လက်ကျန် (${available}) ခုသာ ရှိပါသဖြင့် မှာယူလိုသော အရေအတွက် (${item.quantity}) ခု မလုံလောက်ပါရှင့်။`;
    return {
      replyTextMm: replyText,
      replyText,
      intent: 'stock_inquiry',
      confidence: 0.95,
      isOrderIntent: true,
      orderDraft: draft,
    };
  }
}

// Step 2: Atomic Stock Decrement via db.updateProductStock
for (const item of orderItems) {
  await db.updateProductStock(context.shop.id, item.productId, -item.quantity);
}

// Step 3: Order Persistence via db.createOrder
const createdOrder = await db.createOrder(context.shop.id, {
  platform: context.channel?.platform || 'facebook',
  customerPlatformId: context.senderPlatformId || 'unknown_customer',
  customerName: customerName,
  customerPhone: customerPhone,
  township: matchedDelivery.nameEn,
  fullAddress: addressText,
  items: orderItems,
  subtotalMmk,
  deliveryFeeMmk: matchedDelivery.standardFeeMmk,
  totalMmk: subtotalMmk + matchedDelivery.standardFeeMmk,
  paymentMethod: paymentMethod,
  status: paymentMethod === 'cod' ? 'confirmed' : 'pending_slip',
});

// Step 4: Instant Seller Telegram Notification Alert
await sendTelegramOrderAlert(context.shop, createdOrder, context.products);

// Step 5: Format Standard Burmese Order Voucher (ဘောက်ချာ)
const voucherText = formatBurmeseOrderVoucher(context.shop, createdOrder);

return {
  replyTextMm: voucherText,
  replyText: voucherText,
  intent: 'order_intent',
  confidence: 0.98,
  detectedTownship: matchedDelivery.nameEn,
  deliveryFeeMmk: matchedDelivery.standardFeeMmk,
  isOrderIntent: true,
  completedOrder: createdOrder,
};
```

---

### 4.3 Standard Burmese Order Voucher (`ဘောက်ချာ`) Format Specification

```text
🧾 *အော်ဒါဘောက်ချာ (Order Voucher)*
━━━━━━━━━━━━━━━━━━━━
🛒 *ဆိုင်အမည်:* {Shop Name}
🆔 *ဘောက်ချာအမှတ်:* {Order ID}
👤 *ဝယ်သူအမည်:* {Customer Name}
📞 *ဖုန်းနံပါတ်:* {Normalized Phone: 09XXXXXXXXX}
📍 *ပို့ဆောင်မည့်လိပ်စာ:* {Address}, {Township}

📦 *မှာယူထားသော ပစ္စည်းများ:*
  ၁။ {Product Name} x {Qty} = {Line Total} ကျပ်

💰 *ပစ္စည်းကျသင့်ငွေ:* {Subtotal} ကျပ်
🚚 *ပို့ဆောင်ခ ({Township}):* {Delivery Fee} ကျပ် ({Est Days})
💵 *စုစုပေါင်း ကျသင့်ငွေ:* *{Grand Total} ကျပ်*
💳 *ငွေချေစနစ်:* {Payment Method}
━━━━━━━━━━━━━━━━━━━━
{Payment Instructions if KPay / WavePay}
ကျေးဇူးပြု၍ အော်ဒါအသေးစိတ်လေး စစ်ဆေးပေးပါရှင့်။
အားပေးမှုကို အထူးပင် ကျေးဇူးတင်ရှိပါသည်ရှင့် 🙏🌸
```

---

### 4.4 Milestone 4 Verification Test Harness Architecture (`scripts/verify_m4_sales_closing.ts`)

The script structure follows the proven design of `verify_m1_persistence.ts`, `verify_m2_nlp_logistics.ts`, and `verify_m3_channels.ts`:

```typescript
/**
 * Milestone 4 Automated Verification Suite: Burmese AI Sales Closing, Stock Decrement & Telegram Alerts
 *
 * 7 Verification Suites:
 *  Suite 1: Burmese & Burglish Intent Classification
 *  Suite 2: Real-time Product Search & MMK Price Formatting
 *  Suite 3: 5-Attribute Conversational Checkout Extraction
 *  Suite 4: Township Delivery Calculation & Prepaid Policy Enforcement
 *  Suite 5: Order Voucher Generation (ဘောက်ချာ format & arithmetic)
 *  Suite 6: Order Finalization, Atomic Stock Decrement & Negative Stock Guard
 *  Suite 7: Telegram Notification Alert & Zero-Chat DB Invariant Verification
 */
```

#### Detailed Test Suites & Assertions Inventory:
| Suite # | Target Area | Assertions Count | Key Verification Checks |
|---|---|:---:|---|
| **Suite 1** | Intent Classification | 12 | Greeting (`မင်္ဂလာပါ`, `hi`), Price (`ဈေးဘယ်လောက်လဲ`, Zawgyi `ေစ်းဘယ္ေလာက္လဲ`, Burglish `price plx`), Stock (`ပစ္စည်းရှိသေးလား`, `instock shi lr`), Delivery (`ပို့ခဘယ်လောက်လဲ`), Payment (`kpay ရလား`, `cod ရလား`), Buy/Order (`ဝယ်မယ်`, `ယူမယ်`, `order တင်မယ်`). |
| **Suite 2** | Catalog Search & MMK Pricing | 10 | English keyword (`serum`), Burmese keyword (`မန္တလေး ချည်ပိုးထည်`), SKU match (`MDY-SILK-01`), MMK price formatting with commas, in-stock badge (`✅ In-stock (N ခုကျန်)`), out-of-stock badge (`❌ Out of stock`). |
| **Suite 3** | 5-Attribute Checkout | 14 | Product & Qty extraction with Burmese digits (`၂ ဘူး`), customer name extraction, Myanmar phone normalization (`၀၉...` -> `09XXXXXXXXX`), township extraction (`စမ်းချောင်း`), payment extraction (`COD`, `KPay`), incomplete checkout prompting. |
| **Suite 4** | Delivery & Prepaid Policy | 10 | Yangon downtown delivery fee calculation (Sanchaung: 2,500 MMK, COD enabled), Mandalay (3,000 MMK, COD enabled), Regional prepaid enforcement (Taunggyi / Bus Gate: COD rejected, KPay prepaid enforced). |
| **Suite 5** | Order Voucher (`ဘောက်ချာ`) | 10 | Header with shop name, order ID present, customer details, itemized breakdown, arithmetic check: `total === subtotal + deliveryFee`, payment details, Burmese closing (`ကျေးဇူးတင်ပါသည်`). |
| **Suite 6** | Order Closing & Stock Guard | 12 | Successful checkout triggers `db.createOrder`, order stored in DB with `ord-` ID, initial status (`confirmed` for COD, `pending_slip` for KPay), atomic stock decrement verified in DB, negative stock guard (requesting qty > stock aborts order and decrements 0), 0-stock guard. |
| **Suite 7** | Telegram Alert & Zero-Chat Probe | 12 | `sendTelegramOrderAlert` dispatches in mock mode without throwing, `telegramAlertSpy` verifies exact payload fields (Shop, Order ID, Customer, Phone, Items, Total, Payment), DB forensic probe confirms zero chat tables/keys on disk and in memory. |
| **Total** | Full M4 Test Suite | **80 Assertions** | **Clean pass (80/80) with exit code 0** |

---

## 5. Verification Method

### 5.1 Verification Commands
The implementer can verify Milestone 4 using these exact shell commands:

1. **Milestone 4 Verification Test Suite**:
   ```cmd
   cmd.exe /c "npx tsx scripts/verify_m4_sales_closing.ts"
   ```
   *Expected Result*: All 7 suites execute cleanly, reporting `80/80 assertions passed`, exit code `0`.

2. **Combined Platform Test Suite**:
   ```cmd
   cmd.exe /c "npm.cmd test"
   ```
   *Expected Result*: Milestone 1, Milestone 2, Zero-Chat Probe, and Milestone 3 pass without errors.

3. **Next.js Production Build**:
   ```cmd
   cmd.exe /c "npm.cmd run build"
   ```
   *Expected Result*: Clean build exit `0` with no TypeScript or lint regressions.

### 5.2 Invalidation Conditions
The verification fails if:
- An order is finalized when available stock is less than the requested quantity.
- Product stock ever becomes negative (`stockQuantity < 0`).
- Any `conversations` or `messages` table/key appears in `data/db.json` or `MultiTenantDB`.
- Telegram notification alert fails to include Order ID or customer phone number.
- Regional township deliveries (e.g. Taunggyi, Lashio) permit Cash on Delivery (COD) without requiring prepaid payment.
- The test harness crashes when running offline without internet or API keys.
