# DISPATCH — worker_m4

## 2026-10-09T03:02:41Z

## Task Assignment
- Agent: worker_m4
- Archetype: teamwork_preview_worker
- Role: Milestone 4 Implementation Worker
- Milestone: Milestone 4 (Burmese AI Sales Closing Engine, 5-Attribute Checkout, Stock Decrement & Telegram Alerts)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
1. Authoritative User Request: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Project Architecture & Feature Inventory: `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
3. Explorer Blueprints:
   - `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1\handoff.md` (Intent classification, Burglish mapping, catalog matching, dual execution mode, backward-compatible `AgentResponse` contract)
   - `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_2\handoff.md` (5-attribute conversational checkout extraction, stock validation, prepaid policy enforcement, missing field prompts, Burmese order voucher `ဘောက်ချာ`)
   - `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_3\handoff.md` (Order finalization via `db.createOrder`, pre-decrement stock check, atomic stock decrement via `db.updateProductStock`, `src/lib/telegram.ts` alerts & spy, and verification script `scripts/verify_m4_sales_closing.ts`)

## Exclusively Owned Files to Create / Modify
- `src/lib/gemini-agent.ts`
- `src/lib/telegram.ts`
- `scripts/verify_m4_sales_closing.ts`

## Implementation Blueprint Requirements

### 1. `src/lib/telegram.ts`
- Implement `sendTelegramOrderAlert(shop: Shop, order: Order, products?: Product[]): Promise<TelegramSendResult>`.
- Implement `isTelegramMockMode(token?: string): boolean` (returns `true` if token missing, mock token, or `NODE_ENV === 'test'`).
- Implement `telegramAlertSpy` and `_mockTelegramAlerts` array for in-memory test inspection (zero disk / DB persistence).
- Implement `formatTelegramOrderAlertText(shop: Shop, order: Order)` with clean Markdown format containing:
  * Shop name
  * Order ID (`order.id`)
  * Customer name
  * Normalized phone (`09XXXXXXXXX`)
  * Township & Address
  * Payment method
  * Itemized product list with qty and prices
  * Subtotal MMK, Delivery fee MMK, Total MMK
- Maintain backward-compatible wrapper: `sendTelegramOrderNotification(order: Order, shop: Shop): Promise<boolean>`.

### 2. `src/lib/gemini-agent.ts`
- Export pure function `classifyBurmeseIntent(rawInput: string): IntentClassificationResult`:
  * Supports 11 intents: `greeting`, `price_inquiry`, `stock_inquiry`, `delivery_inquiry`, `payment_inquiry`, `order_intent`, `checkout_info`, `discount_inquiry`, `slip_inquiry`, `human_takeover`, `general_inquiry`.
  * Matches Burmese Unicode, Zawgyi, and Burglish slang (`bl lout ll`, `instock shi lr`, `kpay ya lr`, `dali charge`, `order tin ml`, `yuu ml`, etc.).
- Export `matchCatalogProducts(query: string, products: Product[]): Product[]`:
  * Stem token synonyms (`ဆီရမ်`, `နှုတ်ခမ်းနီ`, `ပုဆိုး`, `ဂါဝန်`, `အိတ်`, `ဖိနပ်`, `နေကာခရင်မ်`).
  * Exact name, SKU, category, and Burglish transliterations (`serum`, `liptint`, `paso`, `dress`, `bag`, `shoes`, `sunscreen`).
- Export formatting helpers:
  * `formatProductPriceMmk(priceMmk: number): string` (`${priceMmk.toLocaleString()} MMK`).
  * `formatStockStatus(stockQuantity: number): string` (`✅ In-stock (N ခုကျန်)` vs `❌ Out of stock`).
  * `formatOrderVoucher(order: Partial<Order>, shop: Shop, delivery?: TownshipDeliveryInfo | null): string` (`ဘောက်ချာ` format with shop name, order ID, customer details, itemized breakdown, subtotal, delivery fee, grand total, payment method, polite Burmese closing).
  * `formatMissingAttributesPrompt(missing: string[], shop: Shop, delivery: TownshipDeliveryInfo | null, customerName?: string): string`.
- Implement 5-attribute conversational checkout extraction:
  * Product & quantity: extract Burmese numerals, words, Arabic digits, default to 1; strip phone digits to prevent collision.
  * Customer name: extract explicit label or fall back to platform name.
  * Phone number: extract and normalize via `normalizeMyanmarPhone` to `09XXXXXXXXX`.
  * Township & Address: lookup via `lookupTownshipDelivery`.
  * Payment method: `kpay`, `wavepay`, `cod`. Enforce `isRegionalPrepaidOnly`: if regional city or express bus gate, strictly reject COD and require prepaid KPay/WavePay.
- Order Finalization & Stock Guard:
  * When 5 attributes are satisfied:
    1. Pre-decrement inventory guard: verify `product.stockQuantity >= item.quantity` for all items. If deficit, abort order and return polite Burmese notice (`စိတ်မကောင်းပါဘူးရှင့်... လက်ကျန် (N) ခုသာ ရှိပါသဖြင့်...`).
    2. Atomic stock decrement: call `db.updateProductStock(shop.id, item.productId, -item.quantity)`.
    3. Order persistence: call `db.createOrder(shop.id, orderData)` (with initial status `'confirmed'` for COD or `'pending_slip'` for prepaid).
    4. Telegram notification: call `sendTelegramOrderAlert(shop, createdOrder, products)`.
    5. Return `completedOrder` and order voucher text.
- Contract compatibility:
  * `AgentResponse` must provide BOTH `replyText` and `replyTextMm` (`replyTextMm = replyText`) for 100% backward compatibility with `facebook/route.ts`, `tiktok/route.ts`, and test probes.
  * Deterministic local rule-engine fallback when `GEMINI_API_KEY` is not present, executing in <1ms (well within <3s SLA).
  * Strict Zero-Chat Storage Invariant: purely ephemeral in-memory processing, zero chat tables/records in database.

### 3. `scripts/verify_m4_sales_closing.ts`
- Implement comprehensive 7-suite verification script (80+ assertions) testing:
  * Suite 1: Burmese & Burglish intent classification (12+ assertions).
  * Suite 2: Real-time product search & MMK price formatting (10+ assertions).
  * Suite 3: 5-attribute conversational checkout extraction (14+ assertions).
  * Suite 4: Township delivery calculation & prepaid policy enforcement (10+ assertions).
  * Suite 5: Order voucher generation (`ဘောက်ချာ` format, arithmetic check `total = subtotal + fee`) (10+ assertions).
  * Suite 6: Order finalization, atomic stock decrement & negative stock guard (12+ assertions).
  * Suite 7: Telegram notification alert & Zero-chat DB invariant verification (12+ assertions).

## Verification Execution Commands (Run using .cmd wrappers on Windows)
1. `npx.cmd tsx scripts/verify_m4_sales_closing.ts` (all 80+ assertions must pass)
2. `npm.cmd test` (all project tests must pass cleanly)
3. `npm.cmd run build` (Next.js build must succeed with exit code 0)
4. `npx.cmd tsx scripts/adversarial_zero_chat_probe.ts` (106/106 zero-chat invariant probes must pass)

## Handoff Deliverable
Write a 5-component handoff report to:
`c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\worker_m4\handoff.md`
Send completion message to parent (`6b3e572e-862e-4f21-b794-2d675500d1e9`).
