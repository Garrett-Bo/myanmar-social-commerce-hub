# Milestone 4 Handoff Report: Burmese AI Sales Closing Engine & Intent Classification

**Agent**: `explorer_m4_1`  
**Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1`  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  
**Mission**: Requirements analysis and implementation blueprint for Burmese & Burglish intent classification, product catalog lookup, MMK formatting, dual execution mode, and zero-chat invariant in `src/lib/gemini-agent.ts`.

---

## 1. Observation

### 1.1 Existing Implementation of `src/lib/gemini-agent.ts`
In `src/lib/gemini-agent.ts` (lines 6–20):
```typescript
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
```
In `src/lib/gemini-agent.ts` (lines 38–60), product matching is currently rudimentary:
```typescript
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
```
In `src/lib/gemini-agent.ts` (lines 62–65), intent detection only checks a single hard-coded keyword list for buy intent:
```typescript
  // 3. Detect Order Intent
  const orderKeywords = ['ဝယ်မယ်', 'ယူမယ်', 'မှာမယ်', 'order', 'ပို့ပေးပါ', 'ဝယ်ချင်လို့', 'အော်ဒါတင်'];
  const isOrderIntent = orderKeywords.some((k) => normalizedInput.includes(k) || inputLower.includes(k));
```
In `src/lib/gemini-agent.ts` (lines 79–151), Gemini invocation uses `@google/genai` with model `gemini-2.5-flash`, catching errors to fall back to lines 153–185:
```typescript
  // 5. If Google Gemini API Key is available, invoke Gemini Flash
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
```

### 1.2 Interface Contract in `PROJECT.md`
In `PROJECT.md` (lines 110–114):
```markdown
### M4 ↔ Database & Channel (AI Sales Engine)
- `processCustomerMessage(messageText: string, context: MessageContext): Promise<AgentResponse>`
  - `MessageContext`: `{ shop: Shop; products: Product[]; channel: ChannelConnection; senderPlatformId: string }`
  - `AgentResponse`: `{ replyText: string; intent: string; orderDraft?: Partial<Order>; completedOrder?: Order; confidence: number }`
