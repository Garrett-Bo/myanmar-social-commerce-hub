# TEST_INFRA — Opaque-Box E2E Test Infrastructure Specification

**Project**: Myanmar AI Social Commerce SaaS Platform  
**Target File**: `TEST_INFRA.md` (Project Root)  
**Author**: `spec_miner_e2e` (Teamwork E2E Test Suite Specification Miner & Architect)  
**Status**: Authoritative Test Architecture Specification  
**Integrity Mode**: Development / Dual-Track E2E  

---

## 1. Executive Summary & Test Philosophy

This document defines the complete **Opaque-Box Requirement-Driven E2E Test Infrastructure** for the Myanmar AI Social Commerce SaaS platform.

### Core Testing Principles
1. **Opaque-Box Requirement-Driven Verification**:
   - The test infrastructure exercises the system strictly through its public boundary contracts, HTTP webhook endpoints, public utility APIs, and interface definitions.
   - Tests do NOT rely on implementation internals, private variables, or monkey-patching. If the underlying persistence changes from local JSON to Supabase PostgreSQL or the LLM changes from Gemini 2.5 Flash to another model, the test suites remain 100% valid and passing.
2. **Strict Zero-Chat Storage Invariant Enforcement**:
   - The fundamental architectural constraint established by user directive R1 is:  
     > *"chat wont store on ourside we will jsut pull the tik tok and facebook api messaging .. it's expensive to store"*
   - Every tier of the test infrastructure includes rigorous forensic probes confirming that zero chat messages, conversation logs, threads, or inbound webhooks are ever persisted to disk or database tables under any scenario.
3. **Deterministic & Fast Offline Testability**:
   - All tests run deterministically in local environments without requiring active internet connectivity, third-party API credentials, or paid cloud services.
   - Intelligent mock dispatchers for Facebook Graph API, TikTok Open API, and Telegram Bot API intercept outbound calls in-memory, recording payloads in isolated test spies that are inspected and flushed per test assertion.
4. **Comprehensive 4-Tier + Hardening Test Matrix**:
   - **Tier 1 (Feature Coverage)**: >=5 deterministic unit tests per feature across all 36 features (180+ tests).
   - **Tier 2 (Boundary & Corner Cases)**: >=5 boundary/corner-case tests per feature where boundaries exist (180+ tests).
   - **Tier 3 (Cross-Feature Combinations)**: Pairwise permutation testing validating end-to-end multi-tenant pipelines.
   - **Tier 4 (Real-World Workload Scenarios)**: 5 complete, realistic Myanmar customer shopping journeys.
   - **Tier 5 (Adversarial Coverage Hardening)**: High-concurrency floods, fuzzing, SQLi/XSS injection, and forensic memory/disk audits.

---

## 2. Test Execution & Environment Configuration

### 2.1 Test Runners & Execution Commands
The platform supports execution via both Node/TypeScript ESM execution (`npx.cmd tsx`) and Vitest runner:

| Target | Command | Purpose |
|---|---|---|
| **Full Project Test Suite** | `npm.cmd test` | Standard project gate verification command across all active milestones. |
| **Tier 1 Test Runner** | `npx.cmd tsx tests/tier1_feature_coverage.ts` | Executes >=5 tests per feature for all 36 features. |
| **Tier 2 Test Runner** | `npx.cmd tsx tests/tier2_boundary_cases.ts` | Executes >=5 boundary/corner cases per feature. |
| **Tier 3 Test Runner** | `npx.cmd tsx tests/tier3_cross_feature.ts` | Executes pairwise integration and cross-feature pipeline tests. |
| **Tier 4 Test Runner** | `npx.cmd tsx tests/tier4_real_workloads.ts` | Executes 5 complete realistic customer journeys. |
| **Adversarial Forensic Probe** | `npx.cmd tsx scripts/adversarial_zero_chat_probe.ts` | Forensic zero-chat invariant disk & schema audit. |
| **Adversarial Stress Harness** | `npx.cmd tsx scripts/adversarial_m3_stress_harness.ts` | 244-assertion high-concurrency webhook flood & memory leak probe. |
| **Vitest Unified Runner** | `npx.cmd vitest run` | Unified Vitest runner once vitest test specs are generated. |

*Note on Windows Execution*: Due to Windows PowerShell script execution policies blocking raw `npx.ps1`, commands must use `npm.cmd test` or `npx.cmd tsx` when invoked via Windows shells.

### 2.2 Test Directory Layout
```
fervent-hawking/
├── tests/
│   ├── tier1/                          # Tier 1: Feature Coverage (>=5 tests per feature)
│   │   ├── m1_persistence.test.ts      # Features 1-7
│   │   ├── m2_nlp_logistics.test.ts    # Features 8-14
│   │   ├── m3_social_channels.test.ts  # Features 15-21
│   │   ├── m4_sales_closing.test.ts    # Features 22-29
│   │   └── e2e_infra.test.ts           # Features 30-36
│   ├── tier2/                          # Tier 2: Boundary & Corner Cases (>=5 tests per feature)
│   │   ├── m1_boundaries.test.ts       # DB limits, collisions, poisoning, lock fallbacks
│   │   ├── m2_boundaries.test.ts       # Pali stacks, diacritic clusters, malformed phones, unknown towns
│   │   ├── m3_boundaries.test.ts       # Echo loops, 2000-char truncation, invalid signatures, unknown tenants
│   │   └── m4_boundaries.test.ts       # Zero/negative stock, missing attributes, out-of-order checkout
│   ├── tier3/                          # Tier 3: Cross-Feature Pairwise Combinations
│   │   ├── pairwise_pipeline.test.ts   # Tenant x Channel x Language x Township x Payment matrix
│   │   └── stock_voucher_sync.test.ts  # Stock deduction + voucher generation + Telegram sync
│   ├── tier4/                          # Tier 4: Real-World Workload Customer Journeys
│   │   ├── journey_ygn_fb_cod.test.ts  # Scenario 1: Yangon Messenger COD order
│   │   ├── journey_mdy_fb_kpay.test.ts # Scenario 2: Mandalay Messenger KPay order (Zawgyi)
│   │   ├── journey_regional_tt.test.ts # Scenario 3: Taunggyi TikTok Highway Bus Gate order
│   │   ├── journey_burglish_slang.test.ts # Scenario 4: Burglish bargaining & Wa typo resolution
│   │   └── journey_traffic_flood.test.ts  # Scenario 5: Concurrent multi-tenant flood & forensic audit
│   └── mocks/                          # Mock utilities & test spies
│       ├── mock-meta-server.ts         # Meta Graph API mock server
│       ├── mock-tiktok-server.ts       # TikTok Open API mock server
│       └── mock-telegram-server.ts     # Telegram Bot API mock server
├── scripts/                            # Milestone verification & stress harnesses
│   ├── verify_m1_persistence.ts
│   ├── verify_m2_nlp_logistics.ts
│   ├── verify_m3_channels.ts
│   ├── adversarial_zero_chat_probe.ts
│   ├── adversarial_m2_nlp_probe.ts
│   └── adversarial_m3_stress_harness.ts
└── TEST_INFRA.md                       # This document
```

---

## 3. Full Feature Inventory & Interface Contracts

The 36 features defined in `PROJECT.md § Feature Inventory` and additional 10 discovered features are organized into 5 functional categories:

