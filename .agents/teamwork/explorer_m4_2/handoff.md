# Handoff Report — explorer_m4_2
**Milestone 4: Conversational Checkout & Voucher Engine Exploration**

## 1. Observation

### 1.1 Existing Codebase & Interface Contracts
- **`src/lib/gemini-agent.ts` (lines 1-195)**:
  - Lines 6-20: Currently defines `AgentContext` and `AgentResponse`. `AgentResponse` includes `{ replyTextMm: string; detectedTownship?: string; detectedItems?: { productId: string; quantity: number }[]; deliveryFeeMmk?: number; isOrderIntent: boolean; orderDraft?: Partial<Order>; }`.
  - Lines 32-35: Basic township lookup via `lookupTownshipDelivery(normalizedInput)`.
  - Lines 37-60: Product keyword matching against catalog items.
  - Lines 63-65: Fixed order keywords: `['ဝယ်မယ်', 'ယူမယ်', 'မှာမယ်', 'order', 'ပို့ပေးပါ', 'ဝယ်ချင်လို့', 'အော်ဒါတင်']`.
  - Lines 67-70: Phone regex `/(?:\+?95\s*0?9|0095\s*9|09|9)[0-9\s.-]{7,15}/` and normalization via `normalizeMyanmarPhone`.
  - Lines 71-76: Basic `orderDraft` stub created with `items: matchedProducts.map(p => ({ productId: p.id, name: p.nameMm, quantity: 1, priceMmk: p.priceMmk }))`. Hardcodes quantity to 1 without quantity parsing, without customer name extraction, and without payment method detection.
  - Lines 79-151: Gemini 2.5 Flash invocation branch (`model: 'gemini-2.5-flash'`).
  - Lines 153-185: Fallback rule engine replying with basic stock/delivery bullet points, but lacks 5-attribute conversational extraction, lacks missing attribute dynamic prompting, lacks stock availability validation against requested quantity, lacks COD regional rejection logic, and lacks the standard Burmese Order Voucher (`ဘောက်ချာ`).
- **`PROJECT.md` Interface Contracts (lines 110-114)**:
  - Line 111: `processCustomerMessage(messageText: string, context: MessageContext): Promise<AgentResponse>`
  - Line 112: `MessageContext: { shop: Shop; products: Product[]; channel: ChannelConnection; senderPlatformId: string }`
  - Line 113: `AgentResponse: { replyText: string; intent: string; orderDraft?: Partial<Order>; completedOrder?: Order; confidence: number }`
  - Compatibility observation: `facebook/route.ts` (line 64) and `adversarial_m2_nlp_probe.ts` (line 307) read `aiResponse.replyTextMm`. To preserve 100% backward compatibility with M2/M3 callers while fulfilling `PROJECT.md`, `AgentResponse` must provide both `replyText` and `replyTextMm` (`replyTextMm = replyText`).
- **`src/types/index.ts` (lines 50-74)**:
  - `OrderItem: { productId: string; name: string; quantity: number; priceMmk: number; }`
  - `Order: { id: string; shopId: string; platform: PlatformType; customerPlatformId: string; customerName: string; customerPhone: string; township: string; fullAddress: string; items: OrderItem[]; subtotalMmk: number; deliveryFeeMmk: number; totalMmk: number; paymentMethod: PaymentMethod; paymentSlipUrl?: string; status: OrderStatus; createdAt: string; }`
  - `PaymentMethod = 'kpay' | 'wavepay' | 'cod' | 'cbpay' | 'ayapay'`
  - `Product` has `stockQuantity: number` (line 44) and `priceMmk: number` (line 43).
- **`src/lib/burmese-converter.ts` (lines 84-138, 260-310)**:
  - `convertBurmeseDigits(text: string): string` correctly translates Burmese digits (`၀-၉`), Shan digits (`႐-႙`), Thai zero (`๐`), and contextual letter Wa (`ဝ`) in numeric contexts into ASCII digits `0-9`.
  - `normalizeMyanmarPhone(raw: string): string` reliably normalizes all valid Myanmar numbers to `09XXXXXXXXX`.