```

### 1.3 Callers in Social Webhook Routes and Existing Tests
Direct inspection reveals that multiple existing routes and tests call `processCustomerMessage` and expect specific fields:
1. `src/app/api/webhooks/facebook/route.ts` (line 71): reads `aiResponse.replyTextMm`.
2. `src/app/api/webhooks/tiktok/route.ts` (line 69): reads `aiResponse.replyTextMm`.
3. `src/app/page.tsx` (lines 173, 189): reads `response.replyTextMm`.
4. `scripts/adversarial_m2_nlp_probe.ts` (lines 304–326): verifies `response1.detectedTownship === 'Sanchaung'`, `response1.deliveryFeeMmk === 2500`, `response1.detectedItems?.length === 1`, `response1.replyTextMm.includes('2,500 ကျပ်')`, `response2.isOrderIntent === true`, `response2.orderDraft?.customerPhone === '09798765432'`.

### 1.4 Baseline Test Execution
Executing `npm.cmd test` completes with exit code 0 across all 3 pre-existing test suites:
- `scripts/verify_m1_persistence.ts`: PASSED
- `scripts/verify_m2_nlp_logistics.ts`: 127/127 PASSED
- `scripts/adversarial_zero_chat_probe.ts`: 106/106 PASSED

---

## 2. Logic Chain

1. **Dual Representation Contract (Backward & Forward Compatibility)**:
   - Callers currently read `replyTextMm`, while `PROJECT.md` M4 contract defines `replyText`, `intent: string`, and `confidence: number`.
   - Therefore, `AgentResponse` must expose **both** `replyText` and `replyTextMm` (where `replyTextMm === replyText`), alongside `intent: IntentType`, `confidence: number`, `isOrderIntent: boolean`, `detectedTownship`, `deliveryFeeMmk`, `detectedItems`, `orderDraft`, and `completedOrder`.
   - `AgentContext` should make `customerName`, `conversationHistory`, `channel`, and `senderPlatformId` optional/flexible so callers from `facebook/route.ts`, `tiktok/route.ts`, `chat/route.ts`, and test scripts all conform without TypeScript errors.

2. **Classification Architecture Separation**:
   - `gemini-agent.ts` currently mixes token matching, Gemini calling, and fallback reply string assembly in a single procedural block.
   - For modularity, testability, and sub-millisecond execution, intent classification must be extracted into a dedicated, exported pure function:
     `export function classifyBurmeseIntent(rawInput: string): IntentClassificationResult`.
   - This allows unit tests in `scripts/verify_m4_sales_closing.ts` to test 50+ intent variations independently of catalog state.

3. **Colloquialism & Burglish Mapping**:
   - Burmese social commerce users communicate across three orthographic modalities:
     1. Standard Unicode (`မင်္ဂလာပါ`, `ဈေးဘယ်လောက်လဲ`, `ပစ္စည်းရှိလား`, `ပို့ခ`, `ဝယ်မယ်`)
     2. Legacy Zawgyi (`မဂၤလာပါ`, `ေစ်းဘယ္ေလာက္လဲ`, `ပစၥည္းရွိလား`)
     3. Burglish (Romanized Burmese: `bl lout ll`, `instock shi lr`, `kpay ya lr`, `dali charge`, `order tin ml`, `yuu ml`)
   - Running `normalizeBurmese(rawInput)` standardizes Zawgyi and canonicalizes Unicode diacritics first.
   - A subsequent multi-pattern regex scoring engine resolves colloquial Burglish and Unicode variations to canonical intents with high confidence (0.85–0.98).

4. **Product Catalog Matching Enhancement**:
   - Burmese has no spaces between words (e.g. `ဗီတာမင်စီဆီရမ်`). Simple `pNameMm.split(' ')` fails if product names lack spaces.
   - A dedicated `export function matchCatalogProducts(query: string, products: Product[]): Product[]` must combine:
     - Exact name / SKU matching
     - Burmese keyword/stem matching (`ဆီရမ်`, `နှုတ်ခမ်းနီ`, `မိတ်ကပ်`, `ပုဆိုး`, `လုံချည်`, `ဂါဝန်`, `အင်္ကျီ`, `ဖိနပ်`, `လွယ်အိတ်`, `နေကာခရင်မ်`)
     - Burglish transliterated product keywords (`serum`, `lip tint`, `lipstick`, `paso`, `longyi`, `dress`, `bag`, `shoes`, `sunscreen`)
     - Clean token deduplication and relevance ranking.

5. **Deterministic Offline Fallback**:
   - Automated tests run in offline CI environments without `GEMINI_API_KEY`.
   - The local rule engine must deterministically generate complete, polite Burmese responses with MMK prices, live stock status, township delivery fees, and order collection steps.
   - Response latency for local rule execution is < 1ms, effortlessly beating the < 3s SLA.

6. **Zero-Chat Storage Invariant**:
   - `gemini-agent.ts` only consumes `AgentContext` ephemerally in-memory.
   - It performs zero calls to `db` for messages or conversations (which don't exist in `db.ts` anyway).
   - Only finalized orders are written to `db.orders` when checkout is completed (handled via `explorer_m4_3` scope).

---

## 3. Caveats

1. **Scope Boundaries with Peer Explorers**:
   - `explorer_m4_1` designs intent classification, Burglish mapping, product matching, MMK formatting, and offline rule fallback.
   - `explorer_m4_2` focuses on 5-attribute checkout extraction, missing attribute prompt dialogue, and voucher formatting.
   - `explorer_m4_3` focuses on `db.createOrder`, atomic stock decrement, `telegram.ts` alerts, and `scripts/verify_m4_sales_closing.ts`.
   - All interfaces must align so peer implementations fit together seamlessly into `src/lib/gemini-agent.ts`.

2. **Zawgyi Normalization Prerequisite**:
   - Intent matching must run on `normalizeBurmese(rawInput)` before regex evaluation. If raw Zawgyi text is evaluated directly, Unicode regex patterns will fail.

3. **Multi-Intent Ambiguity**:
   - Messages like *"ဆီရမ် ၁ ဘူး ဝယ်မယ် ဖုန်း ၀၉-၇၉၈-၇၆၅-၄၃၂ စမ်းချောင်း"* contain both product inquiry, order intent, and checkout info.
   - Priority hierarchy must resolve order/checkout intent first when contact/address details are provided, while ensuring `isOrderIntent === true` and matched products are retained.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Type Definitions for `src/lib/gemini-agent.ts`

```typescript
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
}