```
+---------------------------------------------------------------------------------------------------+
|                                  MYANMAR AI SOCIAL COMMERCE PLATFORM                              |
+---------------------------------------------------------------------------------------------------+
|  Category 1: Multi-Tenant Data Persistence & Zero-Chat Storage (Features 1-7, 45, 46)             |
|  Category 2: Burmese NLP, Digit Normalization & Logistics Matrix (Features 8-14, 37-41)           |
|  Category 3: Social Channels & On-Demand Messaging (Features 15-21, 42-44)                       |
|  Category 4: Conversational Sales Closing & Order Automation (Features 22-29)                     |
|  Category 5: Test Infrastructure & Verification Tiers (Features 30-36)                            |
+---------------------------------------------------------------------------------------------------+
```

### Public Interface Contracts

#### Contract 1: Database Persistence (`src/lib/db.ts`)
- `db.getShop(shopId: string): Promise<Shop | null>`
- `db.listShops(): Promise<Shop[]>`
- `db.saveShop(shop: Shop): Promise<Shop>`
- `db.getProducts(shopId: string): Promise<Product[]>`
- `db.saveProduct(shopId: string, product: Product): Promise<Product>`
- `db.updateProductStock(shopId: string, productId: string, delta: number): Promise<Product | null>`
- `db.findShopByChannel(platform: 'facebook' | 'tiktok', channelIdentifier: string): Promise<{ shop: Shop; channel: ChannelConnection } | null>`
- `db.saveChannelConnection(shopId: string, channel: ChannelConnection): Promise<ChannelConnection>`
- `db.getOrders(shopId: string): Promise<Order[]>`
- `db.createOrder(shopId: string, order: Omit<Order, 'id' | 'createdAt'>): Promise<Order>`
- `db.updateOrderStatus(shopId: string, orderId: string, status: OrderStatus): Promise<Order | null>`
- **CRITICAL METHOD BAN**: `conversations`, `messages`, `chat_logs`, `getConversations`, `saveMessage` are strictly `undefined`.

#### Contract 2: Burmese NLP & Logistics (`src/lib/burmese-converter.ts`, `src/lib/myanmar-townships.ts`)
- `isZawgyi(text: string): boolean`
- `normalizeBurmese(text: string): string`
- `convertBurmeseDigits(text: string): string`
- `correctWaInNumericContext(text: string): string`
- `canonicalizeUnicodeDiacritics(text: string): string`
- `normalizeMyanmarPhone(raw: string): string`
- `lookupTownshipDelivery(query: string): TownshipDeliveryInfo | null`
  - Canonical and contract properties: `{ nameMm, nameEn, region, standardFeeMmk, codAvailable, estDays, townshipMm, townshipEn, feeMmk, isCodAvailable, estimatedDays }`
- `isRegionalPrepaidOnly(query: string): boolean`

#### Contract 3: Social Channel Dispatchers & On-Demand Chat (`src/lib/facebook.ts`, `src/lib/tiktok.ts`)
- `sendFacebookMessage(recipientId: string, messageText: string, pageAccessToken: string): Promise<FacebookSendResult>`
- `fetchFacebookConversations(pageId: string, pageAccessToken: string): Promise<FacebookConversationSummary[]>`
- `fetchFacebookThreadMessages(threadId: string, pageAccessToken: string): Promise<FacebookThreadMessage[]>`
- `sendTikTokMessage(conversationId: string, messageText: string, accessToken: string): Promise<TikTokSendResult>`
- `fetchTikTokConversations(accessToken: string): Promise<TikTokConversationSummary[]>`
- `fetchTikTokThreadMessages(conversationId: string, accessToken: string): Promise<TikTokThreadMessage[]>`

#### Contract 4: Conversational Sales Closing & Order Engine (`src/lib/gemini-agent.ts`, `src/lib/telegram.ts`)
- `processCustomerMessage(messageText: string, context: AgentContext): Promise<AgentResponse>`
- `sendTelegramOrderNotification(order: Order, shop: Shop): Promise<boolean>`

---

## 4. Tier 1 Test Suite: Feature Coverage (>=5 Tests per Feature)

Every feature in `PROJECT.md § Feature Inventory` is mapped to at least 5 isolated, deterministic unit tests.

### Category 1: Multi-Tenant Data Persistence & Zero-Chat Storage

#### Feature 1: Multi-Tenant Shop Profile & Auth Persistence (M1)
- **T1.1.1**: `getShop` retrieves seeded Yangon shop (`shop-ygn-01`) with full merchant profile.
- **T1.1.2**: `getShop` retrieves seeded Mandalay shop (`shop-mdy-02`) with independent credentials.
- **T1.1.3**: `saveShop` creates a new shop tenant (`shop-test-01`) and persists to store.
- **T1.1.4**: `listShops` returns all registered shop tenants across Yangon, Mandalay, Naypyitaw.
- **T1.1.5**: `updateShop` mutates payment numbers (KPay/WavePay) without altering other tenants' records.

#### Feature 2: Channel Connections Persistence (M1)
- **T1.2.1**: `getChannels` returns Facebook Page connection for Yangon shop (`109283746501928`).
- **T1.2.2**: `getChannels` returns TikTok connection for Yangon shop (`tt_shop_8291029`).
- **T1.2.3**: `saveChannelConnection` registers a new TikTok channel connection under Mandalay tenant.
- **T1.2.4**: Multi-tenant isolation: querying channels for Naypyitaw returns empty array without leaking Yangon/Mandalay credentials.
- **T1.2.5**: Updating channel access token updates the specific channel while preserving `shopId` foreign relationship.

#### Feature 3: Product Catalog & Inventory Persistence (M1)
- **T1.3.1**: `getProducts` returns Yangon shop catalog (Niacinamide Serum, Vintage Bag, etc.).
- **T1.3.2**: `getProducts` returns Mandalay shop catalog (Silk Longyi, Cotton Shirt) without Yangon items.
- **T1.3.3**: `saveProduct` adds a new SKU to a specific shop without cross-tenant leakage.
- **T1.3.4**: `updateProductStock` increments stock (+5) and sets `isAvailable: true`.
- **T1.3.5**: `updateProductStock` decrements stock to 0 and automatically updates `isAvailable: false`.

#### Feature 4: Finalized Orders & Vouchers Persistence (M1)
- **T1.4.1**: `createOrder` persists finalized order with customer name, phone, township, and total MMK.
- **T1.4.2**: Order record contains `platform: 'facebook'` and `customerPlatformId` without chat thread references.
- **T1.4.3**: `getOrders(shopId)` returns only orders belonging to the queried shop tenant.
- **T1.4.4**: `updateOrderStatus` transitions order from `pending_slip` to `confirmed`.
- **T1.4.5**: Order items JSON structure preserves product ID, name, quantity, and unit price in MMK.

#### Feature 5: Zero Chat Storage Invariant (M1)
- **T1.5.1**: `db.exportData()` strictly contains only 4 root keys: `["channels", "orders", "products", "shops"]`.
- **T1.5.2**: `db.exportData()` contains NO `conversations` or `messages` root keys.
- **T1.5.3**: `(db as any).conversations` and `(db as any).messages` are strictly `undefined`.
- **T1.5.4**: Calling `(db as any).getConversations()` throws `TypeError: is not a function`.
- **T1.5.5**: Order objects on disk contain NO `conversationId`, `conversation_id`, or `threadId`.

#### Feature 6: Disk / DB Persistence Across Restarts (M1)
- **T1.6.1**: Initializing `new MultiTenantDB(testPath)` creates valid `db.json` on disk.
- **T1.6.2**: Writing an order and re-instantiating `new MultiTenantDB(testPath)` retains the order.
- **T1.6.3**: Updating product stock persists to disk and survives DB instance reloads.
- **T1.6.4**: Atomic disk write generates temp file and swaps without leaving orphaned `.tmp` files.
- **T1.6.5**: Disk write fallback succeeds on Windows NTFS lock conditions.