- **`src/lib/myanmar-townships.ts` (lines 11-584, 817-853)**:
  - 58 verified townships and 3 express bus gate hubs.
  - `lookupTownshipDelivery(query: string): TownshipDeliveryInfo | null` returns `{ nameMm, nameEn, standardFeeMmk, estDays, codAvailable, region, ... }`.
  - `isRegionalPrepaidOnly(query: string): boolean` strictly returns `true` for State/Region capitals and express bus gates (`codAvailable === false`), and `false` for Yangon, Mandalay, and Naypyitaw.
- **`scripts/adversarial_m2_nlp_probe.ts` Execution**:
  - Command: `npx.cmd tsx scripts/adversarial_m2_nlp_probe.ts`
  - Result: 141/141 checks PASSED cleanly (including Section 5 tests checking `detectedTownship`, `deliveryFeeMmk`, `orderDraft.customerPhone`, `orderDraft.township`, and regional prepaid prompt).

---

## 2. Logic Chain

### 2.1 Attribute 1: Product Selection, Quantity Parsing & Stock Validation
1. **Observation**: Customer messages express product selections and quantities using Burmese numerals (`၁, ၂...`), Burmese number words (`တစ်, နှစ်, သုံး...`), Arabic digits (`1, 2...`), and classifiers (`ဘူး, ခု, ထည်, စုံ, ချောင်း...`). If no quantity is specified, the customer intent is an order for 1 unit.
2. **Inference**:
   - Step 1: Detect product matching against catalog items (`p.nameMm`, `p.nameEn`, `p.sku`, and category/keywords).
   - Step 2: Extract quantity associated with each matched product:
     - Normalize text with `convertBurmeseDigits`.
     - Remove phone number string prior to generic numeral matching to prevent digits like `09798765432` from corrupting quantity.
     - Match patterns: `(\d+)\s*(?:ဘူး|ခု|ထည်|စုံ|စောင်|ချောင်း|လုံး|ကတ်|pcs?|items?|pack|box)?` or Burmese words `(တစ်|တ|နှစ်|နှ|သုံး|လေး|ငါး|ခြောက်|ခုနစ်|ခုန်|ရှစ်|ကိုး|ဆယ်)`.
     - If no quantity indicator exists, default quantity to `1`.
   - Step 3: Stock validation:
     - Compare `quantity` against `p.stockQuantity`.
     - If `p.stockQuantity <= 0`: Mark `out_of_stock`. Generate polite Burmese notification: `စိတ်မကောင်းပါဘူးရှင့်။ "${p.nameMm}" က လက်ရှိ ပစ္စည်းပြတ်နေပါသည် (Out of stock) ရှင့်။`
     - If `p.stockQuantity < quantity`: Mark `insufficient_stock`. Generate polite Burmese notification: `စိတ်မကောင်းပါဘူးရှင့်။ "${p.nameMm}" က လက်ကျန် ${p.stockQuantity} ခုသာ ရှိပါတော့တယ်ရှင့်။ ${p.stockQuantity} ခုပဲ ယူမလားရှင့်?`
     - Only if `p.stockQuantity >= quantity`: Mark available and add to `detectedItems`.

### 2.2 Attribute 2: Customer Name Extraction & Fallback
1. **Observation**: Customers in Myanmar social commerce often supply their name via explicit labels like `အမည် - ...`, `နာမည် ...`, `လက်ခံသူ - ...`, or `Name: ...`. However, in social chat (FB/TikTok), the user's account name is also available via platform context (`context.customerName`).
2. **Inference**:
   - Match explicit name patterns: `/(?:အမည်|နာမည်|လက်ခံသူ|Name)\s*[:：\-—]?\s*([A-Za-z\u1000-\u104F\s]+?)(?:[,\n၊]|$)/i`.
   - If found and non-empty, use the explicit customer name.
   - If not found in text, fall back to `context.customerName`.
   - If `context.customerName` is a placeholder (e.g. `'Customer'` or `'Customer (1928)'`), mark name as needing verification or accept platform identifier without blocking checkout.

### 2.3 Attribute 3: Phone Number Extraction & Normalization
1. **Observation**: Phone numbers appear with spaces, hyphens, prefixes (`+959`, `959`, `09`, `9`), Burmese digits (`၀-၉`), Shan digits (`႐-႙`), Thai zero (`๐`), and letter Wa (`ဝ`).
2. **Inference**:
   - Apply `convertBurmeseDigits` to translate non-ASCII numerals and letter Wa in numeric positions.
   - Run regex `/(?:\+?95\s*0?9|0095\s*9|09|9)[0-9\s.-]{7,15}/`.
   - Pass the matched token to `normalizeMyanmarPhone(token)`.
   - If valid, result is normalized to `09XXXXXXXXX`. If invalid or absent, attribute is missing.

