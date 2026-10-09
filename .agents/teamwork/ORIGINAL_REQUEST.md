# Original User Request

## 2026-10-04T11:31:16Z (Updated with User Directive: Zero Chat Storage)

Build a production-ready, low-cost multi-tenant AI social commerce SaaS platform for Myanmar online shops, centralizing Facebook Messenger and TikTok customer conversations with automated Burmese sales closing, live inventory/price lookup, delivery fee calculation, and order tracking.

**CRITICAL USER ARCHITECTURAL CONSTRAINT**: 
"chat wont store on ourside we will jsut pull the tik tok and facebook api messaging .. it's expensive to store"
- Do NOT store chat history or message logs in our database.
- Pull conversations and message histories on-demand directly via Facebook Graph API and TikTok API.
- Our database only stores:
  1. Shop profile & auth
  2. Connected channel credentials (Page ID, Access Token)
  3. Product catalog & stock counts
  4. Finalized customer orders & vouchers (when a sale is closed)

Working directory: c:/Users/bobo/Documents/antigravity/fervent-hawking
Integrity mode: development

## Requirements

### R1. Multi-Tenant Shop & Catalog Persistence (Stateless Chat)
The platform must store only essential shop metadata, channel access tokens, product catalogs/stock, and finalized customer orders in a persistent database. Chat messages and conversation histories must NOT be stored in our database to keep storage costs at zero; chats must be fetched on-demand directly from Meta and TikTok APIs.

### R2. On-Demand Pull & Bidirectional Social Channel Messaging
The system must pull conversations on-the-fly from the Facebook Graph API (`/{page_id}/conversations`) and TikTok Direct Message API, route incoming messages to the owning shop's catalog and AI sales agent, and immediately dispatch automated Burmese replies back to the customer on Facebook Messenger via the Meta Graph API and TikTok Open API.

### R3. Burmese Sales Closing & Logistics Calculation
The AI sales agent must auto-detect and normalize both Burmese Unicode and Zawgyi encodings, understand local colloquialisms and slang, check real-time stock and prices in MMK, calculate accurate delivery fees and timelines across 45+ Myanmar townships and regional highway gates, and collect checkout details for KBZPay, WavePay, or Cash on Delivery (COD).

### R4. Automated Testing & Verification Suite
The platform must include comprehensive automated unit, integration, and webhook simulation test suites verifying tenant data isolation, on-demand chat fetching, Burmese text normalization, delivery fee accuracy, and outbound webhook delivery.

## Acceptance Criteria

### Zero Chat Storage & Tenant Persistence
- [ ] No message tables or conversation logs are persisted in the database; storage is strictly reserved for shops, products, and orders.
- [ ] Multiple registered shops can independently manage their catalogs and orders without cross-tenant visibility.

### On-Demand Channel Communication
- [ ] Live chat view pulls message history directly from Facebook Graph API using the shop's Page Access Token.
- [ ] Inbound messages trigger Burmese AI generation and an outbound Graph API call with the shop's Page Access Token within 3 seconds.

### Burmese Language & Delivery Accuracy
- [ ] Incoming messages in Zawgyi, Unicode, or mixed English/Burmese slang are normalized and accurately matched against catalog items.
- [ ] Township delivery calculations correctly return standard rates for Yangon, Mandalay, and regional bus gates.

### Verification Suite
- [ ] Automated test suite runs with all tests passing cleanly (`npm test`).
- [ ] Application builds without TypeScript or bundling errors (`npm run build`).


## 2026-10-05T02:00:36Z

Please resume execution of the teamwork project. The quota has reset and the user has instructed: "please proceed". Check GATE_STATUS.md and continue from Milestone 2 worker implementation.


## 2026-10-07T06:18:23Z

The user requested to proceed. Milestone 2 implementation and tests are complete with 127/127 passing assertions and worker_m2 handoff.md is recorded. Please proceed with Milestone 2 gate review and dispatch Milestone 3 (Social Channel Integrations, Facebook & TikTok Webhooks, On-Demand Chat Fetching, and Zero-Chat Invariant).


## 2026-10-08T07:31:41Z

User requested: "please proceed.. /teamwork-preview". Milestone 2 Iteration 2 is complete with PASS (596/596 test assertions passed, Next.js build clean exit 0, zero-chat invariant verified). Please proceed to Milestone 3 (Social Channels & Webhooks, Facebook & TikTok On-Demand Messaging, and Zero-Chat Invariant).


## 2026-10-09T03:00:10Z

User requested /teamwork-preview proceed. 

All foundation milestones (M1: Persistence & Zero-Chat Storage, M2: Burmese NLP & 61-Township Delivery Matrix, M3: Social Channels & On-Demand Messaging) have passed gates and certified clean.

Please resume execution:
1. Proceed with Milestone 4 implementation (AI Sales Closing Engine, Burmese 5-attribute conversational checkout, real-time stock check/decrement, MMK order voucher formatting, and Telegram notifications) following the blueprints in explorer_m4_1, explorer_m4_2, and explorer_m4_3 handoffs.
2. Advance the E2E Testing Track based on TEST_INFRA.md.
3. Keep the Zero-Chat Storage Invariant strictly enforced (chat messages/conversations must NEVER be stored in the database).
4. Run tests and report progress.
