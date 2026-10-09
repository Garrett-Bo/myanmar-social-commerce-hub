# Project: Myanmar AI Social Commerce SaaS Platform

## Architecture
- **Multi-Tenant Foundation**: Complete tenant isolation across registered online shops. Each shop has distinct credentials, product catalogs, and order vouchers.
- **Critical Zero Chat Storage Architecture**: Chat histories and messages are **NEVER** stored in the database to keep storage costs at zero. Live conversation threads and message histories are fetched on-demand from Facebook Graph API and TikTok API, or processed ephemerally in-memory.
- **Database Persistence**: Persistent store (Supabase PostgreSQL with Row Level Security (RLS) policies, backed by persistent local JSON store in dev/offline mode) persisting strictly:
  1. `shops`: Shop metadata and merchant profile.
  2. `channel_connections`: Channel platform, page ID, access token, and webhook credentials.
  3. `products`: Catalog items, pricing in MMK, and stock counts.
  4. `orders`: Finalized sales vouchers, items, delivery fee, customer name/phone/address, payment method, and payment slips.
- **Burmese NLP & Normalization Tier**:
  - Auto-detection and bidirectional normalization of Burmese Unicode and Zawgyi encodings.
  - Number & phone normalizer translating Burmese numerals (`၀-၉`), Thai zero (`๐`), and letter Wa (`ဝ`) typos to standardized Arabic numerals and `09XXXXXXXXX` format.
  - Canonical tone mark ordering.
- **Logistics & Delivery Tier**:
  - 58 verified Myanmar townships across Yangon (34), Mandalay (7), Naypyitaw (6), Regional (11), and Highway Express Bus Gates (3).
  - Accurate delivery fees and timelines in MMK with COD availability rules (COD supported for Yangon/Mandalay; 100% Prepaid for regional highway bus gates).
- **Social Channel Webhook Hub**:
  - Facebook Messenger: `hub.challenge` verification, tenant routing by `pageId`, outbound Meta Graph API dispatch using tenant's `accessToken` (< 3s SLA), on-demand thread/message fetchers.
  - TikTok Open API: Webhook processing, tenant routing, outbound messaging, and on-demand conversation list fetching.
- **AI Sales Agent**:
  - Multi-intent classification (Price, Stock, Discount, Buy, Payment, Slip, Delivery, Human takeover) with Burglish slang support.
  - Stock verification, 5-attribute checkout collection, order finalization, stock deduction, and Telegram alert formatting.
- **Testing Architecture**:
  - Fast Vitest test suite running via `npm.cmd test`.
  - 4-Tier test coverage (Unit, Integration, Webhook Simulation, E2E) + Tier 5 Adversarial Coverage Hardening.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Multi-Tenant Shop Profile & Auth Persistence | Store merchant shops with independent credentials and isolation. | M1 | ORIGINAL_REQUEST R1 |