### 2.4 Attribute 4: Township & Delivery Address Extraction
1. **Observation**: `lookupTownshipDelivery(normalizedInput)` accurately matches 58 townships and 3 express bus gates, returning `standardFeeMmk`, `estDays`, and `codAvailable`.
2. **Inference**:
   - Identify township via `lookupTownshipDelivery`.
   - Set `deliveryFeeMmk = matchedDelivery.standardFeeMmk`.
   - Set `estimatedDays = matchedDelivery.estDays`.
   - Extract street/ward address if present via `/(?:လိပ်စာ|အိမ်လိပ်စာ|Address)\s*[:：\-—]?\s*([^\n]+)/i` or address keywords (`လမ်း`, `ရပ်ကွက်`, `အမှတ်`, `တိုက်`, `အခန်း`).
   - If specific street address is not provided, default `fullAddress` to `${matchedDelivery.nameMm}မြို့နယ်`.

### 2.5 Attribute 5: Payment Method & Regional Prepaid Policy Enforcement
1. **Observation**: Customers specify `kpay`, `wavepay`, or `cod`. `isRegionalPrepaidOnly(township)` returns `true` for regional cities (Taunggyi, Mawlamyine, Lashio, etc.) and highway bus gates (Aung Mingalar, Dagon Ayeyar, Saw Bwar Gyi Gone).
2. **Inference**:
   - Match keywords:
     - KPay: `kpay`, `kbzpay`, `ကေပေး`, `ကေဖေ` -> `'kpay'`
     - WavePay: `wavepay`, `wave`, `ဝေ့ပေး`, `ဝေ့ဖေ` -> `'wavepay'`
     - COD: `cod`, `cash on delivery`, `အိမ်ရောက်ငွေချေ`, `အိမ်အရောက်ငွေချေ`, `ပစ္စည်းရောက်မှငွေချေ` -> `'cod'`
   - **Enforce strict policy**:
     - Check `isRegionalPrepaidOnly(matchedDelivery?.nameEn || normalizedInput)`.
     - If `true` and customer selected or requested `'cod'`:
       - **REJECT COD**. Flag `prepaidViolation = true`.
       - Do NOT confirm order as COD.
       - Generate prompt: `စိတ်မကောင်းပါဘူးရှင့်။ ${townshipName} မြို့နယ် (သို့မဟုတ် အဝေးပြေးကားဂိတ်) အတွက် အိမ်အရောက်ငွေချေ (COD) စနစ် မရရှိနိုင်ပါရှင့် (Prepaid Only)။ 100% KPay သို့မဟုတ် WavePay ဖြင့် ကြိုတင်ငွေလွှဲပေးချေရပါသည်ရှင့်။ KPay သို့မဟုတ် WavePay ဖြင့် ငွေလွှဲမှာယူလိုပါသလားရှင့်?`
     - If `false`: COD is permitted.
     - KPay and WavePay are always accepted regardless of location.

### 2.6 Missing Attribute Courteous Prompting
1. **Observation**: If checkout is initiated but 1 to 4 attributes are missing, asking customer generic questions is frustrating. A polite, targeted prompt listing only what is missing closes the sale faster.
2. **Inference**:
   - Check which of the 5 attributes are missing:
     - (1) Product/Quantity
     - (2) Customer Name
     - (3) Phone number
     - (4) Township/Address
     - (5) Payment method
   - Dynamically format the missing list in Burmese.
   - For payment method: if regional township is known, omit COD from the prompt choices so the customer is guided directly to KPay/WavePay.
   - Include shop payment details (`kpayNumber`, `kpayName`) when prepaid payment is required.

