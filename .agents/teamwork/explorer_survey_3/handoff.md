# Survey Handoff: R2 (Bidirectional Social Channels) & R4 (Testing Suite)

## 1. Observation

### Current Codebase & Environment Facts
1. **OS and Environment**:
   - OS: Windows 11.
   - Node: `v24.19.0`. npm: `11.17.0`.
   - Windows PowerShell Execution Policy blocks `.ps1` scripts (`PSSecurityException: File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system`). Direct commands must invoke `npm.cmd` rather than `npm`.
   - `npm.cmd run build` executes `next build` successfully (Exit code 0, 12 static/dynamic routes compiled in 2.9s).

2. **Package Configuration (`package.json`)**:
   - `package.json` lines 5-10:
     ```json
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "next lint"
     }
     ```
   - Verbatim Observation: There is **no `"test"` script** defined in `package.json`.
   - There are **no test runner dependencies** installed (no Vitest, Jest, ts-node, mocha).
   - Zero test files (`*.test.ts`, `*.spec.ts`) exist in the project tree outside `node_modules`.

3. **Requirement R2: Facebook Messenger Webhook & Outbound Messaging**:
   - Webhook Verification GET Handler (`src/app/api/webhooks/facebook/route.ts` lines 8-22):
     ```typescript
     export async function GET(req: NextRequest) {
       const { searchParams } = new URL(req.url);
       const mode = searchParams.get('hub.mode');
       const token = searchParams.get('hub.verify_token');
       const challenge = searchParams.get('hub.challenge');
       const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'shwe_shop_fb_token_2026';
       if (mode === 'subscribe' && token === VERIFY_TOKEN) {
         return new Response(challenge, { status: 200 });
       }
       return new Response('Forbidden', { status: 403 });
     }
     ```
     Observed: Correctly verifies `hub.mode === 'subscribe'` and token match, returning `challenge` with HTTP 200.
   - Inbound Webhook POST Handler (`src/app/api/webhooks/facebook/route.ts` lines 25-88):
     - Parses `body.object === 'page'`, extracts `pageId = entry.id` and `webhookEvent = entry.messaging?.[0]`.
     - Calls `db.findShopByPageId(pageId)`.
     - Calls `normalizeBurmese(rawMessageText)`.
     - Calls `processCustomerMessage(normalized, { shop, products, ... })`.
     - Line 66:
       ```typescript
       const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || channel?.pageId;
       ```
       Observed Defect: If `process.env.FB_PAGE_ACCESS_TOKEN` is unset, it passes `channel?.pageId` (e.g. `'109283746501928'`) as the token to `sendFacebookMessage`. `pageId` is not an access token.
   - Outbound Meta Graph API Client (`src/lib/facebook.ts` lines 19-72):
     - Function `sendFacebookMessage(recipientId, messageText, pageAccessToken)` performs `POST https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`.
     - Payload: `{ recipient: { id: recipientId }, messaging_type: 'RESPONSE', message: { text: messageText } }`.
     - Handles HTTP success (returns `messageId`, `recipientId`) and failure gracefully.
     - Observed Missing Functionality: No methods exist for on-demand conversation pulling (`fetchFacebookConversations`) or on-demand message history retrieval (`fetchFacebookMessages`).

4. **Requirement R2: TikTok Open API Integration**:
   - Webhook Receiver (`src/app/api/webhooks/tiktok/route.ts` lines 7-42):
     - Receives `body.event === 'im.message.receive' || body.type === 'message'`.
     - Line 22: Hardcodes tenant and catalog: `shop: INITIAL_SHOP`, `products: INITIAL_PRODUCTS`.
     - Line 31: Verbatim comment: `// In production: send reply via TikTok Open API`. Outbound messaging is **unimplemented**.
     - Missing GET verification challenge / webhook handshake.
     - No TikTok client module exists (no `src/lib/tiktok.ts`).
     - No on-demand TikTok conversation or message fetching exists.