#### Feature 7: Supabase PostgreSQL Schema & RLS Policies (M1)
- **T1.7.1**: SQL migration strictly creates 4 tables: `shops`, `channel_connections`, `products`, `orders`.
- **T1.7.2**: SQL migration enforces Row Level Security (RLS) on all 4 tables.
- **T1.7.3**: SQL orders table does not contain `conversation_id` column.
- **T1.7.4**: SQL orders table has `customer_platform_id` and `platform` columns.
- **T1.7.5**: SQL migration includes runtime check aborting execution if `conversations` table exists.

---

### Category 2: Burmese NLP, Digit Normalization & Logistics Matrix

#### Feature 8: Zawgyi vs Unicode Auto-Detector & Converter (M2)
- **T1.8.1**: `isZawgyi("ေစ်းဘယ္ေလာက္လဲ")` returns `true` (Zawgyi E-vowel and Asat).
- **T1.8.2**: `isZawgyi("ဈေးဘယ်လောက်လဲ")` returns `false` (Standard Unicode).
- **T1.8.3**: `isZawgyi("စမ္းေခ်ာင္း")` returns `true` (Zawgyi Sanchaung).
- **T1.8.4**: `normalizeBurmese("ေစ်းဘယ္ေလာက္လဲ")` returns standard Unicode `"ဈေးဘယ်လောက်လဲ"`.
- **T1.8.5**: `normalizeBurmese("စမ္းေခ်ာင္း ပို့ေပးပါ")` returns `"စမ်းချောင်း ပို့ပေးပါ"`.

#### Feature 9: Burmese Digit to Arabic Normalizer (M2)
- **T1.9.1**: `convertBurmeseDigits("၀၁၂၃၄၅၆၇၈၉")` converts to `"0123456789"`.
- **T1.9.2**: `convertBurmeseDigits("ဈေး ၂၅၀၀၀ ကျပ်")` converts to `"ဈေး 25000 ကျပ်"`.
- **T1.9.3**: `convertBurmeseDigits("႐႑႒႓")` converts Shan digits to `"0123"`.
- **T1.9.4**: `convertBurmeseDigits("အရေအတွက် ၃ ထည်")` converts to `"အရေအတွက် 3 ထည်"`.
- **T1.9.5**: `convertBurmeseDigits("Thai zero ๐9123")` converts to `"Thai zero 09123"`.

#### Feature 10: Letter Wa vs Zero Phone Typo Correction (M2)
- **T1.10.1**: `correctWaInNumericContext("ဝ၉၇၉၈၇၆၅၄၃၂")` converts to `"09798765432"`.
- **T1.10.2**: `correctWaInNumericContext("ဝ9798765432")` converts to `"09798765432"`.
- **T1.10.3**: `correctWaInNumericContext("09-ဝဝဝ-1234")` converts to `"09-000-1234"`.
- **T1.10.4**: `correctWaInNumericContext("ဝယ်မယ်")` preserves letter Wa: `"ဝယ်မယ်"`.
- **T1.10.5**: `correctWaInNumericContext("အဝေးပြေးဂိတ် ဝတ်စုံ")` preserves letter Wa in Burmese words.

#### Feature 11: Myanmar Phone Normalizer (M2)
- **T1.11.1**: `normalizeMyanmarPhone("09798765432")` returns `"09798765432"`.
- **T1.11.2**: `normalizeMyanmarPhone("+959798765432")` returns `"09798765432"`.
- **T1.11.3**: `normalizeMyanmarPhone("959798765432")` returns `"09798765432"`.
- **T1.11.4**: `normalizeMyanmarPhone("ဝ၉-၇၉၈-၇၆၅-၄၃၂")` returns `"09798765432"`.
- **T1.11.5**: `normalizeMyanmarPhone("09 798 765 432")` strips spaces and returns `"09798765432"`.

#### Feature 12: Canonical Tone Mark Order Normalizer (M2)
- **T1.12.1**: `canonicalizeUnicodeDiacritics` reorders inverted Visarga before Dot Below (`\u1038\u1037` -> `\u1037\u1038`).
- **T1.12.2**: Diacritic deduplication: `"ပြီးးး"` collapses to `"ပြီး"`.
- **T1.12.3**: Diacritic deduplication: `"တဲ့့"` collapses to `"တဲ့"`.
- **T1.12.4**: Reorders Medials before Vowel E (`\u1031\u103c` -> `\u103c\u1031`).
- **T1.12.5**: Vowels placed before tone marks (`\u1037\u1032` -> `\u1032\u1037`).

#### Feature 13: 45+ Myanmar Townships Matrix (M2)
- **T1.13.1**: `lookupTownshipDelivery("Sanchaung")` returns fee 2,500 MMK, `codAvailable: true`, `1-2 Days`.
- **T1.13.2**: `lookupTownshipDelivery("စမ်းချောင်း")` returns matching record via Burmese script.
- **T1.13.3**: `lookupTownshipDelivery("Chanayethazan")` returns Mandalay fee 3,000 MMK, `codAvailable: true`.
- **T1.13.4**: `lookupTownshipDelivery("Zabuthiri")` returns Naypyitaw fee 3,500 MMK.
- **T1.13.5**: Suffix stripping: `lookupTownshipDelivery("စမ်းချောင်းမြို့နယ်")` correctly resolves to Sanchaung.

#### Feature 14: Regional Highway Bus Gate Routing (M2)
- **T1.14.1**: `lookupTownshipDelivery("Aung Mingalar")` returns Highway Bus Gate record with 3,500 MMK drop-off fee.
- **T1.14.2**: `lookupTownshipDelivery("အောင်မင်္ဂလာ အဝေးပြေး")` returns Aung Mingalar Bus Terminal.
- **T1.14.3**: `isRegionalPrepaidOnly("Aung Mingalar")` returns `true` (enforcing 100% prepaid).
- **T1.14.4**: `isRegionalPrepaidOnly("Taunggyi")` returns `true` (regional city requires prepaid).
- **T1.14.5**: `isRegionalPrepaidOnly("Kamayut")` returns `false` (Yangon allows COD).

---

### Category 3: Social Channels & On-Demand Messaging

#### Feature 15: Facebook Messenger Webhook Handshake (M3)
- **T1.15.1**: `GET /api/webhooks/facebook` with valid `hub.mode=subscribe` and token returns HTTP 200.
- **T1.15.2**: Webhook GET response body echoes `hub.challenge` verbatim.
- **T1.15.3**: Request with invalid `hub.verify_token` returns HTTP 403.
- **T1.15.4**: Request with missing `hub.mode` returns HTTP 403.
- **T1.15.5**: Request with `hub.mode=unsubscribe` returns HTTP 403.

#### Feature 16: Outbound Meta Graph API Dispatch (M3)
- **T1.16.1**: `sendFacebookMessage` succeeds in mock mode with valid recipient and text.
- **T1.16.2**: Returns `FacebookSendResult` containing `messageId` and `recipientId`.
- **T1.16.3**: Fails gracefully (`success: false`) when `pageAccessToken` is empty.
- **T1.16.4**: Fails gracefully when `recipientId` is empty.
- **T1.16.5**: Fails gracefully when `messageText` is empty.

#### Feature 17: On-Demand Facebook Chat Pulling (M3)
- **T1.17.1**: `fetchFacebookConversations(pageId, token)` returns conversation list without querying DB.
- **T1.17.2**: Returned conversation summaries include `id`, `snippet`, `senderId`, `updatedTime`.
- **T1.17.3**: `fetchFacebookThreadMessages(threadId, token)` returns messages array ephemerally.
- **T1.17.4**: Returned thread messages include `id`, `text`, `from`, `createdTime`.
- **T1.17.5**: Supplying empty token returns empty array without throwing.