### 2.7 Order Voucher (`ဘောက်ချာ`) Formatting
1. **Observation**: When all 5 attributes are satisfied, a formatted Burmese Order Voucher must be presented to the customer to finalize the deal.
2. **Inference**:
   - Header with shop name (`🧾 အော်ဒါပြေစာ (Order Voucher)`, `🏪 ဆိုင်အမည်: ...`)
   - Customer information: Name, normalized Phone (`09XXXXXXXXX`), Full Address & Township
   - Itemized product list with quantity, unit price in MMK, line item total in MMK
   - Subtotal (`subtotalMmk`), Delivery fee (`deliveryFeeMmk`) with estimated timeline (`estDays`)
   - Grand Total in MMK (`subtotalMmk + deliveryFeeMmk`)
   - Selected payment method with payment instructions (KPay/WavePay account details and slip request for prepaid; COD payment on delivery note)
   - Professional Burmese closing message (`🙏 မင်မင်တို့ဆိုင်ကို အားပေးမှုအတွက် အထူးပင် ကျေးဇူးတင်ရှိပါသည်ရှင့် 💕`).

### 2.8 Order Draft Object Generation
1. **Observation**: `AgentResponse` must expose `orderDraft?: Partial<Order>` for downstream database persistence (`db.createOrder`) handled by Milestone 4 workers and `explorer_m4_3`.
2. **Inference**:
   - Maintain `orderDraft` with all populated attributes (`shopId`, `platform`, `customerPlatformId`, `customerName`, `customerPhone`, `township`, `fullAddress`, `items`, `subtotalMmk`, `deliveryFeeMmk`, `totalMmk`, `paymentMethod`, `status`).
   - If prepaid, `status: 'pending_slip'`. If COD, `status: 'confirmed'`.

---

## 3. Implementation Blueprint for `src/lib/gemini-agent.ts`

### 3.1 Type Definitions
```typescript
import { Product, Shop, Order, OrderItem, PaymentMethod, TownshipDeliveryInfo, ChannelConnection } from '@/types';

export interface AgentContext {
  shop: Shop;
  products: Product[];
  customerName?: string;
  senderPlatformId?: string;
  channel?: ChannelConnection;
  conversationHistory?: { role: 'user' | 'model'; content: string }[];
}

export type MessageContext = AgentContext;

export interface ExtractedCheckoutAttributes {
  items: { product: Product; quantity: number }[];
  customerName?: string;
  customerPhone?: string;
  delivery?: TownshipDeliveryInfo;
  fullAddress?: string;
  paymentMethod?: PaymentMethod;
  isComplete: boolean;
  missingAttributes: ('product' | 'name' | 'phone' | 'township' | 'payment')[];
  stockErrors?: { product: Product; requestedQty: number; availableQty: number }[];
  prepaidViolation?: boolean;
}

export interface AgentResponse {
  replyText: string;
  replyTextMm: string; // Backward compatibility alias
  intent: string;
  confidence: number;
  isOrderIntent: boolean;
  detectedTownship?: string;
  detectedItems?: { productId: string; quantity: number }[];
  deliveryFeeMmk?: number;
  orderDraft?: Partial<Order>;
  completedOrder?: Order;
  voucherText?: string;
}
```

