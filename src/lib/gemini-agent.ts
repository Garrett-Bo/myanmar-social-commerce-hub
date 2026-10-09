import { normalizeBurmese, convertBurmeseDigits, normalizeMyanmarPhone } from './burmese-converter';
import { lookupTownshipDelivery, isRegionalPrepaidOnly } from './myanmar-townships';
import { Product, Shop, Order, OrderItem, PaymentMethod, TownshipDeliveryInfo, ChannelConnection } from '@/types';
import { db } from './db';
import { sendTelegramOrderAlert } from './telegram';

export type IntentType =
  | 'greeting'
  | 'price_inquiry'
  | 'stock_inquiry'
  | 'delivery_inquiry'
  | 'payment_inquiry'
  | 'order_intent'
  | 'checkout_info'
  | 'discount_inquiry'
  | 'slip_inquiry'
  | 'human_takeover'
  | 'general_inquiry';

export interface IntentClassificationResult {
  intent: IntentType;
  confidence: number;
  matchedKeywords: string[];
}

export interface AgentContext {
  shop: Shop;
  products: Product[];
  customerName?: string;
  conversationHistory?: { role: 'user' | 'model'; content: string }[];
  channel?: ChannelConnection;
  senderPlatformId?: string;
  currentDraft?: Partial<Order>;
}

export type MessageContext = AgentContext;

export interface ExtractedCheckoutAttributes {
  items: { product: Product; quantity: number }[];
  customerName?: string;
  customerPhone?: string;
  delivery?: TownshipDeliveryInfo | null;
  fullAddress?: string;
  paymentMethod?: PaymentMethod;
  isComplete: boolean;
  missingAttributes: ('product' | 'name' | 'phone' | 'township' | 'payment')[];
  stockErrors?: { product: Product; requestedQty: number; availableQty: number }[];
  prepaidViolation?: boolean;
}

export interface AgentResponse {
  replyText: string;
  replyTextMm: string; // 100% backward-compatible alias for existing callers
  intent: IntentType;
  confidence: number;
  detectedTownship?: string;
  detectedItems?: { productId: string; quantity: number }[];
  deliveryFeeMmk?: number;
  isOrderIntent: boolean;
  orderDraft?: Partial<Order>;
  completedOrder?: Order;
  voucherText?: string;
}

/**
 * 1. Pure Intent Classifier for Burmese Unicode, Zawgyi, and Burglish Slang
 */