#### Feature 18: TikTok Open API Inbound & Outbound (M3)
- **T1.18.1**: `GET /api/webhooks/tiktok?challenge=123` echoes challenge with HTTP 200.
- **T1.18.2**: `GET /api/webhooks/tiktok` without challenge returns health check `{ status: 'ok' }`.
- **T1.18.3**: `sendTikTokMessage` succeeds in mock mode and records to `_mockTikTokSentMessages`.
- **T1.18.4**: Fails gracefully when `conversationId` is missing.
- **T1.18.5**: Inbound `POST /api/webhooks/tiktok` with message payload returns `{ code: 0, message: 'success' }`.

#### Feature 19: On-Demand TikTok Chat Pulling (M3)
- **T1.19.1**: `fetchTikTokConversations(token)` returns conversation threads on-the-fly.
- **T1.19.2**: Summaries include `id`, `snippet`, `updatedAt`.
- **T1.19.3**: `fetchTikTokThreadMessages(conversationId, token)` returns messages without DB read.
- **T1.19.4**: Thread messages include `id`, `text`, `senderId`.
- **T1.19.5**: Empty token returns empty array cleanly.

#### Feature 20: Strict Multi-Tenant Channel Routing (M3)
- **T1.20.1**: FB webhook with Yangon `pageId` routes strictly to `shop-ygn-01`.
- **T1.20.2**: FB webhook with Mandalay `pageId` routes strictly to `shop-mdy-02`.
- **T1.20.3**: FB webhook with unknown `pageId` returns HTTP 200 without dispatching outbound reply.
- **T1.20.4**: TikTok webhook with `shop_id` routes strictly to matching tenant shop.
- **T1.20.5**: TikTok webhook with unknown identifier returns `{ code: 0, message: 'no_tenant' }`.

#### Feature 21: Stateless Live Chat Ephemeral UI (M3)
- **T1.21.1**: Ephemeral types `Message` and `Conversation` defined in `src/types/index.ts`.
- **T1.21.2**: Ephemeral types contain comment documenting zero-chat persistence invariant.
- **T1.21.3**: Inbound chat processing in webhooks passes memory-only `conversationHistory`.
- **T1.21.4**: Webhook request handlers perform 0 SQL `INSERT` or JSON writes to chat collections.
- **T1.21.5**: Multiple concurrent webhook calls maintain isolated conversation histories in-memory.

---

### Category 4: Conversational Sales Closing & Order Automation

#### Feature 22: Burmese Conversational Intent Classifier (M4)
- **T1.22.1**: Message `"မင်္ဂလာပါ"` classified as `greeting`.
- **T1.22.2**: Message `"ဆီရမ် ဈေးဘယ်လောက်လဲ"` classified as `price_inquiry`.
- **T1.22.3**: Message `"ပစ္စည်းရှိသေးလား"` classified as `stock_inquiry`.
- **T1.22.4**: Message `"စမ်းချောင်း ပို့ခ ဘယ်လောက်လဲ"` classified as `delivery_inquiry`.
- **T1.22.5**: Message `"၁ ထည် ဝယ်မယ်"` classified as `order_intent`.

#### Feature 23: Burglish & Slang Recognition (M4)
- **T1.23.1**: `"instock shi lr"` recognized as stock inquiry intent.
- **T1.23.2**: `"deli bl lout ll"` recognized as delivery fee inquiry intent.
- **T1.23.3**: `"kpay ya lr"` recognized as payment method inquiry.
- **T1.23.4**: `"dali charge Sanchaung"` recognized as delivery inquiry for Sanchaung township.
- **T1.23.5**: `"price plx serum"` recognized as price inquiry for serum.

#### Feature 24: Real-time Product & MMK Stock/Price Matching (M4)
- **T1.24.1**: Query `"Niacinamide Serum"` matches catalog item `prod-01`.
- **T1.24.2**: Query in Burmese `"ဆီရမ်"` matches catalog item `prod-01`.
- **T1.24.3**: Returns stock count (`15 in-stock`) and price formatted as `28,000 ကျပ် / MMK`.
- **T1.24.4**: Query for out-of-stock item returns `❌ လက်ရှိ ပစ္စည်းပြတ်နေပါသည်`.
- **T1.24.5**: Query for non-existent product prompts user politely with general shop catalog overview.

#### Feature 25: 5-Attribute Checkout Data Collector (M4)
- **T1.25.1**: Extracts Product & Quantity (defaulting to 1 when unspecified).
- **T1.25.2**: Extracts Customer Name from text or social profile ID.
- **T1.25.3**: Extracts Phone number and normalizes to `09XXXXXXXXX`.
- **T1.25.4**: Extracts Township & Address via `lookupTownshipDelivery`.
- **T1.25.5**: Extracts Payment Method (`KPay`, `WavePay`, `COD`).

#### Feature 26: Payment Slip & Transaction ID Handler (M4)
- **T1.26.1**: Message containing transaction ID string (e.g. `09823481923481`) parsed as transaction reference.
- **T1.26.2**: Generates payment instructions with shop's KPay account number and account holder name.
- **T1.26.3**: Generates payment instructions with shop's WavePay account details.
- **T1.26.4**: Order with KPay set initially to `pending_slip` status until slip is provided.
- **T1.26.5**: Order with COD set directly to `pending_approval` / `confirmed` without requiring slip.

#### Feature 27: Burmese Order Voucher Generator & Stock Decrement (M4)
- **T1.27.1**: Generates formatted Burmese order voucher (`ဘောက်ချာ`) with customer info, items, delivery fee, total MMK.
- **T1.27.2**: Subtotal + Delivery Fee accurately calculates Grand Total MMK.
- **T1.27.3**: Finalizing order creates order record via `db.createOrder`.
- **T1.27.4**: Finalizing order decrements product stock via `db.updateProductStock`.
- **T1.27.5**: Order draft includes polite closing greeting (`ကျေးဇူးတင်ပါသည်`).

#### Feature 28: Telegram Seller Instant Order Alert (M4)
- **T1.28.1**: `sendTelegramOrderNotification` formats markdown order message with shop name, customer, items, total.
- **T1.28.2**: Returns `false` cleanly in mock mode when bot token is not configured.
- **T1.28.3**: Notification text includes customer phone normalized to `09XXXXXXXXX`.
- **T1.28.4**: Notification text displays selected payment method (e.g. `KPAY`, `COD`).
- **T1.28.5**: Telegram API failure does not abort the checkout creation process.

#### Feature 29: Response Latency SLA (< 3s) (M4)
- **T1.29.1**: Inbound FB message -> Burmese normalize -> AI/rule response takes < 150ms in offline mode.
- **T1.29.2**: Inbound TikTok message -> normalize -> reply takes < 150ms.
- **T1.29.3**: Township lookup takes < 5ms for 58 townships.
- **T1.29.4**: Burmese phone normalizer takes < 2ms.
- **T1.29.5**: Full webhook round-trip completes well within the 3,000ms SLA.

---

### Category 5: Test Infrastructure & Verification Tiers

#### Feature 30: Test Runner Configuration (`npm.cmd test`) (E2E Track)
- **T1.30.1**: `npm.cmd test` exits with code 0.
- **T1.30.2**: All sub-scripts in test chain execute sequentially without unhandled promise rejections.
- **T1.30.3**: Test scripts output structured `[PASS]` / `[FAIL]` markers.
- **T1.30.4**: Test scripts summarize total assertions, passed assertions, failed assertions.
- **T1.30.5**: Test failure triggers non-zero exit code (`process.exitCode = 1` or `process.exit(1)`).