5. **Multi-Tenant Routing & Isolation**:
   - `src/lib/db.ts` lines 252-262:
     ```typescript
     async findShopByPageId(pageId: string): Promise<{ shop: Shop; channel: ChannelConnection } | null> {
       for (const [shopId, channelsList] of this.channels.entries()) {
         const match = channelsList.find((ch) => ch.pageId === pageId && ch.platform === 'facebook');
         if (match) {
           const shop = this.shops.get(shopId);
           if (shop) return { shop, channel: match };
         }
       }
       // Default fallback to initial shop if page ID not specifically configured
       return { shop: INITIAL_SHOP, channel: INITIAL_CHANNELS[0] };
     }
     ```
     Observed Multi-Tenant Risk: Lines 260-261 fall back to `INITIAL_SHOP` if an unknown `pageId` is received, creating cross-tenant data leakage risk.
     Observed: There is no `findShopByTikTokAccountId` or unified channel router.
   - `src/types/index.ts` lines 24-32:
     ```typescript
     export interface ChannelConnection {
       id: string;
       shopId: string;
       platform: PlatformType;
       accountName: string;
       pageId: string;
       isActive: boolean;
       avatarUrl?: string;
     }
     ```
     Observed: `ChannelConnection` lacks an `accessToken` field.

6. **Architectural Constraint Conflict: Zero Chat Storage**:
   - `ORIGINAL_REQUEST.md` lines 7-15:
     ```markdown
     "chat wont store on ourside we will jsut pull the tik tok and facebook api messaging .. it's expensive to store"
     - Do NOT store chat history or message logs in our database.
     - Pull conversations and message histories on-demand directly via Facebook Graph API and TikTok API.
     - Our database only stores:
       1. Shop profile & auth
       2. Connected channel credentials (Page ID, Access Token)
       3. Product catalog & stock counts
       4. Finalized customer orders & vouchers (when a sale is closed)
     ```
   - Current Codebase: `src/lib/db.ts` still declares `this.conversations` (Map) and `this.messages` (Map). `src/app/page.tsx` line 39 still queries `db.getConversations()` and line 48 queries `db.getMessages()`.

---

## 2. Logic Chain

1. **Test Runner Selection (R4)**:
   - *Observation*: Project runs Next.js 15.2 with React 19 and TypeScript 5.7. Node version is 24.19.0.
   - *Reasoning*: Jest requires complex ESM transformations, ts-jest or swc configurations, which often collide with Next.js 15 edge runtimes and modern ESM packages like `@google/genai`. Vitest natively supports TypeScript, ESM, path aliases (`@/*`), is lightweight, executes tests in sub-second times, and provides built-in mocking (`vi.fn`, `vi.mock`) and assertions without heavy Babel configurations.
   - *Deduction*: Vitest is the optimal test framework for this project. `package.json` should include `"test": "vitest run"` and devDependencies `vitest` (and `vite-tsconfig-paths` or `@testing-library/react` if UI component testing is added).

2. **Execution Environment Constraint (R4)**:
   - *Observation*: Windows execution policy blocks `.ps1` execution, causing `npm test` or `npm run build` to fail when run through standard PowerShell without execution policy bypass.
   - *Reasoning*: `npm.cmd` invokes `cmd.exe` directly, completely bypassing PowerShell's script execution policy.
   - *Deduction*: All agent invocations and documentation must specify `npm.cmd test` and `npm.cmd run build` (or `npm test` when spawned from inside Node child processes/npm scripts).

3. **Facebook Messenger Channel Design (R2)**:
   - *Observation*: `route.ts` GET handler validates `hub.mode` and `hub.verify_token` returning `hub.challenge`. `route.ts:66` falls back to `channel?.pageId` when `FB_PAGE_ACCESS_TOKEN` is unset.
   - *Reasoning*: A Page ID is not an authentication credential. Outbound calls to `https://graph.facebook.com/v21.0/me/messages` require a valid Page Access Token. Storing `accessToken` directly on each shop's `ChannelConnection` record allows true multi-tenancy where each tenant shop dispatches messages using its own dedicated Meta token.
   - *Reasoning on On-Demand Fetching*: Per the Zero Chat Storage mandate, message threads must be retrieved live. Calling `GET https://graph.facebook.com/v21.0/{page_id}/conversations` and `GET https://graph.facebook.com/v21.0/{conversation_id}/messages` satisfies on-demand retrieval without writing a single message record to the database.
   - *Reasoning on < 3s SLA*: `processCustomerMessage` contains a local rule-based fallback that resolves in < 50ms. If Gemini Flash is called, network latency is ~800-1500ms. With a 2.0s timeout safeguard on the Gemini LLM call, the entire pipeline (normalize -> AI/rule reply -> Graph API POST) easily finishes under the 3.0s SLA requirement.