export interface AgentResponse {
  replyText: string;
  replyTextMm: string; // Backward-compatible alias for existing routes and tests
  intent: IntentType;
  confidence: number;
  detectedTownship?: string;
  detectedItems?: { productId: string; quantity: number }[];
  deliveryFeeMmk?: number;
  isOrderIntent: boolean;
  orderDraft?: Partial<Order>;
  completedOrder?: Order;
}
```

### 4.2 Burmese & Burglish Intent Classification Rules

| Intent | Burmese (Unicode & Zawgyi) Patterns | Burglish & Colloquial Patterns | Priority / Confidence |
|---|---|---|---|
| `human_takeover` | လူနဲ့ပြောချင်တယ်, လူခေါ်ပေးပါ, မင်မင်ခေါ်ပေး, လူစစ်စစ်, admin ခေါ် | `human agent`, `talk to human`, `real person`, `call admin`, `agent plz` | High (0.95) |
| `slip_inquiry` | စလစ်, ပြေစာ, ငွေလွှဲပြေစာ, လွှဲပြီးပါပြီ, kpay လွှဲပြီး, wave လွှဲပြီး, screenshot ပို့ထား | `slip`, `slip po`, `kpay lwe pee`, `wave lwe pee`, `transfer done`, `screenshot` | High (0.95) |
| `checkout_info` | Detection of phone `09XXXXXXXXX` + Township / Address (`လမ်း`, `တိုက်`, `အမှတ်`, `ရပ်ကွက်`) | `ph: 09...`, `deli to...`, `address: ...` | High (0.95) |
| `order_intent` | ဝယ်မယ်, ဝယ်ယူမယ်, ဝယ်ချင်လို့, ယူမယ်, မှာမယ်, မှာချင်လို့, အော်ဒါတင်မယ်, ပို့ပေးပါ | `order`, `order ml`, `order tin ml`, `wwe ml`, `we ml`, `yuu ml`, `yu ml`, `mhar ml`, `buy`, `take 1` | High (0.92) |
| `discount_inquiry` | လျှော့ပေးလား, ဈေးလျှော့, စျေးလျှော့, discount ရှိလား, promotion ရှိလား, ပရိုမိုးရှင်း | `discount`, `discount shi lr`, `promo`, `promotion`, `shout pay lr` | Medium (0.90) |
| `delivery_inquiry` | ပို့ခဘယ်လောက်လဲ, ပို့ခ, ဒေလီခ, မြို့နယ်ပို့ပေးလား, အိမ်အရောက်ပို့လား, ကားဂိတ်ပို့လား | `deli`, `deli fee`, `deli charge`, `dali charge`, `deli bl lout`, `deli kha`, `cod ya lr` | Medium (0.90) |
| `payment_inquiry` | kpay ရလား, wave ရလား, kbzpay, wavepay, ဘယ်လိုရှင်းရမလဲ, ငွေဘယ်လိုချေရမလဲ | `kpay ya lr`, `kpay r lr`, `wave ya lr`, `bhr lo shin ya ml`, `kpay acc`, `wave acc` | Medium (0.90) |
| `stock_inquiry` | ပစ္စည်းရှိလား, ရှိသေးလား, ပစ္စည်းကျန်လား, stock ကျန်လား, စတော့ကျန်လား, out of stock | `instock`, `in stock`, `instock shi lr`, `shi lr`, `shi thay lr`, `stock kyan lr`, `oos` | Medium (0.88) |
| `price_inquiry` | ဈေးဘယ်လောက်လဲ, စျေးဘယ်လောက်လဲ, ဘယ်လောက်လဲ, ဘယ်ဈေးလဲ, ဈေးလေးသိချင်လို့ | `price`, `price plx`, `price plz`, `price please`, `bl lout ll`, `bl lout le`, `ze bl lout` | Medium (0.88) |
| `greeting` | မင်္ဂလာပါ, ဟဲလို, ဟိုင်း, နေကောင်းလား | `hi`, `hello`, `mingalarpar`, `mingalaba`, `mglpar`, `mglba`, `heyy` | High (0.95) |
| `general_inquiry` | Catch-all default when no specific commercial patterns match | Any general query | Baseline (0.50) |

### 4.3 Proposed Implementation: `classifyBurmeseIntent`

```typescript
export function classifyBurmeseIntent(rawInput: string): IntentClassificationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { intent: 'general_inquiry', confidence: 0.5, matchedKeywords: [] };
  }

  const normalized = normalizeBurmese(rawInput);
  const inputLower = normalized.toLowerCase();
  const rawLower = rawInput.toLowerCase();
  const withDigits = convertBurmeseDigits(normalized);

  // 1. Human Takeover
  const humanPatterns = ['လူနဲ့ပြော', 'လူခေါ်ပေး', 'မင်မင်ခေါ်', 'agent', 'admin', 'လူစစ်စစ်', 'human agent', 'talk to human', 'real person'];
  for (const p of humanPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'human_takeover', confidence: 0.95, matchedKeywords: [p] };
    }
  }

  // 2. Slip & Payment Confirmation
  const slipPatterns = ['စလစ်', 'ပြေစာ', 'လွှဲပြီးပါပြီ', 'လွှဲပြီး', 'kpay လွှဲ', 'wave လွှဲ', 'slip', 'transfer done', 'paid', 'screenshot'];
  for (const p of slipPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'slip_inquiry', confidence: 0.95, matchedKeywords: [p] };
    }
  }

  // 3. Checkout Information Detection (Phone + Address/Township)
  const phoneMatch = withDigits.match(/(?:\+?95\s*0?9|0095\s*9|09|9)[0-9\s.-]{7,15}/);
  const hasPhone = phoneMatch && normalizeMyanmarPhone(phoneMatch[0]).length >= 9;
  const deliveryMatch = lookupTownshipDelivery(normalized);
  const addressKeywords = ['လမ်း', 'တိုက်', 'အမှတ်', 'ရပ်ကွက်', 'အိမ်နံပါတ်', 'road', 'street', 'ward', 'township'];
  const hasAddress = addressKeywords.some((k) => inputLower.includes(k) || rawLower.includes(k));

  if (hasPhone && (deliveryMatch || hasAddress)) {
    return { intent: 'checkout_info', confidence: 0.95, matchedKeywords: ['phone', deliveryMatch ? deliveryMatch.nameEn : 'address'] };
  }

  // 4. Discount Inquiry
  const discountPatterns = ['လျှော့ပေးလား', 'ဈေးလျှော့', 'စျေးလျှော့', 'discount', 'promotion', 'ပရိုမိုးရှင်း', 'promo', 'shout pay'];
  for (const p of discountPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'discount_inquiry', confidence: 0.9, matchedKeywords: [p] };
    }
  }

  // 5. Order / Buy Intent
  const orderPatterns = [
    'ဝယ်မယ်', 'ဝယ်ယူမယ်', 'ဝယ်ချင်', 'ယူမယ်', 'မှာမယ်', 'မှာချင်', 'အော်ဒါတင်', 'အော်ဒါမှာ', 'ပို့ပေးပါ',
    'order', 'order ml', 'order tin', 'wwe ml', 'we ml', 'yuu ml', 'yu ml', 'mhar ml', 'buy', 'take 1', 'take one'
  ];
  for (const p of orderPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'order_intent', confidence: 0.92, matchedKeywords: [p] };
    }
  }

  // 6. Delivery Inquiry
  const deliveryPatterns = [
    'ပို့ခ', 'ဒေလီခ', 'ပို့ပေးလား', 'အိမ်အရောက်', 'ကားဂိတ်', 'ဘယ်နှစ်ရက်', 'ကြာချိန်',
    'deli', 'deli fee', 'deli charge', 'delivery charge', 'dali charge', 'deli bl lout', 'deli kha', 'cod ya lr'
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
    'kpay ရလား', 'wave ရလား', 'kbzpay', 'wavepay', 'ဘယ်လိုရှင်း', 'ဘယ်လိုချေ', 'ငွေလွှဲ',
    'kpay ya lr', 'wave ya lr', 'bhr lo shin', 'kpay acc', 'wave acc', 'cod ya lr'
  ];
  for (const p of paymentPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'payment_inquiry', confidence: 0.9, matchedKeywords: [p] };
    }
  }

  // 8. Stock Inquiry
  const stockPatterns = [
    'ပစ္စည်းရှိလား', 'ရှိသေးလား', 'ပစ္စည်းကျန်', 'stock ကျန်', 'စတော့', 'instock', 'in stock',
    'instock shi lr', 'shi lr', 'shi thay lr', 'stock kyan lr', 'out of stock', 'oos'
  ];
  for (const p of stockPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'stock_inquiry', confidence: 0.88, matchedKeywords: [p] };
    }
  }

  // 9. Price Inquiry
  const pricePatterns = [
    'ဈေးဘယ်လောက်', 'စျေးဘယ်လောက်', 'ဘယ်လောက်လဲ', 'ဘယ်ဈေး', 'ဘယ်စျေး', 'ဘယ်လောက်ကျ', 'ဈေးလေးသိ', 'စျေးလေး',
    'price', 'price plx', 'price plz', 'price please', 'bl lout ll', 'bl lout le', 'ze bl lout', 'zay bl lout', 'price pr'
  ];
  for (const p of pricePatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'price_inquiry', confidence: 0.88, matchedKeywords: [p] };
    }
  }

  // 10. Greeting
  const greetingPatterns = ['မင်္ဂလာပါ', 'ဟဲလို', 'ဟိုင်း', 'နေကောင်းလား', 'hi', 'hello', 'mingalarpar', 'mingalaba', 'mglpar', 'mglba', 'heyy'];
  for (const p of greetingPatterns) {
    if (inputLower.includes(p) || rawLower.includes(p)) {
      return { intent: 'greeting', confidence: 0.95, matchedKeywords: [p] };
    }
  }

  return { intent: 'general_inquiry', confidence: 0.5, matchedKeywords: [] };
}
```

### 4.4 Proposed Implementation: `matchCatalogProducts` & Price Formatter

```typescript
export function formatProductPriceMmk(priceMmk: number): string {
  return `${priceMmk.toLocaleString()} MMK`;
}