#### Feature 31: Tier 1 Test Suite: Unit Tests (E2E Track)
- **T1.31.1**: Tier 1 executes offline without external network dependencies.
- **T1.31.2**: Tier 1 runs in < 10 seconds total execution time.
- **T1.31.3**: Tier 1 covers all 36 features with >= 5 assertions each.
- **T1.31.4**: Zero side effects on `data/db.json` production database file.
- **T1.31.5**: Verifies multi-tenant isolation across all data access methods.

#### Feature 32: Tier 2 Test Suite: Integration Tests (E2E Track)
- **T1.32.1**: Verifies agent integration with database and logistics matrix.
- **T1.32.2**: Tests Facebook client against mock endpoints.
- **T1.32.3**: Tests TikTok client against mock endpoints.
- **T1.32.4**: Validates in-memory spy tracking for dispatched messages.
- **T1.32.5**: Verifies zero chat logs leak during integrated flows.

#### Feature 33: Tier 3 Test Suite: Webhook Simulation (E2E Track)
- **T1.33.1**: Simulates inbound Meta Messenger `POST` requests with NextRequest.
- **T1.33.2**: Simulates inbound TikTok Open API `POST` requests with NextRequest.
- **T1.33.3**: Verifies echo suppression prevents outbound reply loop.
- **T1.33.4**: Tests multi-tenant channel router rejecting unknown channels without throwing.
- **T1.33.5**: Verifies outbound dispatch SLA is maintained under simulated load.

#### Feature 34: Tier 4 Test Suite: E2E Workflows (E2E Track)
- **T1.34.1**: Validates complete customer checkout flow from inquiry to voucher.
- **T1.34.2**: Verifies stock decrement after order finalization.
- **T1.34.3**: Verifies Telegram order alert payload.
- **T1.34.4**: Verifies forensic database cleanliness after multi-turn conversational workflow.
- **T1.34.5**: Simulates multi-channel concurrent sessions for different tenants.

#### Feature 35: 100% E2E Test Suite Execution (M5)
- **T1.35.1**: 100% of defined tests in Tiers 1-4 pass cleanly with zero failures.
- **T1.35.2**: Test report summary displays `FAILED: 0`.
- **T1.35.3**: Next.js production build (`npm run build`) exits 0 with zero type errors.
- **T1.35.4**: Linter (`npm run lint`) completes with zero blocking errors.
- **T1.35.5**: Git status reflects clean working directory without leftover temp files.

#### Feature 36: Tier 5 Adversarial Coverage Hardening (M5)
- **T1.36.1**: Adversarial zero-chat probe verifies database schema and banned methods.
- **T1.36.2**: Database poisoning attack test confirms unexpected keys are auto-purged on disk write.
- **T1.36.3**: 100-request webhook flood test verifies zero payload string leakage in `data/db.json`.
- **T1.36.4**: High-concurrency stress test passes without memory leaks or race conditions.
- **T1.36.5**: Forensic disk audit verifies only `db.json` exists in `data/` directory.

---

## 5. Tier 2 Test Suite: Boundary & Corner Cases (>=5 Tests per Feature)

Every feature where boundaries exist is tested with >=5 extreme edge cases.