export function classifyBurmeseIntent(rawInput: string): IntentClassificationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { intent: 'general_inquiry', confidence: 0.5, matchedKeywords: [] };
  }

  const normalized = normalizeBurmese(rawInput);
  const inputLower = normalized.toLowerCase();
  const rawLower = rawInput.toLowerCase();
  const withDigits = convertBurmeseDigits(normalized);

  // 1. Human Takeover
  const humanPatterns = [
    'လူနဲ့ပြော', 'လူခေါ်ပေး', 'မင်မင်ခေါ်', 'agent', 'admin', 'လူစစ်စစ်',
    'human agent', 'talk to human', 'real person', 'call admin', 'agent plz', 'human',
  ];
  for (const p of humanPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'human_takeover', confidence: 0.95, matchedKeywords: [p] };
    }
  }

  // 2. Slip & Payment Confirmation
  const slipPatterns = [
    'စလစ်', 'ပြေစာ', 'လွှဲပြီးပါပြီ', 'လွှဲပြီး', 'kpay လွှဲ', 'wave လွှဲ',
    'slip', 'transfer done', 'paid', 'screenshot', 'slip po', 'kpay lwe pee', 'wave lwe pee',
  ];
  for (const p of slipPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'slip_inquiry', confidence: 0.95, matchedKeywords: [p] };
    }
  }

  // 3. Checkout Information Detection (Phone + Address/Township)
  const phoneMatch = withDigits.match(/(?:\+?95\s*0?9|0095\s*9|09|9)[0-9\s.-]{7,15}/);
  const hasPhone = phoneMatch ? !!normalizeMyanmarPhone(phoneMatch[0]) : false;
  const deliveryMatch = lookupTownshipDelivery(normalized);
  const addressKeywords = [
    'လမ်း', 'တိုက်', 'အမှတ်', 'ရပ်ကွက်', 'အိမ်နံပါတ်', 'အိမ်လိပ်စာ', 'လိပ်စာ',
    'road', 'street', 'ward', 'township', 'address',
  ];
  const hasAddress = addressKeywords.some((k) => inputLower.includes(k) || rawLower.includes(k));

  if (hasPhone && (deliveryMatch || hasAddress)) {
    return {
      intent: 'checkout_info',
      confidence: 0.95,
      matchedKeywords: ['phone', deliveryMatch ? deliveryMatch.nameEn : 'address'],
    };
  }

  // 4. Discount Inquiry
  const discountPatterns = [
    'လျှော့ပေးလား', 'ဈေးလျှော့', 'စျေးလျှော့', 'discount', 'promotion',
    'ပရိုမိုးရှင်း', 'promo', 'shout pay lr', 'shout pay',
  ];
  for (const p of discountPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'discount_inquiry', confidence: 0.9, matchedKeywords: [p] };
    }
  }

  // 5. Order / Buy Intent
  const orderPatterns = [
    'ဝယ်မယ်', 'ဝယ်ယူမယ်', 'ဝယ်ချင်လို့', 'ဝယ်ချင်', 'ယူမယ်', 'မှာမယ်', 'မှာချင်လို့', 'မှာချင်',
    'အော်ဒါတင်မယ်', 'အော်ဒါတင်', 'အော်ဒါမှာ', 'ပို့ပေးပါ', 'order တင်', 'order tin ml', 'order tin',
    'order ml', 'wwe ml', 'we ml', 'yuu ml', 'yu ml', 'mhar ml', 'order', 'buy', 'take 1', 'take one',
  ];
  for (const p of orderPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'order_intent', confidence: 0.92, matchedKeywords: [p] };
    }
  }

  // 6. Delivery Inquiry (Must precede price if deli mentioned)
  const deliveryPatterns = [
    'ပို့ခ', 'ဒေလီခ', 'ပို့ပေးလား', 'အိမ်အရောက်', 'ကားဂိတ်', 'ဘယ်နှစ်ရက်', 'ကြာချိန်',
    'deli', 'deli fee', 'deli charge', 'delivery charge', 'dali charge', 'deli bl lout', 'deli kha', 'cod ya lr',
  ];
  for (const p of deliveryPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'delivery_inquiry', confidence: 0.9, matchedKeywords: [p] };
    }
  }
  if (deliveryMatch && !hasPhone) {
    return { intent: 'delivery_inquiry', confidence: 0.85, matchedKeywords: [deliveryMatch.nameEn] };
  }

  // 7. Payment Inquiry
  const paymentPatterns = [
    'kpay ရလား', 'wave ရလား', 'kbzpay', 'wavepay', 'ဘယ်လိုရှင်း', 'ဘယ်လိုချေ', 'ငွေဘယ်လိုချေ', 'ငွေလွှဲ',
    'kpay ya lr', 'kpay r lr', 'wave ya lr', 'bhr lo shin', 'kpay acc', 'wave acc',
  ];
  for (const p of paymentPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'payment_inquiry', confidence: 0.9, matchedKeywords: [p] };
    }
  }

  // 8. Stock Inquiry
  const stockPatterns = [
    'ပစ္စည်းရှိလား', 'ရှိသေးလား', 'ပစ္စည်းကျန်လား', 'ပစ္စည်းကျန်', 'stock ကျန်လား', 'stock ကျန်',
    'စတော့ကျန်လား', 'စတော့', 'instock', 'in stock', 'instock shi lr', 'shi lr', 'shi thay lr',
    'stock kyan lr', 'out of stock', 'oos',
  ];
  for (const p of stockPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'stock_inquiry', confidence: 0.88, matchedKeywords: [p] };
    }
  }

  // 9. Price Inquiry
  const pricePatterns = [
    'ဈေးဘယ်လောက်', 'စျေးဘယ်လောက်', 'ဘယ်လောက်လဲ', 'ဘယ်ဈေး', 'ဘယ်စျေး', 'ဘယ်လောက်ကျ',
    'ဈေးလေးသိ', 'စျေးလေးသိ', 'ဈေးလေး', 'စျေးလေး',
    'price', 'price plx', 'price plz', 'price please', 'price pr',
    'bl lout ll', 'bl lout le', 'ze bl lout', 'zay bl lout',
  ];
  for (const p of pricePatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'price_inquiry', confidence: 0.88, matchedKeywords: [p] };
    }
  }

  // 10. Greeting
  const greetingPatterns = [
    'မင်္ဂလာပါ', 'ဟဲလို', 'ဟိုင်း', 'နေကောင်းလား',
    'hi', 'hello', 'mingalarpar', 'mingalaba', 'mglpar', 'mglba', 'heyy',
  ];
  for (const p of greetingPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'greeting', confidence: 0.95, matchedKeywords: [p] };
    }
  }

  return { intent: 'general_inquiry', confidence: 0.5, matchedKeywords: [] };
}

/**
 * 2. Match Catalog Products using Stem Synonyms, SKUs, and Burglish Transliterations
 */
const STEM_SYNONYMS: Record<string, string[]> = {
  serum: ['ဆီရမ်', 'ဗီတာမင်စီ', 'serum', 'vitamin c'],
  liptint: ['နှုတ်ခမ်းနီ', 'lip tint', 'liptint', 'lipstick'],
  paso: ['ပုဆိုး', 'လုံချည်', 'ချည်ပိုးထည်', 'မန္တလေး ချည်ပိုးထည်', 'paso', 'longyi', 'silk'],
  dress: ['ဂါဝန်', 'ဝတ်စုံ', 'dress', 'skirt'],
  bag: ['အိတ်', 'လွယ်အိတ်', 'လက်ကိုင်အိတ်', 'bag'],
  shoes: ['ဖိနပ်', 'shoes', 'sneakers'],
  sunscreen: ['နေကာခရင်မ်', 'sunscreen', 'sunblock', 'sun cream'],
};