| 2 | Channel Connections Persistence | Store Facebook/TikTok channel credentials with `accessToken` and `pageId`. | M1 | ORIGINAL_REQUEST R1 |
| 3 | Product Catalog & Inventory Persistence | Store SKU, MMK pricing, stock counts per shop with tenant isolation. | M1 | ORIGINAL_REQUEST R1 |
| 4 | Finalized Orders & Vouchers Persistence | Store finalized orders referencing external customer platform ID. | M1 | ORIGINAL_REQUEST R1 |
| 5 | Zero Chat Storage Invariant | Strict architectural guarantee: zero message/conversation tables in DB. | M1 | User Directive / R1 |
| 6 | Disk / DB Persistence Across Restarts | Persistent storage surviving server restarts (file/PostgreSQL). | M1 | ORIGINAL_REQUEST AC |
| 7 | Supabase PostgreSQL Schema & RLS Policies | Production `.sql` migration with Row-Level Security for all tables. | M1 | ORIGINAL_REQUEST R1 |
| 8 | Zawgyi vs Unicode Auto-Detector & Converter | Detects and converts Zawgyi text to standard Unicode. | M2 | ORIGINAL_REQUEST R3 |
| 9 | Burmese Digit to Arabic Normalizer | Converts Myanmar digits `၀-၉`, Thai `๐`, Shan digits to `0-9`. | M2 | Survey / Spec Miner |
| 10 | Letter Wa vs Zero Phone Typo Correction | Contextually corrects letter Wa `ဝ` in numeric contexts to `0`. | M2 | Survey / Spec Miner |
| 11 | Myanmar Phone Normalizer | Normalizes all local/international formats into `09XXXXXXXXX`. | M2 | Survey / Spec Miner |
| 12 | Canonical Tone Mark Order Normalizer | Standardizes Unicode diacritic order and removes duplicates. | M2 | Survey / Spec Miner |
| 13 | 45+ Myanmar Townships Matrix | Comprehensive delivery matrix for 58 verified townships. | M2 | ORIGINAL_REQUEST R3 |
| 14 | Regional Highway Bus Gate Routing | Quotes gate drop-off fee and enforces 100% prepaid requirement. | M2 | ORIGINAL_REQUEST R3 |
| 15 | Facebook Messenger Webhook Handshake | Verifies `hub.mode === 'subscribe'` and returns `hub.challenge` (HTTP 200). | M3 | ORIGINAL_REQUEST AC |
| 16 | Outbound Meta Graph API Dispatch | Sends replies via `POST /v21.0/me/messages` using tenant `accessToken`. | M3 | ORIGINAL_REQUEST R2 |
| 17 | On-Demand Facebook Chat Pulling | Pulls threads/messages on-the-fly (`GET /{page_id}/conversations`). | M3 | User Directive / R2 |
| 18 | TikTok Open API Inbound & Outbound | Processes TikTok webhooks and sends outbound replies. | M3 | ORIGINAL_REQUEST R2 |
| 19 | On-Demand TikTok Chat Pulling | Pulls conversation lists on-the-fly via TikTok API. | M3 | User Directive / R2 |
| 20 | Strict Multi-Tenant Channel Routing | Maps channel ID to shop, returning `null` on unknown channel. | M3 | Survey Explorer 3 |
| 21 | Stateless Live Chat Ephemeral UI | Live chat view fetching on-demand without writing to DB. | M3 | User Directive / AC |
| 22 | Burmese Conversational Intent Classifier | Identifies Price, Stock, Discount, Buy, Payment, Slip, Delivery, Human. | M4 | ORIGINAL_REQUEST R3 |
| 23 | Burglish & Slang Recognition | Maps common romanized Burmese slang to conversational intents. | M4 | Survey / Spec Miner |
| 24 | Real-time Product & MMK Stock/Price Matching | Matches queries to catalog, checks inventory, formats MMK prices. | M4 | ORIGINAL_REQUEST R3 |
| 25 | 5-Attribute Checkout Data Collector | Collects Name, Phone, Township, Address, Payment Method. | M4 | Survey / Spec Miner |
| 26 | Payment Slip & Transaction ID Handler | Handles KPay/WavePay slips and transaction references. | M4 | ORIGINAL_REQUEST R3 |
| 27 | Burmese Order Voucher Generator & Stock Decrement | Creates formatted Burmese voucher and decrements catalog stock. | M4 | Survey / Spec Miner |
| 28 | Telegram Seller Instant Order Alert | Dispatches real-time markdown order alert to shop's Telegram. | M4 | Survey / Spec Miner |
| 29 | Response Latency SLA (< 3s) | Pipeline (normalize -> AI/rule -> outbound API) completes in < 3s. | M4 | ORIGINAL_REQUEST AC |
| 30 | Test Runner Configuration (`npm.cmd test`) | Configures Vitest for TypeScript ESM testing. | E2E Track | ORIGINAL_REQUEST R4 |
| 31 | Tier 1 Test Suite: Unit Tests | Tests normalization, townships, tenant isolation offline. | E2E Track | ORIGINAL_REQUEST R4 |
| 32 | Tier 2 Test Suite: Integration Tests | Tests AI agent, Facebook/TikTok clients with mock endpoints. | E2E Track | ORIGINAL_REQUEST R4 |
| 33 | Tier 3 Test Suite: Webhook Simulation | Simulates inbound webhooks, multi-tenant routing, SLA < 3s. | E2E Track | ORIGINAL_REQUEST R4 |
| 34 | Tier 4 Test Suite: E2E Workflows | Validates complete order checkout and zero-chat DB invariant. | E2E Track | ORIGINAL_REQUEST R4 |
| 35 | 100% E2E Test Suite Execution | Executes full test suite passing cleanly (`npm.cmd test`). | M5 | ORIGINAL_REQUEST AC |
| 36 | Tier 5 Adversarial Coverage Hardening | White-box edge-case tests, stress tests, forensic audit clean. | M5 | Dual-Track Phase 2 |
| 37 | Multi-Tenant Subscription Plans & Quotas | 3 plans (Starter: Free, Pro: 25k MMK, Business: 60k MMK) & quota tracking. | M6 | Strategic PM |
| 38 | 3-Tier Zero-Marginal-Cost AI Router | Local NLP ($0.00) + token-budgeted LLM + Merchant BYOK. | M6 | Strategic PM |
| 39 | SaaS Provider Executive Console (`/provider`) | Live MRR, COGS telemetry, scale economics simulator, and tenant management. | M6 | Strategic PM |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Multi-Tenant Database Persistence & Zero-Chat Storage | PostgreSQL Supabase schema with RLS, disk persistence fallback in `db.ts`, zero-chat models, updated types. | none | DONE |
| M2 | Burmese NLP, Digit Normalization & Logistics Matrix | Zawgyi/Unicode converter, Burmese/Thai digit normalization, phone correction, 58 townships/bus gates delivery lookup. | none | DONE |
| M3 | Social Channels & On-Demand Messaging | Facebook & TikTok webhooks, outbound Graph API/TikTok dispatch, on-demand chat fetchers, strict multi-tenant routing. | M1 | DONE |
| M4 | AI Sales Closing Engine & Checkout Collection | Intent classifier, Burglish slang, MMK price/stock check, 5-attribute checkout collection, order voucher, stock decrement. | M1, M2, M3 | DONE |
| E2E | E2E Testing Track (Dual Track) | Comprehensive test runner (`npm.cmd test`), Tiers 1-4 real customer journeys, mock simulators, `TEST_INFRA.md`. | none | DONE |
| M5 | Final Milestone: E2E Verification & Hardening | Phase 1: 100% pass of E2E test suite (Tiers 1-4). Phase 2: Tier 5 adversarial coverage hardening & forensic integrity audit. | M1, M2, M3, M4, E2E | DONE |
| M6 | Low-Cost SaaS Provider Strategy & Governance | 3-tier zero-cost AI router, tenant quota engine, `/provider` executive console, and Myanmar merchant functional blueprint. | M1, M2, M3, M4, M5 | DONE |