| Feature | Edge Case # | Input Condition | Expected Boundary Behavior |
|---|---|---|---|
| **F1: Shop Auth** | T2.1.1 | Empty shop name (`""`) | Rejects or assigns fallback name without crashing |
| | T2.1.2 | Invalid email format (`"notanemail"`) | Handled gracefully without DB corruption |
| | T2.1.3 | Huge string (100KB shop name) | Preserved or sanitized without buffer overflow |
| | T2.1.4 | Unicode emoji shop name (`"ရွှေဆိုင် 💎✨"`) | Persisted and retrieved with perfect Unicode fidelity |
| | T2.1.5 | Concurrent writes to same shop ID | Last write wins consistently without file corruption |
| **F3: Products** | T2.3.1 | Stock decrement below 0 (`delta: -999`) | Clamped at 0; `stockQuantity` is never negative |
| | T2.3.2 | Stock count 0 | `isAvailable` automatically set to `false` |
| | T2.3.3 | Negative price (`priceMmk: -500`) | Rejected or clamped by validation |
| | T2.3.4 | Duplicate SKU under same shop | Updates existing product rather than creating duplicate |
| | T2.3.5 | Same SKU under different shops | Both shops maintain independent products (tenant isolation) |
| **F4: Orders** | T2.4.1 | Empty order items array (`items: []`) | Rejected or flagged as invalid voucher |
| | T2.4.2 | Total MMK 0 | Accepted if promotional or flagged appropriately |
| | T2.4.3 | Order without address details | Order status remains draft / prompts customer |
| | T2.4.4 | Invalid order status transition | Rejects illegal status transition |
| | T2.4.5 | Special characters in customer name (SQLi/XSS) | Escaped safely; no code injection |
| **F5: Zero-Chat** | T2.5.1 | Webhook flood with 1,000 distinct messages | Exactly 0 messages written to disk or database |
| | T2.5.2 | Injection of `conversations: [...]` into db.json | Automatically purged and deleted on next write |
| | T2.5.3 | Client calling `db.saveMessage(...)` | Throws TypeError; method does not exist |
| | T2.5.4 | Order created from chat | Order contains no reference to conversation/thread ID |
| | T2.5.5 | Reading disk file after 1,000 requests | Disk file contains strictly 4 root array keys |
| **F8: Zawgyi/Unicode** | T2.8.1 | Empty string (`""`) | Returns `false` / `""` without throwing |
| | T2.8.2 | Pure English text (`"Hello world"`) | `isZawgyi` returns `false`; text unchanged |
| | T2.8.3 | Complex Pali stacked consonant (`"သမ္မတ"`, `"ဥက္ကဋ္ဌ"`) | Detected as Unicode (false positive eliminated) |
| | T2.8.4 | Zawgyi Asat at end of string (`"မောင်\u1039"`) | Detected as Zawgyi and normalized |
| | T2.8.5 | Mixed Unicode and Zawgyi in single message | Normalized into coherent standard Unicode |
| **F9: Burmese Digits** | T2.9.1 | Burmese digits mixed with English (`"Phone 09-၇၉၈၇၆၅၄၃၂"`) | Converted to `"Phone 09-798765432"` |
| | T2.9.2 | Shan numerals (`"႐႑႒႓႔႕႖႗႘႙"`) | Converted to `"0123456789"` |
| | T2.9.3 | Thai numeral zero (`"๐"`) | Converted to `"0"` |
| | T2.9.4 | Burmese numbers with comma separators (`"၂၅,၀၀၀"`) | Converted to `"25,000"` |
| | T2.9.5 | Text containing no digits | Returned verbatim without mutation |
| **F10: Letter Wa** | T2.10.1 | Wa at start of phone number (`"ဝ၉..."`) | Converted to `"09..."` |
| | T2.10.2 | Wa between digits (`"09-798-ဝ12-345"`) | Converted to `"09-798-012-345"` |
| | T2.10.3 | Real Burmese word starting with Wa (`"ဝယ်ယူမည်"`) | Wa preserved; not converted to zero |
| | T2.10.4 | Real Burmese word inside sentence (`"အဝတ်အထည် ဝယ်ချင်လို့"`) | Wa preserved in both words |
| | T2.10.5 | Multiple adjacent Wa in number (`"ဝဝ9798765432"`) | Both Wa converted to `"009798765432"` |
| **F11: Phone Norm** | T2.11.1 | International `+959` format (`"+959798765432"`) | Normalized to `"09798765432"` |
| | T2.11.2 | Prefix `00959` format (`"00959798765432"`) | Normalized to `"09798765432"` |
| | T2.11.3 | Missing leading zero (`"9798765432"`) | Normalized to `"09798765432"` |
| | T2.11.4 | Malformed phone (too short: `"09123"`) | Returns `""` (rejected) |
| | T2.11.5 | Malformed phone (letters/noise: `"09-ABC-XYZ"`) | Returns `""` (rejected) |
| **F12: Diacritics** | T2.12.1 | Duplicate Visarga (`"ပြီးးးး"`) | Collapsed to single Visarga `"ပြီး"` |
| | T2.12.2 | Duplicate Dot Below (`"တဲ့့့"`) | Collapsed to single Dot Below `"တဲ့"` |
| | T2.12.3 | Inverted tone marks (`\u1038\u1037`) | Reordered to canonical `\u1037\u1038` |
| | T2.12.4 | Medials before E-vowel | Standardized to Unicode canonical order |
| | T2.12.5 | String with 50 duplicate tone marks | Deduplicated instantly without regex stack overflow |
| **F13: Townships** | T2.13.1 | Unknown township (`"Atlantis"`) | Returns `null` cleanly |
| | T2.13.2 | Query with typo (`"Sanchaun"`) | Substring or fuzzy matching attempts match |
| | T2.13.3 | Query with suffix (`"စမ်းချောင်းမြို့နယ်"`) | Suffix stripped; matches Sanchaung |
| | T2.13.4 | Query with metro prefix (`"Yangon Kamayut"`) | Prefix stripped; matches Kamayut |
| | T2.13.5 | Empty township query (`""`) | Returns `null` without throwing |
| **F14: Bus Gates** | T2.14.1 | Regional bus gate query (`"အောင်မင်္ဂလာ"`) | Returns 3,500 MMK and enforces prepaid |
| | T2.14.2 | Bus gate query in English (`"Dagon Ayeyar"`) | Returns Dagon Ayeyar Bus Terminal |
| | T2.14.3 | Highway cargo keyword (`"ကားဂိတ်ချပေးပါ"`) | `isRegionalPrepaidOnly` returns `true` |
| | T2.14.4 | Metro city query (`"Mandalay"`) | `isRegionalPrepaidOnly` returns `false` (COD allowed) |
| | T2.14.5 | Remote state query (`"Taunggyi"`) | `isRegionalPrepaidOnly` returns `true` |
| **F15: FB Webhook** | T2.15.1 | Missing `hub.challenge` param | Returns HTTP 403 Forbidden |
| | T2.15.2 | Invalid verify token (`"wrong_token"`) | Returns HTTP 403 Forbidden |
| | T2.15.3 | Missing `hub.mode` param | Returns HTTP 403 Forbidden |
| | T2.15.4 | Malformed JSON in POST body | Returns HTTP 500 without server crash |
| | T2.15.5 | Non-page event (`object: "user"`) | Returns HTTP 404 NOT_A_PAGE_EVENT |
| **F16: FB Dispatch** | T2.16.1 | Message text > 2000 chars | Truncated to 2000 chars ending with ellipsis |
| | T2.16.2 | Empty message text (`""`) | Rejected with `{ success: false, error: ... }` |
| | T2.16.3 | Missing recipient PSID (`""`) | Rejected with `{ success: false, error: ... }` |
| | T2.16.4 | Missing access token (`""`) | Rejected with `{ success: false, error: ... }` |
| | T2.16.5 | Network timeout simulation | Handles timeout gracefully without unhandled rejection |
| **F18: TikTok** | T2.18.1 | Webhook with unknown `shop_id` | Returns `{ code: 0, message: 'no_tenant' }` |
| | T2.18.2 | Webhook with empty message text | Acknowledged with code 0 without AI dispatch |
| | T2.18.3 | Malformed JSON body | Returns HTTP 500 without crashing |
| | T2.18.4 | TikTok challenge query string | Echoes challenge with HTTP 200 |
| | T2.18.5 | Missing access token for TikTok send | Fails gracefully with descriptive error |
| **F20: Routing** | T2.20.1 | Unknown FB Page ID (`"999999999"`) | Returns `null`; dispatches zero messages |
| | T2.20.2 | Unknown TikTok App Key (`"tt_unknown"`) | Returns `null`; dispatches zero messages |
| | T2.20.3 | Page ID belonging to Shop 1 | Never routes to Shop 2 (strict isolation) |
| | T2.20.4 | Empty channel identifier (`""`) | Returns `null` without throwing |
| | T2.20.5 | Special characters in channel ID | Escaped and compared safely |
| **F22: AI Intents** | T2.22.1 | Ambiguous message (`"အင်း"`) | Handled with courteous general inquiry response |
| | T2.22.2 | Multi-intent message (Price + Delivery) | Responds with both item price and delivery fee |
| | T2.22.3 | Pure emojis (`"🥰❤️🛍️"`) | Handled gracefully with warm greeting |
| | T2.22.4 | Extremely long customer message (5,000 chars) | Processed without buffer overflow |
| | T2.22.5 | Message in mixed Zawgyi and Burglish | Normalized and classified accurately |
| **F25: Checkout** | T2.25.1 | Customer gives 3 of 5 attributes | Generates prompt asking specifically for 2 missing attributes |
| | T2.25.2 | Customer selects COD for regional city | Rejects COD; prompts for KPay/WavePay |
| | T2.25.3 | Customer provides phone with letter Wa | Normalized to `09XXXXXXXXX` in order draft |
| | T2.25.4 | Customer orders quantity greater than stock | Prompts customer with remaining stock limit |
| | T2.25.5 | Customer provides invalid payment method | Prompts with supported methods (KPay, Wave, COD) |
| **F27: Voucher** | T2.27.1 | Order for multiple line items | Calculates item subtotals and grand total accurately |
| | T2.27.2 | Delivery fee 0 (free delivery promo) | Formats 0 MMK delivery fee without crashing |
| | T2.27.3 | Customer name with special symbols | Rendered cleanly in voucher text |
| | T2.27.4 | Stock decrement for exact stock count | Reduces stock to 0; marks unavailable |
| | T2.27.5 | Order voucher Burmese formatting | Uses correct currency symbol (`ကျပ်`) and spacing |
| **F28: Telegram** | T2.28.1 | Empty bot token | Returns `false` cleanly without HTTP request |
| | T2.28.2 | Empty chat ID | Returns `false` cleanly without HTTP request |
| | T2.28.3 | Telegram API returns HTTP 400 | Caught and logged; does not break checkout |
| | T2.28.4 | Telegram API network timeout | Caught gracefully without unhandled rejection |
| | T2.28.5 | Markdown characters in customer name | Escaped to prevent Markdown parse error |

---

## 6. Tier 3 Test Suite: Cross-Feature Interaction Matrix

Tier 3 validates end-to-end combinations across multiple architectural layers:

```
+----------------------------------------------------------------------------------------------------+
|                                  TIER 3 PAIRWISE TEST PIPELINE                                     |
|                                                                                                    |
|  [Inbound Webhook] ---> [Tenant Router] ---> [Burmese Normalizer] ---> [Product Catalog Search]     |
|      (FB / TikTok)         (Yangon / MDY)        (Zawgyi / Unicode)          (In-Stock / Out)      |
|                                                                                     |              |
|  [Zero-Chat Probe] <--- [Stock Decrement] <--- [Voucher & Alert]  <--- [Logistics & Payment Check] |
|   (Forensic Disk)         (Atomic Check)       (Burmese / Telegram)       (COD vs Prepaid Gate)    |
+----------------------------------------------------------------------------------------------------+
```