export function matchCatalogProducts(query: string, products: Product[]): Product[] {
  if (!query || !products || products.length === 0) return [];

  const normalized = normalizeBurmese(query);
  const inputLower = normalized.toLowerCase();

  const scored: { product: Product; score: number }[] = [];

  for (const p of products) {
    const pNameMm = p.nameMm.toLowerCase();
    const pNameEn = p.nameEn.toLowerCase();
    const pSku = p.sku.toLowerCase();
    const pCategory = p.category.toLowerCase();

    let score = 0;

    // Exact SKU match
    if (inputLower.includes(pSku)) {
      score = Math.max(score, 100);
    }

    // Exact Name match
    if (inputLower.includes(pNameEn) || normalized.includes(p.nameMm)) {
      score = Math.max(score, 90);
    }

    // English word tokens match
    const enTokens = pNameEn.split(/[\s-]+/).filter((t) => t.length > 2);
    for (const t of enTokens) {
      if (inputLower.includes(t)) {
        score = Math.max(score, 75);
      }
    }

    // Category match
    if (inputLower.includes(pCategory)) {
      score = Math.max(score, 60);
    }

    // Burmese / Burglish stem dictionary match
    for (const [, synonyms] of Object.entries(STEM_SYNONYMS)) {
      const queryMatchesStem = synonyms.some((s) => inputLower.includes(s) || normalized.includes(s));
      const productMatchesStem = synonyms.some(
        (s) => pNameEn.includes(s) || pNameMm.includes(s) || pCategory.includes(s) || pSku.includes(s)
      );
      if (queryMatchesStem && productMatchesStem) {
        score = Math.max(score, 80);
      }
    }

    // Burmese compound substring match (e.g. 'ဆီရမ်' inside 'ဗီတာမင်စီ ဆီရမ်')
    const mmTokens = p.nameMm.split(/\s+/).filter((t) => t.length > 1);
    for (const t of mmTokens) {
      if (normalized.includes(t)) {
        score = Math.max(score, 70);
      }
    }

    if (score >= 60) {
      scored.push({ product: p, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.product);
}

/**
 * 3. Formatting Helpers
 */
export function formatProductPriceMmk(priceMmk: number): string {
  return `${priceMmk.toLocaleString()} MMK`;
}

export function formatStockStatus(stockQuantity: number): string {
  return stockQuantity > 0
    ? `✅ In-stock (${stockQuantity} ခုကျန်)`
    : `❌ လက်ရှိ ပစ္စည်းပြတ်နေပါသည် (Out of stock)`;
}

export function formatOrderVoucher(
  order: Partial<Order>,
  shop: Shop,
  delivery?: TownshipDeliveryInfo | null
): string {
  const lines: string[] = [];
  lines.push('🧾 *အော်ဒါဘောက်ချာ (Order Voucher)*');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`🛒 *ဆိုင်အမည်:* ${shop.name}`);
  lines.push(`🆔 *ဘောက်ချာအမှတ်:* \`${order.id || '-'}\``);
  lines.push(`👤 *ဝယ်သူအမည်:* ${order.customerName || 'Customer'}`);
  lines.push(`📞 *ဖုန်းနံပါတ်:* ${order.customerPhone || '-'}`);
  lines.push(
    `📍 *ပို့ဆောင်မည့်လိပ်စာ:* ${order.fullAddress || '-'}${order.township ? ` (${order.township})` : ''}`
  );
  lines.push('');
  lines.push('📦 *မှာယူထားသော ပစ္စည်းများ:*');

  const burmeseNumerals = ['၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉', '၁၀'];
  if (order.items && order.items.length > 0) {
    order.items.forEach((item, idx) => {
      const itemTotal = (item.quantity * item.priceMmk).toLocaleString();
      const unitPrice = item.priceMmk.toLocaleString();
      const numLabel = burmeseNumerals[idx] || (idx + 1).toString();
      lines.push(`  ${numLabel}။ ${item.name} x ${item.quantity} = ${itemTotal} ကျပ် (${unitPrice} ကျပ်/ခု)`);
    });
  }

  lines.push('');
  lines.push(`💰 *ပစ္စည်းကျသင့်ငွေ:* ${(order.subtotalMmk || 0).toLocaleString()} ကျပ်`);

  const estDays = delivery?.estDays ? ` (${delivery.estDays})` : '';
  const feeStr = (order.deliveryFeeMmk || 0).toLocaleString();
  lines.push(`🚚 *ပို့ဆောင်ခ${order.township ? ` (${order.township}${estDays})` : ''}:* ${feeStr} ကျပ်`);
  lines.push(`💵 *စုစုပေါင်း ကျသင့်ငွေ:* *${(order.totalMmk || 0).toLocaleString()} ကျပ်*`);

  let paymentLabel = 'အိမ်အရောက်ငွေချေ (Cash on Delivery)';
  if (order.paymentMethod === 'kpay') {
    paymentLabel = `KBZPay ကြိုလွှဲ (${shop.kpayNumber || '-'} - ${shop.kpayName || '-'})`;
  } else if (order.paymentMethod === 'wavepay') {
    paymentLabel = `WavePay ကြိုလွှဲ (${shop.waveNumber || '-'} - ${shop.waveName || '-'})`;
  }
  lines.push(`💳 *ငွေချေစနစ်:* ${paymentLabel}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━');

  if (order.paymentMethod === 'kpay' || order.paymentMethod === 'wavepay') {
    lines.push('⚠️ _ငွေလွှဲပြီးပါက ငွေလွှဲပြေစာ (Screenshot/Slip) လေး ပို့ပေးပါရှင့်။_');
  }

  lines.push('ကျေးဇူးပြု၍ အော်ဒါအသေးစိတ်လေး စစ်ဆေးပေးပါရှင့်။');
  lines.push('အားပေးမှုကို အထူးပင် ကျေးဇူးတင်ရှိပါသည်ရှင့် 🙏🌸');

  return lines.join('\n');
}

export function formatMissingAttributesPrompt(
  missing: ('product' | 'name' | 'phone' | 'township' | 'payment')[],
  shop: Shop,
  delivery: TownshipDeliveryInfo | null,
  customerName?: string
): string {
  let text = `မင်္ဂလာပါရှင့် ${customerName && customerName !== 'Customer' ? customerName + ' ' : ''}🌸\n`;
  text += `အော်ဒါအတည်ပြုနိုင်ရန်အတွက် အောက်ပါ အချက်အလက်လေးများ ပို့ပေးပါရှင့် -\n\n`;

  const burmeseNumerals = ['၁', '၂', '၃', '၄', '၅'];
  let idx = 0;
  for (const m of missing) {
    const num = burmeseNumerals[idx] || (idx + 1).toString();
    if (m === 'product') text += `${num}။ မှာယူလိုသည့် ပစ္စည်းအမည် နှင့် အရေအတွက်\n`;
    if (m === 'name') text += `${num}။ လက်ခံမည့် အမည်\n`;
    if (m === 'phone') text += `${num}။ ဆက်သွယ်ရမည့် ဖုန်းနံပါတ် (09-xxx)\n`;
    if (m === 'township') text += `${num}။ ပို့ဆောင်ပေးရမည့် မြို့နယ် နှင့် အသေးစိတ်လိပ်စာ\n`;
    if (m === 'payment') {
      const isPrepaid = delivery ? isRegionalPrepaidOnly(delivery.nameEn) : false;
      if (isPrepaid) {
        text += `${num}။ ငွေချေနည်းလမ်း (KPay သို့မဟုတ် WavePay ကြိုလွှဲစနစ်)\n`;
      } else {
        text += `${num}။ ငွေချေနည်းလမ်း (KPay / WavePay / အိမ်အရောက်ငွေချေ COD)\n`;
      }
    }
    idx++;
  }

  if (missing.includes('payment') && shop.kpayNumber) {
    text += `\n(KPay ဖြင့်လွှဲယူလိုပါက KPay: ${shop.kpayNumber} - ${shop.kpayName} သို့ လွှဲပြီး ပြေစာလေး ပို့ပေးထားလို့ရပါတယ်ရှင့် 💕)`;
  }

  return text;
}

/**
 * 4. 5-Attribute Conversational Checkout Extraction Helpers
 */
const BURMESE_NUMBER_WORDS: Record<string, number> = {
  'တစ်': 1, 'တ': 1, 'နှစ်': 2, 'နှ': 2, 'သုံး': 3, 'လေး': 4,
  'ငါး': 5, 'ခြောက်': 6, 'ခုနစ်': 7, 'ခုန်': 7, 'ရှစ်': 8, 'ကိုး': 9, 'ဆယ်': 10,
};

export function extractQuantity(text: string, productKeyword?: string): number {
  // Strip phone numbers first to avoid numeric confusion
  const withoutPhone = text.replace(/(?:\+?95\s*0?9|0095\s*9|09|9)[0-9\s.-]{7,15}/g, '');
  const converted = convertBurmeseDigits(withoutPhone);

  // Pattern A: Burmese word numbers + classifier
  const wordMatch = converted.match(
    /(တစ်|တ|နှစ်|နှ|သုံး|လေး|ငါး|ခြောက်|ခုနစ်|ခုန်|ရှစ်|ကိုး|ဆယ်)\s*(?:ဘူး|ခု|ထည်|စုံ|စောင်|ချောင်း|လုံး|ကတ်)/
  );
  if (wordMatch && BURMESE_NUMBER_WORDS[wordMatch[1]]) {
    return BURMESE_NUMBER_WORDS[wordMatch[1]];
  }

  // Pattern B: Digits + classifier (e.g. "2 ဘူး", "3 ခု", "5 ထည်", "2 pcs")
  const digitClassifierMatch = converted.match(
    /(\d+)\s*(?:ဘူး|ခု|ထည်|စုံ|စောင်|ချောင်း|လုံး|ကတ်|pcs?|items?|pack|box)/i
  );
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

export function extractCustomerName(text: string, defaultName?: string): string {
  const nameRegex = /(?:အမည်|နာမည်|လက်ခံသူ|Name)\s*[:：\-—]?\s*([A-Za-z\u1000-\u104F\s]+?)(?:[,\n၊။]|$)/i;
  const match = text.match(nameRegex);
  if (match && match[1].trim().length > 1) {
    let raw = match[1].trim();
    // Strip trailing polite Burmese particles: ပါ, ရှင့်, ခင်ဗျာ, နော်
    raw = raw.replace(/\s*(?:ပါ|ရှင့်|ခင်ဗျာ|နော်)+$/g, '').trim();
    if (raw.length > 1) return raw;
  }
  return defaultName || 'Customer';
}

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

export function extractPaymentMethod(
  text: string,
  deliveryInfo: TownshipDeliveryInfo | null
): { paymentMethod?: PaymentMethod; isPrepaidViolation: boolean } {
  const lower = text.toLowerCase();
  let paymentMethod: PaymentMethod | undefined = undefined;
  let isPrepaidViolation = false;

  if (
    lower.includes('kpay') ||
    lower.includes('kbzpay') ||
    lower.includes('ကေပေး') ||
    lower.includes('ကေဖေ')
  ) {
    paymentMethod = 'kpay';
  } else if (
    lower.includes('wavepay') ||
    lower.includes('wave pay') ||
    lower.includes('wave') ||
    lower.includes('ဝေ့ပေး') ||
    lower.includes('ဝေ့ဖေ')
  ) {
    paymentMethod = 'wavepay';
  } else if (
    lower.includes('cod') ||
    lower.includes('cash on delivery') ||
    lower.includes('အိမ်ရောက်ငွေချေ') ||
    lower.includes('အိမ်အရောက်ငွေချေ') ||
    lower.includes('ပစ္စည်းရောက်မှငွေချေ') ||
    lower.includes('ပစ္စည်းရောက်မှငွေရှင်း')
  ) {
    const isPrepaid = deliveryInfo
      ? isRegionalPrepaidOnly(deliveryInfo.nameEn)
      : isRegionalPrepaidOnly(text);
    if (isPrepaid) {
      isPrepaidViolation = true;
      paymentMethod = undefined; // Reject COD for regional cities and highway bus gates
    } else {
      paymentMethod = 'cod';
    }
  }

  return { paymentMethod, isPrepaidViolation };
}

export function extractFullAddress(text: string, deliveryInfo: TownshipDeliveryInfo | null): string {
  const addressRegex = /(?:လိပ်စာ|အိမ်လိပ်စာ|Address)\s*[:：\-—]?\s*([^\n,၊]+)/i;
  const match = text.match(addressRegex);
  if (match && match[1].trim()) {
    return match[1].trim();
  }
  return deliveryInfo ? `${deliveryInfo.nameMm}မြို့နယ်` : '';
}

/**
 * Intelligent Burmese Sales Agent with 5-Attribute Conversational Checkout & Inventory Guard
 */
export async function processCustomerMessage(
  rawInput: string,
  context: AgentContext
): Promise<AgentResponse> {
  const normalizedInput = normalizeBurmese(rawInput);
  const inputLower = normalizedInput.toLowerCase();

  // 1. Classify Intent
  const { intent, confidence } = classifyBurmeseIntent(rawInput);

  // 2. Check Township & Delivery
  const matchedDelivery = lookupTownshipDelivery(normalizedInput);

  // 3. Match Catalog Products
  let matchedProducts = matchCatalogProducts(rawInput, context.products);

  // If no product matched directly from the input text:
  if (matchedProducts.length === 0) {
    // 3a. Check if caller supplied draft items
    if (context.currentDraft?.items && context.currentDraft.items.length > 0) {
      const draftProductIds = context.currentDraft.items.map((it) => it.productId);
      const draftProducts = context.products.filter((p) => draftProductIds.includes(p.id));
      if (draftProducts.length > 0) {
        matchedProducts = draftProducts;
      }
    }
    // 3b. Check conversation history turns in reverse
    else if (context.conversationHistory && context.conversationHistory.length > 0) {
      for (let i = context.conversationHistory.length - 1; i >= 0; i--) {
        const histTurn = context.conversationHistory[i];
        const histMatches = matchCatalogProducts(histTurn.content, context.products);
        if (histMatches.length > 0) {
          matchedProducts = histMatches;
          break;
        }
      }
    }

    // 3c. If only 1 product exists in context catalog, default to it
    if (matchedProducts.length === 0 && context.products.length === 1) {
      matchedProducts = [context.products[0]];
    }

    // 3d. Check Burmese classifier / measure words if multiple products exist
    if (matchedProducts.length === 0 && context.products.length > 1) {
      const classifiers = [
        {
          words: ['ဘူး', 'boo', 'bu'],
          matcher: (p: Product) =>
            p.category?.toLowerCase().includes('skin') ||
            p.category?.toLowerCase().includes('cosmetic') ||
            p.nameMm.includes('ဆီရမ်') ||
            p.nameEn.toLowerCase().includes('serum') ||
            p.nameMm.includes('ခရင်မ်') ||
            p.nameMm.includes('လိမ်းဆေး') ||
            p.nameMm.includes('ဘူး'),
        },
        {
          words: ['ထည်', 'htae', 'hte'],
          matcher: (p: Product) =>
            p.category?.toLowerCase().includes('fashion') ||
            p.category?.toLowerCase().includes('cloth') ||
            p.category?.toLowerCase().includes('traditional') ||
            p.nameMm.includes('ဂါဝန်') ||
            p.nameMm.includes('ပုဆိုး') ||
            p.nameMm.includes('အင်္ကျီ') ||
            p.nameEn.toLowerCase().includes('dress') ||
            p.nameEn.toLowerCase().includes('longyi') ||
            p.nameEn.toLowerCase().includes('silk') ||
            p.nameEn.toLowerCase().includes('shirt'),
        },
        {
          words: ['လုံး', 'lone', 'လွယ်အိတ်', 'အိတ်', 'bag'],
          matcher: (p: Product) =>
            p.category?.toLowerCase().includes('access') ||
            p.category?.toLowerCase().includes('bag') ||
            p.nameMm.includes('အိတ်') ||
            p.nameEn.toLowerCase().includes('bag'),
        },
      ];

      for (const c of classifiers) {
        if (c.words.some((w) => normalizedInput.includes(w) || inputLower.includes(w))) {
          const candidate = context.products.find(c.matcher);
          if (candidate) {
            matchedProducts = [candidate];
            break;
          }
        }
      }
    }
  }

  // 4. Extract 5 Checkout Attributes
  const { paymentMethod, isPrepaidViolation } = extractPaymentMethod(normalizedInput, matchedDelivery);
  const customerPhone = extractCustomerPhone(normalizedInput);
  const customerName = extractCustomerName(normalizedInput, context.customerName);
  const addressText = extractFullAddress(normalizedInput, matchedDelivery);

  // Build items with quantities
  const orderItems: OrderItem[] = matchedProducts.map((p) => {
    const qty = extractQuantity(normalizedInput, p.nameMm);
    return {
      productId: p.id,
      name: p.nameMm,
      quantity: qty,
      priceMmk: p.priceMmk,
    };
  });

  // Calculate pricing
  const subtotalMmk = orderItems.reduce((acc, it) => acc + it.priceMmk * it.quantity, 0);
  const deliveryFeeMmk = matchedDelivery ? matchedDelivery.standardFeeMmk : undefined;
  const totalMmk = deliveryFeeMmk !== undefined ? subtotalMmk + deliveryFeeMmk : subtotalMmk;

  // Determine Order Intent Boolean
  const orderTriggerKeywords = [
    'ဝယ်မယ်', 'ယူမယ်', 'မှာမယ်', 'order', 'ပို့ပေးပါ', 'ဝယ်ချင်လို့', 'အော်ဒါတင်', 'ဝယ်ချင်', 'မှာချင်',
  ];
  const isOrderIntent =
    intent === 'order_intent' ||
    intent === 'checkout_info' ||
    orderTriggerKeywords.some((k) => normalizedInput.includes(k) || inputLower.includes(k));

  // Construct Order Draft
  const orderDraft: Partial<Order> | undefined =
    customerPhone || matchedDelivery || orderItems.length > 0
      ? {
          customerPhone,
          customerName,
          township: matchedDelivery?.nameEn,
          fullAddress: addressText,
          deliveryFeeMmk,
          subtotalMmk: subtotalMmk > 0 ? subtotalMmk : undefined,
          totalMmk: totalMmk > 0 ? totalMmk : undefined,
          paymentMethod,
          items: orderItems,
        }
      : undefined;

  // Determine Missing Attributes for Checkout
  const missingAttributes: ('product' | 'name' | 'phone' | 'township' | 'payment')[] = [];
  if (orderItems.length === 0) missingAttributes.push('product');
  if (!customerPhone) missingAttributes.push('phone');
  if (!matchedDelivery) missingAttributes.push('township');
  if (!paymentMethod) missingAttributes.push('payment');

  const isCheckoutComplete =
    orderItems.length > 0 &&
    !!customerPhone &&
    !!matchedDelivery &&
    !!paymentMethod &&
    !isPrepaidViolation;

  // --------------------------------------------------------------------------
  // ORDER FINALIZATION & STOCK GUARD
  // --------------------------------------------------------------------------
  if (isCheckoutComplete && matchedDelivery && paymentMethod) {
    // Step 0: Check Tenant Monthly Order Quota
    const quota = await db.checkTenantOrderQuota(context.shop.id);
    if (!quota.canCreateOrder) {
      const quotaReply = `မင်္ဂလာပါရှင့် ${customerName} 🌸\nဆိုင်၏ လစဉ် အော်ဒါ လက်ခံနိုင်မှု ပမာဏ (${quota.plan.toUpperCase()} Plan) ပြည့်သွားပါသဖြင့် ဆိုင်ရှင်ထံ တိုက်ရိုက် ဆက်သွယ်ပေးပါရှင့် 🙏💕`;
      return {
        replyText: quotaReply,
        replyTextMm: quotaReply,
        intent: 'order_intent',
        confidence: 0.95,
        detectedTownship: matchedDelivery.nameEn,
        deliveryFeeMmk: matchedDelivery.standardFeeMmk,
        isOrderIntent: true,
        detectedItems: orderItems.map((it) => ({ productId: it.productId, quantity: it.quantity })),
        orderDraft,
      };
    }

    // Step 1: Pre-decrement Inventory Guard
    for (const item of orderItems) {
      const product = context.products.find((p) => p.id === item.productId);
      const available = product ? product.stockQuantity : 0;
      if (!product || available < item.quantity) {
        const name = product ? product.nameMm : item.name;
        const deficitReply = `စိတ်မကောင်းပါဘူးရှင့်၊ "${name}" သည် လက်ကျန် (${available}) ခုသာ ရှိပါသဖြင့် မှာယူလိုသော အရေအတွက် (${item.quantity}) ခု မလုံလောက်ပါရှင့်။`;
        return {
          replyText: deficitReply,
          replyTextMm: deficitReply,
          intent: 'stock_inquiry',
          confidence: 0.95,
          detectedTownship: matchedDelivery.nameEn,
          deliveryFeeMmk: matchedDelivery.standardFeeMmk,
          isOrderIntent: true,
          detectedItems: orderItems.map((it) => ({ productId: it.productId, quantity: it.quantity })),
          orderDraft,
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
      customerName,
      customerPhone,
      township: matchedDelivery.nameEn,
      fullAddress: addressText,
      items: orderItems,
      subtotalMmk,
      deliveryFeeMmk: matchedDelivery.standardFeeMmk,
      totalMmk: subtotalMmk + matchedDelivery.standardFeeMmk,
      paymentMethod,
      status: paymentMethod === 'cod' ? 'confirmed' : 'pending_slip',
    });

    // Step 4: Instant Telegram Alert Dispatch
    await sendTelegramOrderAlert(context.shop, createdOrder, context.products);

    // Step 5: Format Standard Burmese Order Voucher (ဘောက်ချာ)
    const voucherText = formatOrderVoucher(createdOrder, context.shop, matchedDelivery);

    return {
      replyText: voucherText,
      replyTextMm: voucherText,
      intent: 'order_intent',
      confidence: 0.98,
      detectedTownship: matchedDelivery.nameEn,
      deliveryFeeMmk: matchedDelivery.standardFeeMmk,
      isOrderIntent: true,
      detectedItems: orderItems.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      orderDraft: createdOrder,
      completedOrder: createdOrder,
      voucherText,
    };
  }

  // --------------------------------------------------------------------------
  // 3-TIER ZERO-MARGINAL-COST AI ROUTER
  // Tier 0: Local Heuristic NLP ($0.00 cost, <1ms) handles high-confidence intents.
  // Tier 1 / 2: Gemini 2.5 Flash with token budget (max 150 tokens) for ambiguous chat or merchant BYOK.
  // --------------------------------------------------------------------------
  const apiKey = context.shop.geminiApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const isMerchantByok = !!context.shop.geminiApiKey;
  const isAmbiguousQuery = confidence < 0.8 || intent === 'general_inquiry';

  if (apiKey && !isPrepaidViolation && (isMerchantByok || isAmbiguousQuery)) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const catalogContext = context.products
        .map(
          (p) =>
            `- [${p.sku}] ${p.nameMm} (${p.nameEn}): ${p.priceMmk.toLocaleString()} MMK (Stock: ${
              p.stockQuantity > 0 ? `${p.stockQuantity} in-stock` : 'OUT OF STOCK'
            })`
        )
        .join('\n');

      const systemInstruction = `You are a polite, helpful Burmese online shop sales assistant (မင်မင်) for "${context.shop.name}".
Language rule: ALWAYS reply in standard Myanmar Unicode with a polite, warm tone using 'ရှင်' or 'ခင်ဗျာ'. Keep replies concise (under 3 sentences).
Shop Payment Details: KPay (${context.shop.kpayNumber} - ${context.shop.kpayName}), WavePay (${context.shop.waveNumber} - ${context.shop.waveName}), Cash on Delivery (COD) for Yangon/Mandalay.

Current Product Catalog & Stock:
${catalogContext}

Delivery Fee Knowledge:
- Yangon downtown/inner: 2,500 - 3,500 MMK (1-2 days, COD available)
- Mandalay: 3,000 - 3,500 MMK (1-2 days, COD available)
- Other States/Highway express gates: 3,500 - 5,500 MMK (Prepaid KPay only)

Customer Name: ${context.customerName || 'Customer'}
Customer Intent Detected: ${intent}`;

      const history = context.conversationHistory || [];
      const contents = [
        ...history.map((h) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }],
        })),
        { role: 'user', parts: [{ text: normalizedInput }] },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents as any,
        config: { systemInstruction, temperature: 0.3, maxOutputTokens: 150 },
      });

      const replyText = response.text || '';
      return {
        replyText,
        replyTextMm: replyText,
        intent,
        confidence,
        detectedTownship: matchedDelivery?.nameEn,
        deliveryFeeMmk: matchedDelivery?.standardFeeMmk,
        isOrderIntent,
        detectedItems: orderItems.map((it) => ({ productId: it.productId, quantity: it.quantity })),
        orderDraft,
      };
    } catch (err) {
      console.warn('Gemini API call fallback to local rule-engine:', err);
    }
  }

  // --------------------------------------------------------------------------
  // DETERMINISTIC LOCAL RULE-ENGINE FALLBACK (<1ms execution)
  // --------------------------------------------------------------------------
  let reply = `မင်္ဂလာပါရှင့် ${context.customerName || 'လူကြီးမင်း'} 🌸\n\n`;

  // Case A: Regional Prepaid Violation (Customer attempted COD for regional / bus gate)
  if (isPrepaidViolation) {
    const locName = matchedDelivery ? `${matchedDelivery.nameMm} (${matchedDelivery.nameEn})` : 'နယ်မြို့';
    reply += `စိတ်မကောင်းပါဘူးရှင့်။ ${locName} မြို့နယ် (သို့မဟုတ် အဝေးပြေးကားဂိတ်) အတွက် အိမ်အရောက်ငွေချေ (COD) စနစ် မရရှိနိုင်ပါရှင့် (Prepaid Only)။\n`;
    reply += `100% KPay သို့မဟုတ် WavePay ဖြင့် ကြိုတင်ငွေလွှဲပေးချေရပါသည်ရှင့်။\n\n`;
    if (context.shop.kpayNumber) {
      reply += `KPay: ${context.shop.kpayNumber} (${context.shop.kpayName})\n`;
    }
    if (context.shop.waveNumber) {
      reply += `WavePay: ${context.shop.waveNumber} (${context.shop.waveName})\n`;
    }
    reply += `\nKPay သို့မဟုတ် WavePay ဖြင့် ငွေလွှဲမှာယူလိုပါသလားရှင့်? 💕`;
  }
  // Case B: Greeting with no specific product/delivery inquiry
  else if (intent === 'greeting' && orderItems.length === 0 && !matchedDelivery) {
    reply += `${context.shop.name} မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်ရှင့် 💕\n`;
    reply += `ဘာပစ္စည်းလေးများ ကြည့်ရှုလိုပါသလဲရှင့်?\n`;
    reply += `ဆိုင်ရှိ ပစ္စည်းများ၊ ဈေးနှုန်း နှင့် မြို့နယ်ပို့ဆောင်ခများကို မေးမြန်းနိုင်ပါတယ်ရှင့် ✨`;
  }
  // Case C: Matched Products Display
  else if (orderItems.length > 0 && !isOrderIntent) {
    reply += `မင်မင်တို့ဆိုင်မှာ စုံစမ်းမေးမြန်းထားတဲ့ ပစ္စည်းအသေးစိတ်လေးပါရှင့် -\n\n`;
    matchedProducts.forEach((p, idx) => {
      const stockStatus = formatStockStatus(p.stockQuantity);
      reply += `${idx + 1}. **${p.nameMm}** (${p.nameEn})\n   💰 ဈေးနှုန်း: ${p.priceMmk.toLocaleString()} ကျပ်\n   📦 လက်ကျန်: ${stockStatus}\n\n`;
    });

    if (matchedDelivery) {
      const isPrepaid = isRegionalPrepaidOnly(matchedDelivery.nameEn) || !matchedDelivery.codAvailable;
      reply += `📍 **${matchedDelivery.nameMm} (${matchedDelivery.nameEn}) မြို့နယ် ပို့ဆောင်ခ**\n`;
      reply += `• ပို့ဆောင်ခ: ${matchedDelivery.standardFeeMmk.toLocaleString()} ကျပ်\n`;
      reply += `• ကြာချိန်: ${matchedDelivery.estDays}\n`;
      reply += `• ငွေချေစနစ်: ${
        isPrepaid ? 'KPay/WavePay ကြိုလွှဲစနစ်သာ ရရှိပါသည် (Prepaid Only)' : 'အိမ်အရောက်ငွေချေ (COD) ရရှိပါသည်'
      }\n\n`;
    }
  }
  // Case D: Order Intent or Incomplete Checkout Information
  else if (isOrderIntent) {
    if (missingAttributes.length > 0) {
      reply = formatMissingAttributesPrompt(
        missingAttributes,
        context.shop,
        matchedDelivery,
        context.customerName
      );
    } else {
      reply += `✨ **အော်ဒါအတည်ပြု မှာယူရန်အတွက်** အောက်ပါ အချက်အလက်လေးများ ပို့ပေးပါရှင့် -\n`;
      reply += `၁။ လက်ခံမည့် အမည်\n`;
      reply += `၂။ ဖုန်းနံပါတ် (09-xxx)\n`;
      reply += `၃။ ပို့ဆောင်ရမည့် မြို့နယ် နှင့် အသေးစိတ်လိပ်စာ\n`;
      reply += `၄။ ငွေချေနည်းလမ်း (KPay / WavePay / အိမ်အရောက်ငွေချေ COD)\n\n`;
      if (context.shop.kpayNumber) {
        reply += `(KPay ဖြင့်လွှဲယူလိုပါက KPay: ${context.shop.kpayNumber} - ${context.shop.kpayName} သို့ လွှဲပြီး ပြေစာလေး ပို့ပေးထားလို့ရပါတယ်ရှင့် 💕)`;
      }
    }
  }
  // Case E: Delivery Inquiry Only
  else if (matchedDelivery) {
    const isPrepaid = isRegionalPrepaidOnly(matchedDelivery.nameEn) || !matchedDelivery.codAvailable;
    reply += `📍 **${matchedDelivery.nameMm} (${matchedDelivery.nameEn}) မြို့နယ် ပို့ဆောင်ခ**\n`;
    reply += `• ပို့ဆောင်ခ: ${matchedDelivery.standardFeeMmk.toLocaleString()} ကျပ်\n`;
    reply += `• ကြာချိန်: ${matchedDelivery.estDays}\n`;
    reply += `• ငွေချေစနစ်: ${
      isPrepaid ? 'KPay/WavePay ကြိုလွှဲစနစ်သာ ရရှိပါသည် (Prepaid Only)' : 'အိမ်အရောက်ငွေချေ (COD) ရရှိပါသည်'
    }\n\n`;
  }
  // Case F: Payment Inquiry
  else if (intent === 'payment_inquiry') {
    reply += `💳 **ငွေပေးချေမှု နည်းလမ်းများ**\n`;
    if (context.shop.kpayNumber) reply += `• KPay: ${context.shop.kpayNumber} (${context.shop.kpayName})\n`;
    if (context.shop.waveNumber) reply += `• WavePay: ${context.shop.waveNumber} (${context.shop.waveName})\n`;
    reply += `• ရန်ကုန်နှင့် မန္တလေးမြို့တွင်း အိမ်အရောက်ငွေချေ (COD) ရရှိပါသည်ရှင့် 💕\n\n`;
  }
  // Case G: Human Takeover
  else if (intent === 'human_takeover') {
    reply += `ဟုတ်ကဲ့ပါရှင့်၊ ဆိုင်တာဝန်ခံ မင်မင်ထံသို့ ချိတ်ဆက်ပေးထားပါသည်ရှင့်။ ခေတ္တစောင့်ဆိုင်းပေးပါနော် 💕\n\n`;
  }
  // Case H: General Inquiry fallback
  else {
    reply += `မင်မင်တို့ဆိုင်မှ ကြိုဆိုပါတယ်ရှင့်။ ဘာပစ္စည်းလေး ကြည့်ရှုလိုပါသလဲရှင့်?\n`;
    reply += `ဆိုင်ရှိ ပစ္စည်းများ၊ ဈေးနှုန်း နှင့် မြို့နယ်ပို့ဆောင်ခများကို မေးမြန်းနိုင်ပါတယ်ရှင် 💕`;
  }

  return {
    replyText: reply,
    replyTextMm: reply,
    intent,
    confidence,
    detectedTownship: matchedDelivery?.nameEn,
    deliveryFeeMmk: matchedDelivery?.standardFeeMmk,
    isOrderIntent,
    detectedItems: orderItems.map((it) => ({ productId: it.productId, quantity: it.quantity })),
    orderDraft,
  };
}