## Interface Contracts

### M1 ↔ M3, M4 (Database Persistence)
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
- **CRITICAL INVARIANT**: No `conversations` or `messages` methods exist on `db`.

### M2 ↔ M3, M4 (Burmese NLP & Logistics)
- `normalizeBurmese(text: string): string` (auto-detects Zawgyi and converts to Unicode)
- `isZawgyi(text: string): boolean`
- `convertBurmeseDigits(text: string): string` (converts `၀-၉`, `๐`, `ဝ` in numbers to `0-9`)
- `normalizeMyanmarPhone(raw: string): string` (returns `09XXXXXXXXX`)
- `lookupTownshipDelivery(query: string): TownshipDeliveryInfo | null`
  - Returns `{ townshipEn, townshipMm, region, feeMmk, estimatedDays, isCodAvailable, notes? }`
- `isRegionalPrepaidOnly(townshipQuery: string): boolean`

### M3 ↔ M4 (Channel Dispatch & On-Demand Chat)
- `sendFacebookMessage(recipientId: string, messageText: string, pageAccessToken: string): Promise<{ success: boolean; messageId?: string; error?: string }>`
- `fetchFacebookConversations(pageId: string, pageAccessToken: string): Promise<Array<{ id: string; updatedTime: string; snippet: string; senderId: string; senderName?: string }>>`
- `fetchFacebookThreadMessages(threadId: string, pageAccessToken: string): Promise<Array<{ id: string; text: string; from: { id: string; name?: string }; createdTime: string }>>`
- `sendTikTokMessage(conversationId: string, messageText: string, accessToken: string): Promise<{ success: boolean; messageId?: string; error?: string }>`
- `fetchTikTokConversations(accessToken: string): Promise<Array<{ id: string; snippet: string; updatedAt: string }>>`

### M4 ↔ Database & Channel (AI Sales Engine)
- `processCustomerMessage(messageText: string, context: MessageContext): Promise<AgentResponse>`
  - `MessageContext`: `{ shop: Shop; products: Product[]; channel: ChannelConnection; senderPlatformId: string }`
  - `AgentResponse`: `{ replyText: string; intent: string; orderDraft?: Partial<Order>; completedOrder?: Order; confidence: number }`

## Code Layout
- `src/lib/db.ts`: Persistent multi-tenant database tier (Supabase client + local JSON fallback, zero-chat invariant)
- `src/types/index.ts`: Core data types (`Shop`, `Product`, `Order`, `ChannelConnection` with `accessToken`, `TownshipDeliveryInfo`)
- `src/lib/burmese-converter.ts`: Unicode/Zawgyi detection & conversion, Burmese/Thai digit normalization, phone sanitizer
- `src/lib/myanmar-townships.ts`: 58-township delivery matrix, bus gate routing, fee & timeline lookups
- `src/lib/facebook.ts`: Meta Graph API client (outbound sending, on-demand conversation & message fetching)
- `src/lib/tiktok.ts`: TikTok Open API client (outbound sending, on-demand conversation fetching)
- `src/lib/gemini-agent.ts`: Burmese AI sales closing agent, intent recognition, checkout collector, order voucher generator
- `src/lib/telegram.ts`: Telegram seller instant order alerts
- `src/app/api/webhooks/facebook/route.ts`: Facebook Messenger webhook verification and message handler
- `src/app/api/webhooks/tiktok/route.ts`: TikTok Open API webhook handler
- `supabase/migrations/001_multi_tenant_schema.sql`: PostgreSQL schema and RLS policies
- `tests/`: Vitest test suites (Tiers 1-4)