4. **TikTok Open API Channel Design (R2)**:
   - *Observation*: `tiktok/route.ts` is currently a placeholder with hardcoded shop data and stubbed outbound calls.
   - *Reasoning*: TikTok's API operates similarly to Meta:
     - Inbound messages arrive via webhook events (`im.message.receive`).
     - Multi-tenant lookup requires mapping `client_key` or `user_open_id` to the tenant's registered TikTok channel connection.
     - Outbound replies require `POST https://open.tiktokapis.com/v2/im/message/send/` with `Authorization: Bearer <tenant_tiktok_token>` and `{ conversation_id, type: 'text', text: { text: replyText } }`.
     - On-demand conversation fetching uses `GET https://open.tiktokapis.com/v2/im/conversation/list/`.

5. **Multi-Tenant Isolation Safeguard (R2)**:
   - *Observation*: `MultiTenantDB.findShopByPageId` currently returns `{ shop: INITIAL_SHOP, channel: INITIAL_CHANNELS[0] }` if no page is matched.
   - *Reasoning*: In production or testing, if an unauthorized or unknown Page ID sends a webhook, replying with Shop 1's catalog, stock, and KPay account leaks Shop 1's sensitive commercial and financial data.
   - *Deduction*: Unknown channel identifiers must return `null`. Webhook handlers must respond with HTTP 200 or 404 and terminate immediately without triggering AI generation or outbound messages.

6. **Automated Testing Suite Structure (R4)**:
   - *Observation*: R4 mandates Unit, Integration, Webhook simulation, and E2E tiers.
   - *Reasoning*:
     - **Tier 1 (Unit)**: Fast, offline, deterministic tests for `burmese-converter` (Zawgyi detection/conversion, phone normalizer), `myanmar-townships` (fee lookups across 45+ townships), and `db` tenant isolation.
     - **Tier 2 (Integration)**: Tests `processCustomerMessage` with mock contexts (verifying stock deduction, polite Burmese responses, MMK price accuracy, delivery calculations) and API client request builders for Facebook and TikTok.
     - **Tier 3 (Webhook Simulation)**: In-memory simulation of NextRequest payloads hitting `/api/webhooks/facebook` and `/api/webhooks/tiktok`:
       - Verification handshake (`GET`).
       - Valid inbound messages -> multi-tenant dispatch -> outbound mock interception -> SLA measurement (< 3s).
       - Cross-tenant rejection for unknown page IDs.
     - **Tier 4 (E2E & Zero Chat Storage)**:
       - System state verification proving no messages/conversations are stored in the database.
       - Complete order closing flow: Customer requests product + township -> AI extracts details -> finalized order stored in `db.getOrders()` -> Telegram alert formatted.

---

## 3. Caveats

1. **Live Meta & TikTok Credentials**:
   - Active Meta App credentials (`FB_PAGE_ACCESS_TOKEN`, `FB_APP_SECRET`) and TikTok Developer keys are not configured in local environment files (`.env.example` contains placeholders).
   - All tests must use mock simulators and network interceptors (`vi.spyOn(global, 'fetch')` or `msw`) to run hermetically without external network dependencies.
2. **Next.js App Router API Route Testing**:
   - Testing Next.js Route Handlers (`GET`, `POST`) directly in Vitest requires passing `NextRequest` objects (using `node-mocks-http` or native `new Request(url, init)`).
3. **Database Migration Status**:
   - `MultiTenantDB` currently runs in-memory. When persisting to Supabase in future phases, the PostgreSQL schema must exclude `conversations` and `messages` tables to maintain the Zero Chat Storage invariant.

---

## 4. Conclusion

