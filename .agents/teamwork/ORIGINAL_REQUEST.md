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