export function formatStockStatus(stockQuantity: number): string {
  return stockQuantity > 0
    ? `✅ In-stock (${stockQuantity} ခုကျန်)`
    : `❌ လက်ရှိ ပစ္စည်းပြတ်နေပါသည် (Out of stock)`;
}

export function matchCatalogProducts(query: string, products: Product[]): Product[] {
  if (!query || !products || products.length === 0) return [];

  const normalized = normalizeBurmese(query);
  const inputLower = normalized.toLowerCase();

  // Burmese product category stem mappings
  const STEM_SYNONYMS: Record<string, string[]> = {
    serum: ['ဆီရမ်', 'serum'],
    liptint: ['နှုတ်ခမ်းနီ', 'lip tint', 'liptint', 'lipstick'],
    paso: ['ပုဆိုး', 'လုံချည်', 'paso', 'longyi'],
    dress: ['ဂါဝန်', 'ဝတ်စုံ', 'dress', 'skirt'],
    bag: ['အိတ်', 'လွယ်အိတ်', 'လက်ကိုင်အိတ်', 'bag'],
    shoes: ['ဖိနပ်', 'shoes', 'sneakers'],
    sunscreen: ['နေကာခရင်မ်', 'sunscreen', 'sunblock', 'sun cream'],
  };

  const scored: { product: Product; score: number }[] = [];

  for (const p of products) {
    const pNameMm = p.nameMm.toLowerCase();
    const pNameEn = p.nameEn.toLowerCase();
    const pSku = p.sku.toLowerCase();
    const pCategory = p.category.toLowerCase();

    let score = 0;

    // Exact SKU match
    if (inputLower.includes(pSku)) score = Math.max(score, 100);

    // Exact Name match
    if (inputLower.includes(pNameEn) || normalized.includes(p.nameMm)) score = Math.max(score, 90);

    // English word tokens match
    const enTokens = pNameEn.split(/[\s-]+/).filter((t) => t.length > 2);
    for (const t of enTokens) {
      if (inputLower.includes(t)) score = Math.max(score, 75);
    }

    // Category match
    if (inputLower.includes(pCategory)) score = Math.max(score, 60);

    // Burmese / Burglish stem dictionary match
    for (const [, synonyms] of Object.entries(STEM_SYNONYMS)) {
      const queryMatchesStem = synonyms.some((s) => inputLower.includes(s) || normalized.includes(s));
      const productMatchesStem = synonyms.some((s) => pNameEn.includes(s) || pNameMm.includes(s) || pCategory.includes(s));
      if (queryMatchesStem && productMatchesStem) {
        score = Math.max(score, 80);
      }
    }

    if (score >= 60) {
      scored.push({ product: p, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.product);
}
```

### 4.5 Dual Execution Mode & Complete `processCustomerMessage` Blueprint

```typescript
export async function processCustomerMessage(
  rawInput: string,
  context: AgentContext
): Promise<AgentResponse> {
  const normalizedInput = normalizeBurmese(rawInput);
  const inputLower = normalizedInput.toLowerCase();

  // 1. Classify Intent
  const { intent, confidence } = classifyBurmeseIntent(rawInput);

  // 2. Lookup Delivery / Township
  const matchedDelivery = lookupTownshipDelivery(normalizedInput);

  // 3. Match Catalog Products
  const matchedProducts = matchCatalogProducts(rawInput, context.products);

  // 4. Extract Phone Number
  const convertedForPhone = convertBurmeseDigits(normalizedInput);
  const phoneMatch = convertedForPhone.match(/(?:\+?95\s*0?9|0095\s*9|09|9)[0-9\s.-]{7,15}/);
  const customerPhone = phoneMatch ? normalizeMyanmarPhone(phoneMatch[0]) || undefined : undefined;

  // 5. Determine Order Intent Boolean
  const isOrderIntent =
    intent === 'order_intent' ||
    intent === 'checkout_info' ||
    ['ဝယ်မယ်', 'ယူမယ်', 'မှာမယ်', 'order', 'ပို့ပေးပါ', 'ဝယ်ချင်လို့', 'အော်ဒါတင်'].some(
      (k) => normalizedInput.includes(k) || inputLower.includes(k)
    );

  // 6. Construct Order Draft
  const orderDraft: Partial<Order> | undefined =
    customerPhone || matchedDelivery || matchedProducts.length > 0
      ? {
          customerPhone,
          township: matchedDelivery?.nameEn,
          deliveryFeeMmk: matchedDelivery?.standardFeeMmk,
          items: matchedProducts.map((p) => ({
            productId: p.id,
            name: p.nameMm,
            quantity: 1,
            priceMmk: p.priceMmk,
          })),
        }
      : undefined;

  // 7. Dual Execution Mode: Try Gemini API if key is present
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
- Yangon: 2,500 - 4,000 MMK (1-2 days, COD available)
- Mandalay: 3,000 - 4,000 MMK (1-2 days, COD available)
- Regional / Bus Gates: 3,500 - 6,000 MMK (Prepaid KPay only)

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
        config: { systemInstruction, temperature: 0.3 },
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
        detectedItems: matchedProducts.map((p) => ({ productId: p.id, quantity: 1 })),
        orderDraft,
      };
    } catch (err) {
      console.warn('Gemini API call fallback to local rule-engine:', err);
    }
  }

  // 8. Deterministic Local Rule-Engine Fallback
  let reply = `မင်္ဂလာပါရှင့် ${context.customerName || 'လူကြီးမင်း'} 🌸\n\n`;

  if (intent === 'greeting' && matchedProducts.length === 0 && !matchedDelivery) {
    reply += `${context.shop.name} မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်ရှင့် 💕\nဘာပစ္စည်းလေးများ ကြည့်ရှုလိုပါသလဲရှင့်?\nဆိုင်ရှိ ပစ္စည်းများ၊ ဈေးနှုန်း နှင့် မြို့နယ်ပို့ဆောင်ခများကို မေးမြန်းနိုင်ပါတယ်ရှင့် ✨`;
  } else if (matchedProducts.length > 0) {
    reply += `မင်မင်တို့ဆိုင်မှာ စုံစမ်းမေးမြန်းထားတဲ့ ပစ္စည်းအသေးစိတ်လေးပါရှင့် -\n\n`;
    matchedProducts.forEach((p, idx) => {
      const stockStatus = formatStockStatus(p.stockQuantity);
      reply += `${idx + 1}. **${p.nameMm}** (${p.nameEn})\n   💰 ဈေးနှုန်း: ${formatProductPriceMmk(p.priceMmk)} (${p.priceMmk.toLocaleString()} ကျပ်)\n   📦 လက်ကျန်: ${stockStatus}\n\n`;
    });
  }

  if (matchedDelivery) {
    const isPrepaid = isRegionalPrepaidOnly(matchedDelivery.nameEn) || !matchedDelivery.codAvailable;
    reply += `📍 **${matchedDelivery.nameMm} (${matchedDelivery.nameEn}) မြို့နယ် ပို့ဆောင်ခ**\n`;
    reply += `• ပို့ဆောင်ခ: ${formatProductPriceMmk(matchedDelivery.standardFeeMmk)} (${matchedDelivery.standardFeeMmk.toLocaleString()} ကျပ်)\n`;
    reply += `• ကြာချိန်: ${matchedDelivery.estDays}\n`;
    reply += `• ငွေချေစနစ်: ${isPrepaid ? 'KPay/WavePay ကြိုလွှဲစနစ်သာ ရရှိပါသည် (Prepaid Only)' : 'အိမ်အရောက်ငွေချေ (COD) ရရှိပါသည်'}\n\n`;
  } else if (intent === 'delivery_inquiry') {
    reply += `ပို့ဆောင်ပေးရမည့် မြို့နယ်လေး ပြောပြပေးပါရှင့် 💕\nရန်ကုန်၊ မန္တလေး၊ နေပြည်တော် နှင့် နယ်မြို့ပေါင်း ၅၀ ကျော်သို့ ပို့ဆောင်ပေးနေပါတယ်ရှင့် ✨\n\n`;
  }

  if (intent === 'payment_inquiry') {
    reply += `💳 **ငွေပေးချေမှု နည်းလမ်းများ**\n`;
    if (context.shop.kpayNumber) reply += `• KPay: ${context.shop.kpayNumber} (${context.shop.kpayName})\n`;
    if (context.shop.waveNumber) reply += `• WavePay: ${context.shop.waveNumber} (${context.shop.waveName})\n`;
    reply += `• ရန်ကုန်နှင့် မန္တလေးမြို့တွင်း အိမ်အရောက်ငွေချေ (COD) ရရှိပါသည်ရှင့် 💕\n\n`;
  }

  if (intent === 'human_takeover') {
    reply += `ဟုတ်ကဲ့ပါရှင့်၊ ဆိုင်တာဝန်ခံ မင်မင်ထံသို့ ချိတ်ဆက်ပေးထားပါသည်ရှင့်။ ခေတ္တစောင့်ဆိုင်းပေးပါနော် 💕\n\n`;
  }

  if (isOrderIntent) {
    reply += `✨ **အော်ဒါအတည်ပြု မှာယူရန်အတွက်** အောက်ပါ အချက်အလက်လေးများ ပို့ပေးပါရှင့် -\n`;
    reply += `၁။ လက်ခံမည့် အမည်\n`;
    reply += `၂။ ဖုန်းနံပါတ် (09-xxx)\n`;
    reply += `၃။ ပို့ဆောင်ရမည့် မြို့နယ် နှင့် အသေးစိတ်လိပ်စာ\n`;
    reply += `၄။ ငွေချေနည်းလမ်း (KPay / WavePay / အိမ်အရောက်ငွေချေ COD)\n\n`;
    if (context.shop.kpayNumber) {
      reply += `(KPay ဖြင့်လွှဲယူလိုပါက KPay: ${context.shop.kpayNumber} - ${context.shop.kpayName} သို့ လွှဲပြီး ပြေစာလေး ပို့ပေးထားလို့ရပါတယ်ရှင့် 💕)`;
    }
  } else if (matchedProducts.length === 0 && !matchedDelivery && intent !== 'greeting' && intent !== 'payment_inquiry' && intent !== 'human_takeover') {
    reply += `မင်မင်တို့ဆိုင်မှ ကြိုဆိုပါတယ်ရှင့်။ ဘာပစ္စည်းလေး ကြည့်ရှုလိုပါသလဲရှင့်?\nဆိုင်ရှိ ပစ္စည်းများ၊ ဈေးနှုန်း နှင့် မြို့နယ်ပို့ဆောင်ခများကို မေးမြန်းနိုင်ပါတယ်ရှင် 💕`;
  }

  return {
    replyText: reply,
    replyTextMm: reply,
    intent,
    confidence,
    detectedTownship: matchedDelivery?.nameEn,
    deliveryFeeMmk: matchedDelivery?.standardFeeMmk,
    isOrderIntent,
    detectedItems: matchedProducts.map((p) => ({ productId: p.id, quantity: 1 })),
    orderDraft,
  };
}
```

---

## 5. Verification Method

### 5.1 Independent Test Commands
1. Verify existing test baseline passes cleanly:
   ```powershell
   npm.cmd test
   ```
2. Verify adversarial M2 NLP probe passes with new signatures:
   ```powershell
   npx tsx scripts/adversarial_m2_nlp_probe.ts
   ```
3. Verify production Next.js build passes without type errors:
   ```powershell
   npm.cmd run build
   ```

### 5.2 Verification Test Matrix for Milestone 4
Once the implementation worker updates `src/lib/gemini-agent.ts`, verify the following assertions in `scripts/verify_m4_sales_closing.ts`:
- **Greeting**: `classifyBurmeseIntent('မင်္ဂလာပါ').intent === 'greeting'` and `classifyBurmeseIntent('mingalarpar').intent === 'greeting'`.
- **Price Inquiry**: `classifyBurmeseIntent('ဆီရမ် ဈေးဘယ်လောက်လဲ').intent === 'price_inquiry'` and `classifyBurmeseIntent('price plx').intent === 'price_inquiry'`.
- **Stock Inquiry**: `classifyBurmeseIntent('ပစ္စည်းရှိလား').intent === 'stock_inquiry'` and `classifyBurmeseIntent('instock shi lr').intent === 'stock_inquiry'`.
- **Delivery Inquiry**: `classifyBurmeseIntent('စမ်းချောင်း ပို့ခ ဘယ်လောက်လဲ').intent === 'delivery_inquiry'` and `classifyBurmeseIntent('dali charge bl lout ll').intent === 'delivery_inquiry'`.
- **Payment Inquiry**: `classifyBurmeseIntent('kpay ရလား').intent === 'payment_inquiry'` and `classifyBurmeseIntent('kpay ya lr').intent === 'payment_inquiry'`.
- **Order Intent**: `classifyBurmeseIntent('ဝယ်မယ်').intent === 'order_intent'` and `classifyBurmeseIntent('order tin ml').intent === 'order_intent'`.
- **Checkout Info**: `classifyBurmeseIntent('ဖုန်း 09798765432 စမ်းချောင်း').intent === 'checkout_info'`.
- **Product Match**: `matchCatalogProducts('serum', products)` returns Vitamin C Serum; `matchCatalogProducts('နှုတ်ခမ်းနီ', products)` returns Lip Tint.
- **MMK Formatting**: `formatProductPriceMmk(28000) === '28,000 MMK'`.
- **Zero-Chat Invariant**: Execution of `processCustomerMessage` mutates 0 chat entities in database.

### 5.3 Invalidation Conditions
- Any removal of `replyTextMm` that breaks existing webhook routes or M2 test probes.
- Any network call to Gemini during test execution when `GEMINI_API_KEY` is undefined.
- Any attempt to store chat messages in `db.json` or Supabase tables.