### Pairwise Test Matrix

| Test ID | Tenant Shop | Inbound Channel | Input Encoding | Product Query | Delivery Township | Payment Method | Expected End-to-End Pipeline Behavior |
|---|---|---|---|---|---|---|---|
| **T3.1** | Shop 1 (Yangon) | Facebook Messenger | Legacy Zawgyi | Niacinamide Serum (`ဆီရမ္`) | Sanchaung (Yangon) | Cash on Delivery (COD) | Routes to Yangon shop -> Zawgyi normalized to Unicode -> Serum matched -> Sanchaung fee 2,500 MMK -> COD accepted -> Voucher created -> Stock decremented from 15 to 14 -> Zero chat in DB. |
| **T3.2** | Shop 2 (Mandalay) | Facebook Messenger | Standard Unicode | Silk Longyi (`မန္တလေး ချည်ပိုးထည်`) | Chanayethazan (Mandalay) | KBZPay | Routes to Mandalay shop -> Silk Longyi matched -> Chanayethazan fee 3,000 MMK -> KPay payment details provided -> Voucher created -> Stock decremented -> Zero chat in DB. |
| **T3.3** | Shop 1 (Yangon) | TikTok Open API | Burglish Slang | Vintage Bag (`instock shi lr`) | Taunggyi (Shan State) | KBZPay (Prepaid) | Routes to Yangon shop -> Burglish normalized -> Vintage Bag matched -> Taunggyi triggers Highway Bus Gate routing -> COD rejected; Prepaid enforced -> KPay selected -> Voucher created -> Stock decremented -> Zero chat in DB. |
| **T3.4** | Shop 2 (Mandalay) | TikTok Open API | Standard Unicode | Cotton Shirt (`ရှပ်အင်္ကျီ`) | Kyaukse (Regional) | WavePay (Prepaid) | Routes to Mandalay shop -> Cotton Shirt matched -> Kyaukse fee calculated -> WavePay selected -> Voucher created -> Stock decremented -> Zero chat in DB. |
| **T3.5** | Shop 1 (Yangon) | Facebook Messenger | Mixed Zawgyi + Letter Wa | Out-of-Stock Item | Kamayut (Yangon) | COD | Routes to Yangon shop -> Out-of-stock detected -> Informs customer politely -> Prevents order voucher creation -> Zero stock deduction -> Zero chat in DB. |
| **T3.6** | Shop 1 (Yangon) | Facebook Messenger | Letter Wa in Phone (`ဝ၉၇၉၈...`) | French Floral Dress | Bahan (Yangon) | COD | Wa converted to 0 -> Phone normalized to `09798...` -> Dress matched -> Bahan fee 2,500 MMK -> Order finalized -> Stock decremented -> Zero chat in DB. |
| **T3.7** | Unknown Tenant | Facebook Messenger | Standard Unicode | Any | Any | Any | Unknown Page ID -> Strictly rejected -> Outbound dispatch skipped -> Returns HTTP 200 without throwing -> Zero chat in DB. |
| **T3.8** | Unknown Tenant | TikTok Open API | Standard Unicode | Any | Any | Any | Unknown Shop ID -> Returns `{ code: 0, message: 'no_tenant' }` -> Outbound dispatch skipped -> Zero chat in DB. |

---

## 7. Tier 4 Test Suite: Real-World Workload Scenarios

Tier 4 executes 5 complete, multi-turn customer journeys reflecting real-world Myanmar online shopping behavior.

---

### Scenario 1: Yangon Customer via Facebook Messenger (COD Order)
- **Persona**: Ma Hnin from Sanchaung Township, Yangon.
- **Channel**: Facebook Messenger (Page ID: `109283746501928` -> Shop: `Aung Thukha Beauty`).
- **Turn 1 (Product & Price Inquiry)**:
  - Customer input: `"ဟယ်လို ဆီရမ် ဈေးဘယ်လောက်လဲရှင့်"`
  - Expected agent response: Greets warmly with `မင်္ဂလာပါရှင့်`, states Niacinamide Serum price (28,000 MMK), in-stock status (15 in-stock).
- **Turn 2 (Delivery Fee Inquiry)**:
  - Customer input: `"စမ်းချောင်း မြို့နယ် ပို့ခ ဘယ်လောက်ကျလဲ"`
  - Expected agent response: Identifies Sanchaung Township, quotes 2,500 MMK delivery fee, 1-2 days timeline, confirms COD is available.
- **Turn 3 (Checkout & Order Placement)**:
  - Customer input: `"၁ ဘူး ယူမယ်ရှင့်။ မနှင်းနွယ်၊ ၀၉-၇၉၈၇၆၅၄၃၂၊ အမှတ် ၁၂၊ ဗဟိုလမ်း၊ စမ်းချောင်း။ အိမ်ရောက်ငွေချေမယ်"`
  - Expected agent response:
    - Normalizes phone with Burmese numerals to `09798765432`.
    - Generates complete Burmese order voucher (`ဘောက်ချာ`):
      * Subtotal: 28,000 MMK
      * Delivery Fee: 2,500 MMK
      * Total: 30,500 MMK
      * Payment: Cash on Delivery (COD)
    - Decrements Serum stock from 15 to 14 in catalog.
    - Saves order in database with `platform: 'facebook'` and `customerPlatformId`.
    - Dispatches outbound FB reply via Meta Graph API mock.
- **Turn 4 (Zero-Chat Forensic Audit)**:
  - Inspects `data/db.json` on disk: verifies order is saved, Serum stock is 14, and zero chat lines exist in database.

---

### Scenario 2: Mandalay Customer via Facebook Messenger in Zawgyi (KPay Order)
- **Persona**: Ko Ye Yint from Chanayethazan Township, Mandalay.
- **Channel**: Facebook Messenger (Page ID: `209384756102938` -> Shop: `Mandalay Trendy Closet`).
- **Turn 1 (Product Inquiry in Zawgyi)**:
  - Customer input (Zawgyi): `"မႏၲေလး ပုဆိုး ရွိလား ေစ်းဘယ္ေလာက္လဲ"`
  - Expected agent response:
    - Auto-detects Zawgyi (`isZawgyi` = true).
    - Normalizes to Unicode: `"မန္တလေး ပုဆိုး ရှိလား ဈေးဘယ်လောက်လဲ"`.
    - Matches Traditional Silk Longyi (45,000 MMK, 20 in-stock).
    - Replies in clean Unicode.
- **Turn 2 (Order Placement & Payment Request)**:
  - Customer input (Zawgyi): `"၂ ထည္ ယူမယ္ ခ်မ္းေအးသာစံ KPay နဲ့ ရွင္းမယ္"`
  - Expected agent response:
    - Normalizes to Unicode, detects quantity 2 and Chanayethazan Township.
    - Calculates subtotal: 90,000 MMK, delivery fee: 3,000 MMK, total: 93,000 MMK.
    - Provides Mandalay shop's KPay details (`09451122334 - Ko Ye Yint Aung`).
    - Prompts for recipient name, phone, and delivery address.
- **Turn 3 (Checkout Completion with Phone Typo)**:
  - Customer input: `"ကိုရဲရင့် ၀၉-၄၅၁၁၂၂၃၃၄၊ ၃၅ လမ်း၊ ၇၈ လမ်းထောင့်"`
  - Expected agent response:
    - Normalizes phone with letter Wa / Burmese digits to `09451122334`.
    - Creates finalized order record in Mandalay shop's database.
    - Decrements Silk Longyi stock from 20 to 18.
    - Status set to `pending_slip` awaiting KPay transfer.