### Requirement R2 Specification Summary
1. **Facebook Verification**: Keep `GET /api/webhooks/facebook` verifying `hub.mode === 'subscribe'` and `hub.verify_token === FB_VERIFY_TOKEN`, returning `hub.challenge` with status 200. Optionally add HMAC SHA-256 signature verification for POST payloads.
2. **Facebook Outbound**:
   - Update `ChannelConnection` type to include `accessToken: string`.
   - Update `route.ts` to use `channel.accessToken` rather than falling back to `channel.pageId`.
   - Add `fetchFacebookConversations(pageId, token)` and `fetchFacebookMessages(conversationId, token)` to `src/lib/facebook.ts`.
3. **TikTok Channel**:
   - Implement `src/lib/tiktok.ts` providing `sendTikTokMessage(conversationId, text, token)`, `fetchTikTokConversations(token)`, and `fetchTikTokMessages(conversationId, token)`.
   - Update `src/app/api/webhooks/tiktok/route.ts` to resolve tenant via `findShopByChannel('tiktok', accountId)` and dispatch outbound replies.
4. **Multi-Tenant Routing**:
   - Replace insecure fallback in `findShopByPageId` with strict `null` return on unknown channel identifiers.
   - Implement unified `findShopByChannel(platform, channelId)`.
5. **Zero Chat Storage Compliance**:
   - Remove conversation/message persistence from `MultiTenantDB`.
   - Update live inbox UI to fetch threads and messages on-demand via channel API proxy endpoints.

### Requirement R4 Specification Summary
1. **Framework**: Install `vitest` in `devDependencies`, and add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json`.
2. **Build & Test Scripts**:
   - `"build": "next build"` (verified passing).
   - `"test": "vitest run"` (to be configured).
3. **Mock Simulators**:
   - Create `tests/mocks/meta-simulator.ts` and `tests/mocks/tiktok-simulator.ts` to generate realistic webhook payloads, intercept outbound `fetch` calls, validate payload schemas, and measure roundtrip execution latency (< 3s).
4. **4-Tier Test Plan**:
   - **Tier 1 (Unit)**: `tests/unit/burmese-converter.test.ts`, `tests/unit/townships.test.ts`, `tests/unit/multi-tenant-isolation.test.ts`.
   - **Tier 2 (Integration)**: `tests/integration/gemini-agent.test.ts`, `tests/integration/facebook-client.test.ts`, `tests/integration/tiktok-client.test.ts`.
   - **Tier 3 (Webhook Simulation)**: `tests/simulation/facebook-webhook.test.ts`, `tests/simulation/tiktok-webhook.test.ts`.
   - **Tier 4 (E2E & Zero Chat Storage)**: `tests/e2e/zero-chat-storage.test.ts`, `tests/e2e/order-closing-flow.test.ts`.

---

## 5. Verification Method

### How to Independently Verify These Findings
1. **Verify Windows PowerShell execution constraint**:
   - Run `npm -v` in PowerShell -> reproduces `PSSecurityException`.
   - Run `npm.cmd -v` -> successfully prints `11.17.0`.
2. **Verify Build Health**:
   - Run `npm.cmd run build` in `c:\Users\bobo\Documents\antigravity\fervent-hawking`.
   - Confirm exit code 0 and successful generation of 12 routes.
3. **Verify Absence of Test Runner**:
   - Inspect `package.json` -> verify absence of `"test"` in `"scripts"`.
4. **Inspect Source Locations for R2 Gaps**:
   - Check `src/app/api/webhooks/facebook/route.ts:66`: verify `const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || channel?.pageId`.
   - Check `src/types/index.ts:24-32`: verify `ChannelConnection` lacks `accessToken`.
   - Check `src/lib/db.ts:261`: verify `return { shop: INITIAL_SHOP, channel: INITIAL_CHANNELS[0] };` fallback.
   - Check `src/app/api/webhooks/tiktok/route.ts:31`: verify outbound send is unhandled stub.
5. **Invalidation Conditions**:
   - If a test runner was already hidden under an unusual script name (checked: none exists).
   - If Meta Graph API v21.0 payload format changes (checked: standard Graph API v21.0 `/me/messages` schema).
