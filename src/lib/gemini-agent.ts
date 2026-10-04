import { normalizeBurmese } from './burmese-converter';
import { lookupTownshipDelivery, MYANMAR_DELIVERY_MATRIX } from './myanmar-townships';
import { Product, Shop, Order } from '@/types';

export interface AgentContext {
  shop: Shop;
  products: Product[];
  customerName: string;
  conversationHistory: { role: 'user' | 'model'; content: string }[];
}

export interface AgentResponse {
  replyTextMm: string;
  detectedTownship?: string;
  detectedItems?: { productId: string; quantity: number }[];
  deliveryFeeMmk?: number;
  isOrderIntent: boolean;
  orderDraft?: Partial<Order>;
}

/**
 * Intelligent Burmese Sales Agent with Catalog & Township Grounding
 */
export async function processCustomerMessage(
  rawInput: string,
  context: AgentContext
): Promise<AgentResponse> {
  const normalizedInput = normalizeBurmese(rawInput);
  const inputLower = normalizedInput.toLowerCase();

  // 1. Check Township & Delivery
  let matchedDelivery = null;
  for (const t of MYANMAR_DELIVERY_MATRIX) {
    if (inputLower.includes(t.nameEn.toLowerCase()) || normalizedInput.includes(t.nameMm)) {
      matchedDelivery = t;
      break;
    }
  }

  // 2. Check Product Matches
  const matchedProducts: Product[] = [];
  for (const p of context.products) {
    const pNameMm = p.nameMm.toLowerCase();
    const pNameEn = p.nameEn.toLowerCase();
    const pSku = p.sku.toLowerCase();
    const pCategory = p.category.toLowerCase();

    // Check keywords (e.g. serum, lip tint, bag, dress, sunscreen, နှုတ်ခမ်းနီ, အိတ်, ဂါဝန်)
    const keywords = [
      ...pNameEn.split(' '),
      ...pNameMm.split(' '),
      pSku,
      pCategory,
    ].filter((k) => k.length > 2);

    const isMatch =
      inputLower.includes(pNameEn) ||
      normalizedInput.includes(p.nameMm) ||
      keywords.some((k) => inputLower.includes(k.toLowerCase()));

    if (isMatch) {
      matchedProducts.push(p);
    }
  }

  // 3. Detect Order Intent
  const orderKeywords = ['ဝယ်မယ်', 'ယူမယ်', 'မှာမယ်', 'order', 'ပို့ပေးပါ', 'ဝယ်ချင်လို့', 'အော်ဒါတင်'];
  const isOrderIntent = orderKeywords.some((k) => normalizedInput.includes(k) || inputLower.includes(k));

  // 4. Extract Myanmar Phone Number
  const phoneMatch = normalizedInput.match(/(09\d{7,9}|\+959\d{7,9}|959\d{7,9})/);
  const customerPhone = phoneMatch ? phoneMatch[0] : undefined;

  // 5. If Google Gemini API Key is available, invoke Gemini Flash
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (apiKey) {
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
Language rule: ALWAYS reply in standard Myanmar Unicode with a polite, warm tone using 'ရှင်' or 'ခင်ဗျာ'.
Shop Payment Details: KPay (${context.shop.kpayNumber} - ${context.shop.kpayName}), WavePay (${context.shop.waveNumber} - ${context.shop.waveName}), Cash on Delivery (COD) for Yangon/Mandalay.

Current Product Catalog & Stock:
${catalogContext}

Delivery Fee Knowledge:
- Yangon downtown/inner: 2,500 - 3,500 MMK (1-2 days, COD available)
- Mandalay: 3,000 - 3,500 MMK (1-2 days, COD available)
- Other States/Highway express gates: 3,500 - 5,500 MMK (Prepaid KPay only)

Customer Name: ${context.customerName}
Instructions:
1. Always state current stock availability and exact price in MMK.
2. If customer asks about delivery, check their township and provide exact delivery fee & delivery duration.
3. If customer wants to buy (order intent), politely ask for: 
   (၁) အမည် (Name)
   (၂) ဆက်သွယ်ရမည့် ဖုန်းနံပါတ် (Phone 09-xxx)
   (၃) ပို့ဆောင်ပေးရမည့် လိပ်စာ နှင့် မြို့နယ် (Township & Address)
   (၄) ငွေချေနည်းလမ်း (KPay / WavePay / အိမ်အရောက်ငွေချေ COD)
4. Keep the answer clear, structured with emojis, and welcoming.`;

      const contents = [
        ...context.conversationHistory.map((h) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }],
        })),
        {
          role: 'user',
          parts: [{ text: normalizedInput }],
        },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents as any,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const replyText = response.text || '';
      return {
        replyTextMm: replyText,
        detectedTownship: matchedDelivery?.nameEn,
        deliveryFeeMmk: matchedDelivery?.standardFeeMmk,
        isOrderIntent,
        detectedItems: matchedProducts.map((p) => ({ productId: p.id, quantity: 1 })),
      };
    } catch (err) {
      console.warn('Gemini API call fallback to local rule-engine:', err);
    }
  }

  // 6. Intelligent Local Rule-Engine Fallback (Production-ready instant replies)
  let reply = `မင်္ဂလာပါရှင့် ${context.customerName} 🌸\n\n`;

  if (matchedProducts.length > 0) {
    reply += `မင်မင်တို့ဆိုင်မှာ စုံစမ်းမေးမြန်းထားတဲ့ ပစ္စည်းအသေးစိတ်လေးပါရှင့် -\n\n`;
    matchedProducts.forEach((p, idx) => {
      const stockStatus =
        p.stockQuantity > 0
          ? `✅ In-stock (${p.stockQuantity} ခုကျန်)`
          : `❌ လက်ရှိ ပစ္စည်းပြတ်နေပါသည် (Out of stock)`;
      reply += `${idx + 1}. **${p.nameMm}**\n   💰 ဈေးနှုန်း: ${p.priceMmk.toLocaleString()} ကျပ်\n   📦 လက်ကျန်: ${stockStatus}\n\n`;
    });
  }

  if (matchedDelivery) {
    reply += `📍 **${matchedDelivery.nameMm} (${matchedDelivery.nameEn}) မြို့နယ် ပို့ဆောင်ခ**\n`;
    reply += `• ပို့ဆောင်ခ: ${matchedDelivery.standardFeeMmk.toLocaleString()} ကျပ်\n`;
    reply += `• ကြာချိန်: ${matchedDelivery.estDays}\n`;
    reply += `• ငွေချေစနစ်: ${matchedDelivery.codAvailable ? 'အိမ်အရောက်ငွေချေ (COD) ရရှိပါသည်' : 'KPay/WavePay ကြိုလွှဲစနစ်သာ ရရှိပါသည်'}\n\n`;
  }

  if (isOrderIntent) {
    reply += `✨ **အော်ဒါအတည်ပြု မှာယူရန်အတွက်** အောက်ပါ အချက်အလက်လေးများ ပို့ပေးပါရှင့် -\n`;
    reply += `၁။ လက်ခံမည့် အမည်\n`;
    reply += `၂။ ဖုန်းနံပါတ် (09-xxx)\n`;
    reply += `၃။ ပို့ဆောင်ရမည့် မြို့နယ် နှင့် အသေးစိတ်လိပ်စာ\n`;
    reply += `၄။ ငွေချေနည်းလမ်း (KPay / WavePay / အိမ်အရောက်ငွေချေ COD)\n\n`;
    reply += `(KPay ဖြင့်လွှဲယူလိုပါက KPay: ${context.shop.kpayNumber} - ${context.shop.kpayName} သို့ လွှဲပြီး ပြေစာလေး ပို့ပေးထားလို့ရပါတယ်ရှင့် 💕)`;
  } else if (matchedProducts.length === 0 && !matchedDelivery) {
    reply += `မင်မင်တို့ဆိုင်မှ ကြိုဆိုပါတယ်ရှင့်။ ဘာပစ္စည်းလေး ကြည့်ရှုလိုပါသလဲရှင့်?\nဆိုင်ရှိ ပစ္စည်းများ၊ ဈေးနှုန်း နှင့် မြို့နယ်ပို့ဆောင်ခများကို မေးမြန်းနိုင်ပါတယ်ရှင် 💕`;
  }

  return {
    replyTextMm: reply,
    detectedTownship: matchedDelivery?.nameEn,
    deliveryFeeMmk: matchedDelivery?.standardFeeMmk,
    isOrderIntent,
    detectedItems: matchedProducts.map((p) => ({ productId: p.id, quantity: 1 })),
  };
}