- **Turn 4 (Forensic Multi-Tenant Isolation Audit)**:
  - Verifies Mandalay shop has 1 order; Yangon shop has 0 orders from this transaction.
  - Verifies zero chat messages stored.

---

### Scenario 3: Taunggyi Customer via TikTok (Highway Bus Gate & Prepaid Policy)
- **Persona**: Ma May Thu from Taunggyi, Shan State.
- **Channel**: TikTok Open API (Channel: `ch-tt-01` -> Shop: `Aung Thukha Beauty`).
- **Turn 1 (Inquiry in Burglish Slang)**:
  - Customer input: `"hello admin, Vintage Bag classic brown instock shi lr? Taunggyi delivery ya lr?"`
  - Expected agent response:
    - Classifies Burglish slang: matches Vintage Leather Crossbody Bag (35,000 MMK).
    - Identifies Taunggyi destination: quotes Highway Bus Gate routing (Aung Mingalar Terminal).
    - Informs that regional delivery is **100% Prepaid Only** (COD not available for Taunggyi).
- **Turn 2 (Customer Attempts COD)**:
  - Customer input: `"COD nae ya ag loke pay par lar?"`
  - Expected agent response:
    - Enforces strict logistics policy: politely explains regional gate cargo cannot accept COD.
    - Re-iterates KPay/WavePay prepaid requirement and quotes gate drop-off fee (3,500 MMK).
- **Turn 3 (Agreement to KPay & Checkout)**:
  - Customer input: `"ok kpay nae lwal mal. 1 lone yu mal. Ma May Thu, 09-250099887, Taunggyi Myoma Market, Aung Mingalar gate ka tin pay par"`
  - Expected agent response:
    - Extracts 1 Bag, Name, Phone (`09250099887`), Gate drop-off address.
    - Calculates subtotal: 35,000 MMK, gate fee: 3,500 MMK, total: 38,500 MMK.
    - Provides KPay account details.
    - Generates order voucher.
    - Decrements Bag stock from 4 to 3.
- **Turn 4 (Verification)**:
  - Verifies TikTok mock spy recorded outbound messages.
  - Verifies disk database has order marked `kpay` with zero chat lines stored.

---

### Scenario 4: Burglish Bargaining, Item Switch & Wa Typo Checkout
- **Persona**: Ko Min Min from Bahan Township, Yangon.
- **Channel**: Facebook Messenger (Page ID: `109283746501928`).
- **Turn 1 (Discount Inquiry on Out-of-Stock Item)**:
  - Customer input: `"admin discount shi lr? French Floral Dress instock shi lr?"`
  - Expected agent response: Confirms French Floral Dress is in stock (8 left, 38,000 MMK).
- **Turn 2 (Switching Items & Asking Total)**:
  - Customer input: `"Dress 1 htae nae Serum 1 boo yu mal Bahan delivery bl lout ll?"`
  - Expected agent response:
    - Matches 2 distinct products: Dress (38,000 MMK) + Serum (28,000 MMK) = 66,000 MMK subtotal.
    - Calculates Bahan delivery fee: 2,500 MMK.
    - Combined Total: 68,500 MMK.
- **Turn 3 (Closing with Letter Wa in Phone)**:
  - Customer input: `"Bahan ko CODပို့ပေး။ ကိုမင်းမင်း ၀၉-၇၉ဝ၁၂၃၄၅၆၊ ရွှေတောင်ကြားလမ်း"`
  - Expected agent response:
    - Normalizes phone typo (`ဝ၉-၇၉ဝ၁၂၃၄၅၆` contains both Burmese digit and letter Wa) -> `09790123456`.
    - Finalizes 2-item order voucher: 68,500 MMK COD.
    - Decrements Dress stock (8 -> 7) and Serum stock (14 -> 13).
- **Turn 4 (Verification)**:
  - Both catalog items decremented accurately.
  - Zero chat lines written to database.

---

### Scenario 5: High-Concurrency Multi-Tenant Webhook Flood & Forensic Audit
- **Workload**: 100 simultaneous inbound webhooks:
  - 50 Facebook Messenger webhooks targeting Shop 1 (Yangon).
  - 30 Facebook Messenger webhooks targeting Shop 2 (Mandalay).
  - 20 TikTok Open API webhooks targeting Shop 1 (Yangon).
  - Webhook payloads contain sensitive customer data, Burmese text, and synthetic canary strings (`CONFIDENTIAL_CHAT_CANARY_XXX`).
- **Assertions**:
  1. All 100 webhooks return HTTP 200 within SLA (< 3s each).
  2. Multi-tenant routing strictly separates Shop 1 and Shop 2 traffic.
  3. Outbound Facebook and TikTok spies record all 100 outbound replies.
  4. Disk database file `data/db.json` is inspected:
     - Strict check: Canary string search returns 0 occurrences.
     - Strict check: Root keys remain strictly `["channels", "orders", "products", "shops"]`.
     - Strict check: No `conversations`, `messages`, `threads`, or `logs` keys exist.
     - Strict check: Data directory contains only `db.json` (zero rogue log files).

---

## 8. Mocking, Emulation & Forensic Audit Subsystems

### 8.1 In-Memory Social Channel Mock Mode
The system features automatic test mock mode detection:

```typescript
// Activates automatically in test environment or when using mock tokens
export function isFacebookMockMode(token?: string): boolean {
  if (process.env.MOCK_FACEBOOK === 'true' || process.env.MOCK_CHANNELS === 'true') return true;
  if (!token) return false;
  const lower = token.toLowerCase();
  return lower.includes('mock') || lower.startsWith('test_') || lower === 'mock-token';
}
```

### 8.2 Outbound Message Spies
Test spies record all dispatched messages purely in RAM without touching disk:
- `_mockFacebookSentMessages`: Array of `{ recipientId, messageText, timestamp }`.
- `_mockTikTokSentMessages`: Array of `{ conversationId, messageText, timestamp }`.
- `_resetMockFacebookMessages()` / `_resetMockTikTokMessages()`: Flush spy buffers before each test.

### 8.3 Forensic Database Probe
Automated probes verify disk and runtime database integrity:
1. **Root Key Filter**: Validates `Object.keys(dbJson).sort()` equals `['channels', 'orders', 'products', 'shops']`.
2. **Canary String Search**: Ensures zero chat text from simulated webhooks is found anywhere in `data/db.json`.
3. **Runtime Method Banning**: Verifies `db.getConversations`, `db.saveMessage`, `db.conversations` are all `undefined`.

---

## 9. Acceptance Criteria & Gate Validation Checklist

To pass the E2E verification gate, the system must satisfy 100% of the following requirements:

- [ ] **Execution**: `npm.cmd test` passes cleanly with exit code 0.
- [ ] **Feature Coverage**: All 36 features in `PROJECT.md` have >= 5 passing tests in Tier 1.
- [ ] **Boundary Coverage**: All features with input boundaries have >= 5 passing tests in Tier 2.
- [ ] **Pairwise Pipelines**: All 8 cross-feature interaction scenarios in Tier 3 pass cleanly.
- [ ] **Customer Journeys**: All 5 real-world workload scenarios in Tier 4 pass cleanly.
- [ ] **Zero-Chat Guarantee**: Forensic audit verifies zero message tables, columns, or files exist.
- [ ] **Performance SLA**: Normalization, routing, and offline AI processing complete in < 3s.
- [ ] **Build Cleanliness**: `npm run build` succeeds with zero TypeScript or bundling errors.