### 3.2 Modular Helper Functions
```typescript
/**
 * 1. Extract Quantity from text for a matched product
 */
const BURMESE_NUMBER_WORDS: Record<string, number> = {
  'တစ်': 1, 'တ': 1, 'နှစ်': 2, 'နှ': 2, 'သုံး': 3, 'လေး': 4,
  'ငါး': 5, 'ခြောက်': 6, 'ခုနစ်': 7, 'ခုန်': 7, 'ရှစ်': 8, 'ကိုး': 9, 'ဆယ်': 10,
};

export function extractQuantity(text: string, productKeyword?: string): number {
  // Strip phone numbers first to prevent digit collision
  const withoutPhone = text.replace(/(?:\+?95\s*0?9|0095\s*9|09|9)[0-9\s.-]{7,15}/g, '');
  const converted = convertBurmeseDigits(withoutPhone);

  // Pattern A: Burmese word numbers + classifier
  const wordMatch = converted.match(/(တစ်|တ|နှစ်|နှ|သုံး|လေး|ငါး|ခြောက်|ခုနစ်|ခုန်|ရှစ်|ကိုး|ဆယ်)\s*(?:ဘူး|ခု|ထည်|စုံ|စောင်|ချောင်း|လုံး|ကတ်)/);
  if (wordMatch && BURMESE_NUMBER_WORDS[wordMatch[1]]) {
    return BURMESE_NUMBER_WORDS[wordMatch[1]];
  }

  // Pattern B: Digits + classifier (e.g. "2 ဘူး", "3 ခု", "5 ထည်", "2 pcs")
  const digitClassifierMatch = converted.match(/(\d+)\s*(?:ဘူး|ခု|ထည်|စုံ|စောင်|ချောင်း|လုံး|ကတ်|pcs?|items?|pack|box)/i);
  if (digitClassifierMatch) {
    const qty = parseInt(digitClassifierMatch[1], 10);
    if (!isNaN(qty) && qty > 0 && qty < 1000) return qty;
  }

  // Pattern C: Product keyword + digit or digit + product keyword
  if (productKeyword) {
    const kwRegex = new RegExp(`(?:${productKeyword}\\s*(\\d+)|(\\d+)\\s*${productKeyword})`, 'i');
    const kwMatch = converted.match(kwRegex);
    if (kwMatch) {
      const qty = parseInt(kwMatch[1] || kwMatch[2], 10);
      if (!isNaN(qty) && qty > 0 && qty < 1000) return qty;
    }
  }

  // Default quantity = 1
  return 1;
}

/**
 * 2. Extract Customer Name
 */
export function extractCustomerName(text: string, defaultName?: string): string {
  const nameRegex = /(?:အမည်|နာမည်|လက်ခံသူ|Name)\s*[:：\-—]?\s*([A-Za-z\u1000-\u104F\s]+?)(?:[,\n၊]|$)/i;
  const match = text.match(nameRegex);
  if (match && match[1].trim().length > 1) {
    return match[1].trim();
  }
  return defaultName || 'Customer';
}

/**
 * 3. Extract Myanmar Phone Number
 */
export function extractCustomerPhone(text: string): string | undefined {
  const converted = convertBurmeseDigits(text);
  const phoneRegex = /(?:\+?95\s*0?9|0095\s*9|09|9)[0-9\s.-]{7,15}/;
  const match = converted.match(phoneRegex);
  if (match) {
    const normalized = normalizeMyanmarPhone(match[0]);
    if (normalized) return normalized;
  }
  return undefined;
}

/**
 * 4. Extract Payment Method with Regional Prepaid Enforcement
 */
export function extractPaymentMethod(
  text: string,
  deliveryInfo: TownshipDeliveryInfo | null
): { paymentMethod?: PaymentMethod; isPrepaidViolation: boolean } {
  const lower = text.toLowerCase();
  let paymentMethod: PaymentMethod | undefined = undefined;
  let isPrepaidViolation = false;

  if (lower.includes('kpay') || lower.includes('kbzpay') || lower.includes('ကေပေး') || lower.includes('ကေဖေ')) {
    paymentMethod = 'kpay';
  } else if (lower.includes('wavepay') || lower.includes('wave pay') || lower.includes('wave') || lower.includes('ဝေ့ပေး') || lower.includes('ဝေ့ဖေ')) {
    paymentMethod = 'wavepay';
  } else if (
    lower.includes('cod') ||
    lower.includes('cash on delivery') ||
    lower.includes('အိမ်ရောက်ငွေချေ') ||
    lower.includes('အိမ်အရောက်ငွေချေ') ||
    lower.includes('ပစ္စည်းရောက်မှငွေချေ') ||
    lower.includes('ပစ္စည်းရောက်မှငွေရှင်း')
  ) {
    const isPrepaid = deliveryInfo ? isRegionalPrepaidOnly(deliveryInfo.nameEn) : isRegionalPrepaidOnly(text);
    if (isPrepaid) {
      isPrepaidViolation = true;
      paymentMethod = undefined; // Reject COD for regional / bus gate
    } else {
      paymentMethod = 'cod';
    }
  }

  return { paymentMethod, isPrepaidViolation };
}

/**
 * 5. Extract Detailed Address
 */
export function extractFullAddress(text: string, deliveryInfo: TownshipDeliveryInfo | null): string {
  const addressRegex = /(?:လိပ်စာ|အိမ်လိပ်စာ|Address)\s*[:：\-—]?\s*([^\n]+)/i;
  const match = text.match(addressRegex);
  if (match && match[1].trim()) {
    return match[1].trim();
  }
  return deliveryInfo ? `${deliveryInfo.nameMm}မြို့နယ်` : '';
}

/**
 * 6. Generate Standard Burmese Order Voucher (ဘောက်ချာ)
 */
export function formatOrderVoucher(
  order: Partial<Order>,
  shop: Shop,
  delivery?: TownshipDeliveryInfo | null
): string {
  const lines: string[] = [];
  lines.push('========================================');
  lines.push('🧾 **အော်ဒါပြေစာ (Order Voucher)**');
  lines.push(`🏪 **ဆိုင်အမည်**: ${shop.name}`);
  lines.push('========================================');
  lines.push(`👤 **ဝယ်သူအမည်**: ${order.customerName || 'Customer'}`);
  lines.push(`📞 **ဖုန်းနံပါတ်**: ${order.customerPhone || '-'}`);
  lines.push(`📍 **ပို့ဆောင်ရမည့်လိပ်စာ**: ${order.fullAddress || '-'}${order.township ? ` (${order.township})` : ''}`);
  lines.push('----------------------------------------');
  lines.push('🛍️ **မှာယူထားသော ပစ္စည်းများ**:');

  if (order.items && order.items.length > 0) {
    order.items.forEach((item, idx) => {
      const itemTotal = (item.quantity * item.priceMmk).toLocaleString();
      const unitPrice = item.priceMmk.toLocaleString();
      lines.push(`  ${idx + 1}. ${item.name} x ${item.quantity} = ${itemTotal} ကျပ် (${unitPrice} ကျပ်/ခု)`);
    });
  }

  lines.push('----------------------------------------');
  lines.push(`💰 **ကုန်ပစ္စည်းစုစုပေါင်း**: ${(order.subtotalMmk || 0).toLocaleString()} ကျပ်`);
  
  const estDays = delivery?.estDays ? ` (${delivery.estDays})` : '';
  const feeStr = (order.deliveryFeeMmk || 0).toLocaleString();
  lines.push(`🚚 **ပို့ဆောင်ခ**${order.township ? ` [${order.township}${estDays}]` : ''}: ${feeStr} ကျပ်`);
  lines.push(`💳 **စုစုပေါင်းကျသင့်ငွေ**: ${(order.totalMmk || 0).toLocaleString()} ကျပ်`);
  lines.push('----------------------------------------');

  let paymentLabel = 'အိမ်အရောက်ငွေချေ (Cash on Delivery)';
  if (order.paymentMethod === 'kpay') {
    paymentLabel = `KBZPay ကြိုလွှဲ (${shop.kpayNumber || '-'} - ${shop.kpayName || '-'})`;
  } else if (order.paymentMethod === 'wavepay') {
    paymentLabel = `WavePay ကြိုလွှဲ (${shop.waveNumber || '-'} - ${shop.waveName || '-'})`;
  }
  lines.push(`💵 **ငွေချေစနစ်**: ${paymentLabel}`);

  if (order.paymentMethod === 'kpay' || order.paymentMethod === 'wavepay') {
    lines.push('⚠️ *ငွေလွှဲပြီးပါက ငွေလွှဲပြေစာ (Screenshot/Slip) လေး ပို့ပေးပါရှင့်။*');
  }

  lines.push('========================================');
  lines.push('🙏 **မင်မင်တို့ဆိုင်ကို အားပေးမှုအတွက် အထူးပင် ကျေးဇူးတင်ရှိပါသည်ရှင့်** 💕');

  return lines.join('\n');
}

/**
 * 7. Generate Targeted Missing Attributes Prompt
 */
export function formatMissingAttributesPrompt(
  missing: ('product' | 'name' | 'phone' | 'township' | 'payment')[],
  shop: Shop,
  delivery: TownshipDeliveryInfo | null,
  customerName?: string
): string {
  let text = `မင်္ဂလာပါရှင့် ${customerName && customerName !== 'Customer' ? customerName + ' ' : ''}🌸\n`;
  text += `အော်ဒါအတည်ပြုနိုင်ရန်အတွက် အောက်ပါ အချက်အလက်လေးများ ပို့ပေးပါရှင့် -\n\n`;

  let idx = 1;
  for (const m of missing) {
    if (m === 'product') text += `${idx++}။ မှာယူလိုသည့် ပစ္စည်းအမည် နှင့် အရေအတွက်\n`;
    if (m === 'name') text += `${idx++}။ လက်ခံမည့် အမည်\n`;
    if (m === 'phone') text += `${idx++}။ ဆက်သွယ်ရမည့် ဖုန်းနံပါတ် (09-xxx)\n`;
    if (m === 'township') text += `${idx++}။ ပို့ဆောင်ပေးရမည့် မြို့နယ် နှင့် အသေးစိတ်လိပ်စာ\n`;
    if (m === 'payment') {
      const isPrepaid = delivery ? isRegionalPrepaidOnly(delivery.nameEn) : false;
      if (isPrepaid) {
        text += `${idx++}။ ငွေချေနည်းလမ်း (KPay သို့မဟုတ် WavePay ကြိုလွှဲစနစ်)\n`;
      } else {
        text += `${idx++}။ ငွေချေနည်းလမ်း (KPay / WavePay / အိမ်အရောက်ငွေချေ COD)\n`;
      }
    }
  }

  if (missing.includes('payment')) {
    text += `\n(KPay ဖြင့်လွှဲယူလိုပါက KPay: ${shop.kpayNumber} - ${shop.kpayName} သို့ လွှဲပြီး ပြေစာလေး ပို့ပေးထားလို့ရပါတယ်ရှင့် 💕)`;
  }

  return text;
}
```

---

## 4. Caveats
1. **Chat Statelessness (Zero-Chat Invariant)**: In multi-turn social commerce, customer messages may arrive in sequence (e.g., message 1: "ဆီရမ် ၂ ဘူး", message 2: "ဖုန်း ၀၉၇၉၈၇၆၅၄၃၂ စမ်းချောင်း"). Because our database strictly does not store chat history (ORIGINAL_REQUEST R1/AC), multi-turn state must either be supplied in `context.conversationHistory` fetched ephemerally via Meta/TikTok on-demand fetchers or extracted from single rich checkout messages.
2. **Order Finalization Scope**: The actual database call `db.createOrder` and product stock decrement `db.updateProductStock` belong to the domain of `explorer_m4_3` and will consume the `orderDraft` output designed here.
3. **LLM Non-Determinism**: When `GEMINI_API_KEY` is present, Gemini Flash generates dynamic Burmese replies. However, the structured checkout fields (`orderDraft`, `deliveryFeeMmk`, `detectedTownship`, `detectedItems`, `isOrderIntent`) must ALWAYS be populated deterministically by the TypeScript extraction pipeline to guarantee 100% test pass rate and programmatic consistency.

---

## 5. Conclusion
1. **5-Attribute Extraction**: The designed architecture reliably extracts all 5 core checkout attributes with digit normalization, phone sanitization to `09XXXXXXXXX`, 58-township matrix lookup, and default quantity of 1.
2. **Stock Validation**: Inventory availability is enforced before checkout; out-of-stock and insufficient-stock cases trigger polite Burmese explanatory prompts.
3. **Prepaid Policy Enforcement**: Regional cities and express bus gates strictly reject COD and guide customers to KPay/WavePay, adhering to the Myanmar logistics matrix rules.
4. **Voucher Generation**: A comprehensive Burmese Order Voucher (`ဘောက်ချာ`) is generated whenever the 5 attributes are complete, providing shop info, itemized products, delivery fee, grand total, and payment instructions.
5. **Clean Interface Alignment**: Satisfies both `PROJECT.md` contracts and legacy M2/M3 test assertions by providing both `replyText` and `replyTextMm`.

---

## 6. Verification Method

### 6.1 Automated Verification Commands
```bash
# 1. Run M2 Adversarial NLP and Logistics Probes to verify backward compatibility
npx.cmd tsx scripts/adversarial_m2_nlp_probe.ts

# 2. Run M3 Social Channels Verification Suite
npx.cmd tsx scripts/verify_m3_channels.ts

# 3. Run Milestone 4 Sales Closing & Voucher Verification Suite (designed by explorer_m4_3)
npx.cmd tsx scripts/verify_m4_sales_closing.ts

# 4. Run Full Project Test Runner
npm.cmd test
```

### 6.2 Key Verification Invalidation Conditions
- Any failure in phone normalization producing non-`09XXXXXXXXX` strings.
- Failure of `isRegionalPrepaidOnly` to reject COD for regional cities (Taunggyi, Mawlamyine) or highway bus gates (Aung Mingalar).
- Missing shop name, subtotal, delivery fee, or total amount in the generated order voucher.
- Database writes into any non-existent message or chat tables (zero-chat invariant violation).
