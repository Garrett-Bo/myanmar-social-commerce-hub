# Milestone 3 Technical Blueprint & Handoff Report: Webhooks, Multi-Tenant Routing & Zero-Chat Invariant

**Agent**: `explorer_m3_3` (`teamwork_preview_explorer`)  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  
**Mission**: Analyze Facebook and TikTok webhook routes, multi-tenant routing, ephemeral processing, zero-chat invariant, and design the M3 test harness `scripts/verify_m3_channels.ts`.  
**Date**: 2026-10-08  

---

## 1. Observation

### 1.1 Inbound Facebook Webhook Route (`src/app/api/webhooks/facebook/route.ts`)
Direct inspection of `src/app/api/webhooks/facebook/route.ts` (lines 1–89) revealed three distinct structural discrepancies:

1. **Access Token Extraction Bug (Line 66)**:
   ```typescript
   65:   // 5. Outbound Dispatch: Send message back to the customer on Facebook Messenger
   66:   const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || channel?.pageId;
   67:   if (pageAccessToken) {
   68:     const sendResult = await sendFacebookMessage(
   69:       senderId,
   70:       aiResponse.replyTextMm,
   71:       pageAccessToken
   72:     );
   ```
   - *Verbatim Finding*: Line 66 falls back to `channel?.pageId` instead of `channel?.accessToken`.
   - In `src/types/index.ts` (lines 24–34), `ChannelConnection` defines:
     ```typescript
     export interface ChannelConnection {
       pageId: string;        // e.g. '109283746501928'
       accessToken: string;   // e.g. 'EAA_mock_fb_access_token_yangon_01'
     }
     ```
   - When `process.env.FB_PAGE_ACCESS_TOKEN` is unset, `sendFacebookMessage` receives the numeric Facebook Page ID (`109283746501928`) as the bearer token instead of the OAuth access token (`EAA...`).
   - Furthermore, in multi-tenant SaaS architecture, reading `process.env.FB_PAGE_ACCESS_TOKEN` ahead of `channel?.accessToken` would cause a global environment variable to override all tenants, breaking tenant credential isolation. The tenant's own `channel?.accessToken` must take precedence.

2. **Tenant Isolation Bypass via `db.findShopByPageId` (Line 39)**:
   ```typescript
   38:   // 1. Multi-Tenant Lookup: Match incoming Page ID to the owning shop
   39:   const match = await db.findShopByPageId(pageId);
   40:   const shop = match?.shop;
   41:   const channel = match?.channel;
   42: 
   43:   if (!shop) {
   44:     console.warn(`[FB Webhook] No shop registered for Page ID ${pageId}`);
   45:     continue;
   46:   }
   ```
   - In `src/lib/db.ts` (lines 455–460):
     ```typescript
     async findShopByPageId(pageId: string): Promise<{ shop: Shop; channel: ChannelConnection } | null> {
       const found = await this.findShopByChannel('facebook', pageId);
       if (found) return found;
       // Default fallback to initial shop if page ID not specifically configured
       return { shop: INITIAL_SHOP, channel: INITIAL_CHANNELS[0] };
     }
     ```
   - *Verbatim Finding*: When an unknown Facebook page ID (e.g. `unknown_page_999`) arrives, `findShopByPageId` does NOT return `null`; it falls back to `INITIAL_SHOP` (`shop-yangon-01`).
   - This causes unknown tenants' messages to be erroneously processed by the Yangon shop's catalog and AI assistant, violating `PROJECT.md` Feature 20: *"Strict Multi-Tenant Channel Routing: Maps channel ID to shop, returning null on unknown channel."*
   - Lines 43–46 (`if (!shop) ... continue;`) are rendered dead code.
   - The route must instead call the canonical contract `db.findShopByChannel('facebook', pageId)` directly.

3. **Missing Bot Echo Suppression (Line 34)**:
   ```typescript
   34:   if (webhookEvent && webhookEvent.message && webhookEvent.message.text) {
   ```
   - *Verbatim Finding*: Facebook Graph API sends webhooks for both inbound user messages and outbound bot echoes (`message.is_echo === true`).
   - Without checking `!webhookEvent.message.is_echo`, outbound replies sent by the page can trigger recursive self-replies in live Messenger environments.

### 1.2 Inbound TikTok Webhook Route (`src/app/api/webhooks/tiktok/route.ts`)
Direct inspection of `src/app/api/webhooks/tiktok/route.ts` (lines 1–66) revealed two critical discrepancies:

1. **Missing GET Webhook Verification Handshake**:
   - `src/app/api/webhooks/tiktok/route.ts` only exports `export async function POST(req: NextRequest)`.
   - DISPATCH.md Mission Item 3 explicitly mandates:
     *"Design automated test harness scripts/verify_m3_channels.ts validating: Webhook GET verification (Facebook & TikTok)."*
   - Webhook registration probes and automated health checks sending `GET /api/webhooks/tiktok?challenge=...` receive HTTP 405 Method Not Allowed.
   - A `GET` handler supporting query challenges (`challenge` and `hub.challenge`) is required.

2. **Fragile Channel Identification in TikTok Payloads (Lines 17–21)**:
   ```typescript
   17:   const appKey = body.data?.app_key || body.app_key;
   ...
   21:   const match = await db.findShopByChannel('tiktok', appKey || 'default');
   ```
   - In `src/lib/store.ts` (lines 29–39), the configured TikTok channel connection has:
     ```typescript
     id: 'ch-tt-01',
     shopId: 'shop-yangon-01',
     platform: 'tiktok',
     accountName: '@aungthukha_trend',
     pageId: 'tt_shop_8291029',
     accessToken: 'tt_mock_access_token_yangon_01',
     ```
   - In `src/lib/db.ts` (lines 439–453), `findShopByChannel('tiktok', identifier)` matches against `ch.pageId === identifier || ch.id === identifier`.
   - TikTok Open API webhooks deliver channel identifiers under `shop_id`, `channel_id`, `page_id`, or `app_key`.
   - Current line 17 only extracts `app_key`. When a webhook arrives with `shop_id: 'tt_shop_8291029'` or `channel_id: 'ch-tt-01'`, `appKey` is undefined, falling back to `'default'`. Because `'default'` does not match `tt_shop_8291029` or `ch-tt-01`, `findShopByChannel` returns `null` and drops all incoming events.

### 1.3 Ephemeral Processing & Zero-Chat Storage Invariant
1. In `src/app/api/webhooks/facebook/route.ts` and `src/app/api/webhooks/tiktok/route.ts`:
   - Message payloads are extracted from `await req.json()` purely in-memory.
   - Normalization via `normalizeBurmese` is performed in-memory without disk I/O.
   - AI generation via `processCustomerMessage` runs in-memory with local rule-engine fallback.
   - Outbound dispatch via `sendFacebookMessage` and `sendTikTokMessage` sends HTTP requests directly to Meta and TikTok endpoints.
   - Response HTTP 200 is returned immediately.
   - Zero database write calls (`saveMessage`, `createMessage`, `saveConversation`, etc.) exist anywhere in the route handlers.
2. In `src/lib/db.ts`:
   - `MultiTenantDB` defines exactly 4 entity collections: `shops`, `products`, `channels`, `orders`.
   - Zero chat entities, tables, maps, or methods exist on `MultiTenantDB`.
   - `adversarial_zero_chat_probe.ts` verified this invariant with 106/106 passed probes.

### 1.4 Testability and Offline Mock Capability
1. In `src/lib/facebook.ts`:
   - `sendFacebookMessage` currently attempts `fetch('https://graph.facebook.com/v21.0/me/messages?...')` regardless of token value. When run offline or with mock tokens (`EAA_mock...`), it throws or returns HTTP error.
   - `fetchFacebookConversations` and `fetchFacebookThreadMessages` similarly hit live Graph API endpoints and return `[]` on mock tokens.
2. In `src/lib/tiktok.ts`:
   - `sendTikTokMessage` and `fetchTikTokConversations` hit live TikTok endpoints and fail on mock tokens.
3. Adding a deterministic mock fallback for tokens containing `'mock'` (e.g. `pageAccessToken.includes('mock')` or `process.env.MOCK_CHANNELS === 'true'`) allows the verification harness to run 100% offline with zero external network dependencies, ensuring fast, reproducible CI/CD execution.

---

## 2. Logic Chain

1. **Premise 1**: Each tenant shop in the SaaS platform possesses its own Facebook Page and TikTok account with dedicated credentials (`pageId`, `accessToken`).
2. **Premise 2**: Facebook webhooks deliver events identified by the receiving page's ID (`entry[].id`), and TikTok webhooks deliver events identified by `shop_id`, `channel_id`, or `page_id`.
3. **Inference from 1 & 2**: The webhook handler must resolve the receiving channel identifier strictly to the owning tenant shop using `db.findShopByChannel(platform, channelIdentifier)`. If no shop is registered for that identifier, it must return `null` and skip processing, rather than defaulting to another tenant's shop.
4. **Premise 3**: Meta Graph API requires an OAuth Page Access Token (`accessToken`), NOT the Page ID (`pageId`), to authenticate outbound message dispatches to `POST /v21.0/me/messages`.
5. **Inference from 1 & 3**: Outbound messaging in `facebook/route.ts` must pass `channel.accessToken` to `sendFacebookMessage`. Passing `channel.pageId` causes OAuth authentication failure.
6. **Premise 4**: The core business constraint (`ORIGINAL_REQUEST.md` R1) mandates strict zero-chat storage to minimize cloud database costs: chats are fetched on-demand from Meta and TikTok APIs and never stored in the database.
7. **Inference from 4**: Inbound webhooks must handle messages ephemerally in-memory, generate replies, dispatch them immediately, and leave `data/db.json` containing strictly `shops`, `products`, `channels`, and `orders`.
8. **Premise 5**: Automated test execution (`npm.cmd test`) must run deterministically in sandboxed environments without requiring live Facebook or TikTok developer portal access or internet connectivity.
9. **Inference from 5**: Social channel clients (`facebook.ts`, `tiktok.ts`) must support an offline mock mode when mock tokens (`EAA_mock...`, `tt_mock...`) are provided, returning realistic responses without making network calls.
10. **Conclusion**: Correcting `facebook/route.ts` and `tiktok/route.ts`, enabling mock mode in `facebook.ts` and `tiktok.ts`, and constructing `scripts/verify_m3_channels.ts` satisfies all Milestone 3 acceptance criteria with zero-chat storage guarantees.

---

## 3. Caveats

1. **Meta App Verify Token vs Tenant Webhook Secret**:
   - Meta Graph API Webhook registration operates at the App level: Meta pings the webhook URL with a single `hub.verify_token` defined in the Meta App Developer Dashboard.
   - Individual tenant channels store `webhookSecret?: string;` in the database, but Meta does not transmit tenant-specific tokens in the initial `GET` handshake. Therefore, comparing against `process.env.FB_VERIFY_TOKEN || 'shwe_shop_fb_token_2026'` is architecturally correct.
2. **TikTok Signature Verification (`X-TikTok-Signature`)**:
   - Production TikTok webhooks can include HMAC-SHA256 signature headers. For development and offline simulation, verifying payload structure and tenant routing is sufficient; cryptographic header verification can be activated conditionally when `TIKTOK_APP_SECRET` is configured.
3. **Order Finalization Separation**:
   - Webhook processing generates an `orderDraft` when order intent and customer details are detected, but does NOT finalize or persist the order to `db.createOrder`. Order finalization occurs when the merchant or automated checkout flow confirms the order (Milestone 4).

---

## 4. Conclusion & Technical Blueprint

### 4.1 Required Fixes for `src/app/api/webhooks/facebook/route.ts`

```diff
--- a/src/app/api/webhooks/facebook/route.ts
+++ b/src/app/api/webhooks/facebook/route.ts
@@ -31,12 +31,12 @@ export async function POST(req: NextRequest) {
         const pageId = entry.id; // The Facebook Page that received the message
         const webhookEvent = entry.messaging?.[0];
 
-        if (webhookEvent && webhookEvent.message && webhookEvent.message.text) {
+        if (webhookEvent && webhookEvent.message && !webhookEvent.message.is_echo && webhookEvent.message.text) {
           const senderId = webhookEvent.sender.id; // Customer PSID
           const rawMessageText = webhookEvent.message.text;
 
           // 1. Multi-Tenant Lookup: Match incoming Page ID to the owning shop
-          const match = await db.findShopByPageId(pageId);
+          const match = await db.findShopByChannel('facebook', pageId);
           const shop = match?.shop;
           const channel = match?.channel;
 
@@ -63,7 +63,7 @@ export async function POST(req: NextRequest) {
           console.log(`[AI Response for Shop "${shop.name}"]: ${aiResponse.replyTextMm}`);
 
           // 5. Outbound Dispatch: Send message back to the customer on Facebook Messenger
-          const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || channel?.pageId;
+          const pageAccessToken = channel?.accessToken || process.env.FB_PAGE_ACCESS_TOKEN;
           if (pageAccessToken) {
             const sendResult = await sendFacebookMessage(
               senderId,
```

### 4.2 Required Fixes for `src/app/api/webhooks/tiktok/route.ts`

```diff
--- a/src/app/api/webhooks/tiktok/route.ts
+++ b/src/app/api/webhooks/tiktok/route.ts
@@ -6,6 +6,16 @@ import { db } from '@/lib/db';
 import { sendTikTokMessage } from '@/lib/tiktok';
 
+// TikTok Webhook Verification Handshake (GET)
+export async function GET(req: NextRequest) {
+  const { searchParams } = new URL(req.url);
+  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge');
+  if (challenge) {
+    return new Response(challenge, { status: 200 });
+  }
+  return NextResponse.json({ status: 'ok', service: 'tiktok-webhook' }, { status: 200 });
+}
+
 // TikTok Shop / Direct Message Webhook Receiver (POST)
 export async function POST(req: NextRequest) {
   try {
@@ -14,12 +24,19 @@ export async function POST(req: NextRequest) {
     // TikTok event payload handling
     if (body.event === 'im.message.receive' || body.type === 'message') {
       const senderId = body.data?.sender_id || body.sender_id || 'tt_user_unknown';
       const conversationId = body.data?.conversation_id || body.conversation_id || senderId;
       const rawText = body.data?.content?.text || body.content?.text || body.text || '';
-      const appKey = body.data?.app_key || body.app_key;
+      const channelIdentifier =
+        body.data?.shop_id ||
+        body.shop_id ||
+        body.data?.channel_id ||
+        body.channel_id ||
+        body.data?.page_id ||
+        body.page_id ||
+        body.data?.app_key ||
+        body.app_key ||
+        '';
 
       if (rawText) {
         // 1. Resolve owning tenant shop
-        const match = await db.findShopByChannel('tiktok', appKey || 'default');
+        const match = channelIdentifier ? await db.findShopByChannel('tiktok', channelIdentifier) : null;
         const shop = match?.shop;
         const channel = match?.channel;
```

### 4.3 Required Mock Mode Support for `src/lib/facebook.ts` & `src/lib/tiktok.ts`

In `src/lib/facebook.ts`:
```typescript
// Add at top of sendFacebookMessage:
if (pageAccessToken.includes('mock') || pageAccessToken.startsWith('EAA_mock') || process.env.MOCK_CHANNELS === 'true') {
  return {
    success: true,
    messageId: `mid_mock_fb_${Date.now()}`,
    recipientId,
  };
}

// Add at top of fetchFacebookConversations:
if (pageAccessToken.includes('mock') || pageAccessToken.startsWith('EAA_mock') || process.env.MOCK_CHANNELS === 'true') {
  return [
    {
      id: 't_mock_101',
      updatedTime: new Date().toISOString(),
      snippet: 'မင်္ဂလာပါ ဆီရမ် ဈေးဘယ်လောက်လဲ',
      senderId: 'psid_customer_01',
      senderName: 'Ma Hnin Wai',
    },
    {
      id: 't_mock_102',
      updatedTime: new Date(Date.now() - 3600000).toISOString(),
      snippet: 'စမ်းချောင်း ပို့ခ ဘယ်လောက်လဲ',
      senderId: 'psid_customer_02',
      senderName: 'Ko Aung Kyaw',
    },
  ];
}

// Add at top of fetchFacebookThreadMessages:
if (pageAccessToken.includes('mock') || pageAccessToken.startsWith('EAA_mock') || process.env.MOCK_CHANNELS === 'true') {
  return [
    {
      id: 'm_mock_001',
      text: 'မင်္ဂလာပါ ဆီရမ် ဈေးဘယ်လောက်လဲ',
      from: { id: 'psid_customer_01', name: 'Ma Hnin Wai' },
      createdTime: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: 'm_mock_002',
      text: 'မင်္ဂလာပါရှင့် Niacinamide Whitening Serum (30ml) ဈေးနှုန်း 28,000 ကျပ်ပါရှင့်',
      from: { id: 'page_109283746501928', name: 'Aung Thukha Fashion' },
      createdTime: new Date().toISOString(),
    },
  ];
}
```

In `src/lib/tiktok.ts`:
```typescript
// Add at top of sendTikTokMessage:
if (accessToken.includes('mock') || accessToken.startsWith('tt_mock') || process.env.MOCK_CHANNELS === 'true') {
  return {
    success: true,
    messageId: `mid_mock_tt_${Date.now()}`,
  };
}

// Add at top of fetchTikTokConversations:
if (accessToken.includes('mock') || accessToken.startsWith('tt_mock') || process.env.MOCK_CHANNELS === 'true') {
  return [
    {
      id: 'tt_conv_101',
      snippet: 'မိတ်ကပ်နှုတ်ခမ်းနီ ပို့ခ ဘယ်လောက်လဲ',
      updatedAt: new Date().toISOString(),
    },
  ];
}
```

---

### 4.4 Automated Test Harness Specification: `scripts/verify_m3_channels.ts`

The test harness must contain 7 comprehensive test suites with 50+ assertions:

```typescript
/**
 * Milestone 3 Automated Verification Suite: Social Channels, Webhooks & Zero-Chat Invariant
 * Coverage:
 *  1. Facebook & TikTok Webhook GET Verification Handshakes
 *  2. Multi-Tenant Inbound Channel Routing & Catalog Isolation
 *  3. Inbound Facebook Messenger Webhook Simulation with Zawgyi Normalization
 *  4. Inbound TikTok Direct Messaging Webhook Simulation
 *  5. Outbound Social Channel Dispatchers (Mock Mode)
 *  6. On-Demand Conversation & Thread Fetching (Ephemeral, No DB Storage)
 *  7. Forensic Zero-Chat Disk Probe (data/db.json)
 */

import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { GET as getFacebookWebhook, POST as postFacebookWebhook } from '../src/app/api/webhooks/facebook/route';
import { GET as getTikTokWebhook, POST as postTikTokWebhook } from '../src/app/api/webhooks/tiktok/route';
import { sendFacebookMessage, fetchFacebookConversations, fetchFacebookThreadMessages } from '../src/lib/facebook';
import { sendTikTokMessage, fetchTikTokConversations } from '../src/lib/tiktok';
import { db } from '../src/lib/db';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

export async function runM3Tests() {
  console.log('================================================================');
  console.log('MILESTONE 3: SOCIAL CHANNELS & ON-DEMAND MESSAGING TEST SUITE');
  console.log('================================================================\n');

  // --- SUITE 1: Webhook GET Verification Handshakes ---
  console.log('--- SUITE 1: Webhook GET Verification Handshakes ---');
  {
    // Facebook valid challenge
    const reqFbValid = new NextRequest(
      'http://localhost:3000/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=shwe_shop_fb_token_2026&hub.challenge=test_meta_challenge_998877'
    );
    const resFbValid = await getFacebookWebhook(reqFbValid);
    assert(resFbValid.status === 200, 'Facebook GET returns 200 on valid token');
    const fbText = await resFbValid.text();
    assert(fbText === 'test_meta_challenge_998877', 'Facebook GET echoes hub.challenge verbatim');

    // Facebook invalid token
    const reqFbInvalidToken = new NextRequest(
      'http://localhost:3000/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=123'
    );
    const resFbInvalidToken = await getFacebookWebhook(reqFbInvalidToken);
    assert(resFbInvalidToken.status === 403, 'Facebook GET returns 403 on invalid verify token');

    // Facebook invalid mode
    const reqFbInvalidMode = new NextRequest(
      'http://localhost:3000/api/webhooks/facebook?hub.mode=unsubscribe&hub.verify_token=shwe_shop_fb_token_2026&hub.challenge=123'
    );
    const resFbInvalidMode = await getFacebookWebhook(reqFbInvalidMode);
    assert(resFbInvalidMode.status === 403, 'Facebook GET returns 403 on invalid hub.mode');

    // Facebook missing parameters
    const reqFbEmpty = new NextRequest('http://localhost:3000/api/webhooks/facebook');
    const resFbEmpty = await getFacebookWebhook(reqFbEmpty);
    assert(resFbEmpty.status === 403, 'Facebook GET returns 403 on missing parameters');

    // TikTok challenge verification
    const reqTtChallenge = new NextRequest('http://localhost:3000/api/webhooks/tiktok?challenge=tt_challenge_554433');
    const resTtChallenge = await getTikTokWebhook(reqTtChallenge);
    assert(resTtChallenge.status === 200, 'TikTok GET returns 200 on challenge query');
    const ttText = await resTtChallenge.text();
    assert(ttText === 'tt_challenge_554433', 'TikTok GET echoes challenge string');

    // TikTok health check
    const reqTtHealth = new NextRequest('http://localhost:3000/api/webhooks/tiktok');
    const resTtHealth = await getTikTokWebhook(reqTtHealth);
    assert(resTtHealth.status === 200, 'TikTok GET returns 200 on health check');
  }

  // --- SUITE 2: Multi-Tenant Channel Routing Contract ---
  console.log('\n--- SUITE 2: Multi-Tenant Channel Routing Contract ---');
  {
    // Match Yangon Facebook Page
    const matchYgnFb = await db.findShopByChannel('facebook', '109283746501928');
    assert(matchYgnFb !== null, 'Finds shop for Yangon FB page 109283746501928');
    assert(matchYgnFb?.shop.id === 'shop-yangon-01', 'Maps FB page to shop-yangon-01');
    assert(matchYgnFb?.channel.accessToken === 'EAA_mock_fb_access_token_yangon_01', 'Extracts Yangon channel accessToken');

    // Match Mandalay Facebook Page
    const matchMdyFb = await db.findShopByChannel('facebook', '209384756102938');
    assert(matchMdyFb !== null, 'Finds shop for Mandalay FB page 209384756102938');
    assert(matchMdyFb?.shop.id === 'shop-mdy-02', 'Maps FB page to shop-mdy-02');
    assert(matchMdyFb?.channel.accessToken === 'EAAX_MOCK_TOKEN_MDY', 'Extracts Mandalay channel accessToken');

    // Match TikTok channel by pageId
    const matchYgnTt = await db.findShopByChannel('tiktok', 'tt_shop_8291029');
    assert(matchYgnTt !== null, 'Finds shop for TikTok page tt_shop_8291029');
    assert(matchYgnTt?.shop.id === 'shop-yangon-01', 'Maps TikTok page to shop-yangon-01');

    // Match TikTok channel by connection id
    const matchYgnTtId = await db.findShopByChannel('tiktok', 'ch-tt-01');
    assert(matchYgnTtId !== null, 'Finds shop for TikTok channel id ch-tt-01');
    assert(matchYgnTtId?.shop.id === 'shop-yangon-01', 'Maps channel id to shop-yangon-01');

    // Unknown Facebook Page strictly returns null
    const matchUnknownFb = await db.findShopByChannel('facebook', 'unknown_fb_99999');
    assert(matchUnknownFb === null, 'Returns null for unknown Facebook page (Strict Multi-Tenant Routing)');

    // Unknown TikTok Channel strictly returns null
    const matchUnknownTt = await db.findShopByChannel('tiktok', 'unknown_tt_99999');
    assert(matchUnknownTt === null, 'Returns null for unknown TikTok channel (Strict Multi-Tenant Routing)');
  }

  // --- SUITE 3: Inbound Facebook Webhook Simulation & Burmese Processing ---
  console.log('\n--- SUITE 3: Inbound Facebook Webhook Simulation & Burmese Processing ---');
  {
    // 1. Yangon Shop Inbound Message
    const fbPayloadYgn = {
      object: 'page',
      entry: [{
        id: '109283746501928',
        messaging: [{
          sender: { id: 'psid_customer_ygn_01' },
          recipient: { id: '109283746501928' },
          message: { text: 'ဆီရမ် ဈေးဘယ်လောက်လဲ' },
        }],
      }],
    };
    const reqFbPostYgn = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify(fbPayloadYgn),
    });
    const resFbPostYgn = await postFacebookWebhook(reqFbPostYgn);
    assert(resFbPostYgn.status === 200, 'Yangon FB webhook POST returns 200');
    const jsonFbPostYgn = await resFbPostYgn.json();
    assert(jsonFbPostYgn.status === 'EVENT_RECEIVED', 'Yangon FB returns EVENT_RECEIVED');

    // 2. Mandalay Shop Inbound Message with Zawgyi Text
    const fbPayloadMdy = {
      object: 'page',
      entry: [{
        id: '209384756102938',
        messaging: [{
          sender: { id: 'psid_customer_mdy_02' },
          recipient: { id: '209384756102938' },
          message: { text: 'ပုဆိုး ေစ်းဘယ္ေလာက္လဲ' }, // Zawgyi for "ပုဆိုး ဈေးဘယ်လောက်လဲ"
        }],
      }],
    };
    const reqFbPostMdy = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify(fbPayloadMdy),
    });
    const resFbPostMdy = await postFacebookWebhook(reqFbPostMdy);
    assert(resFbPostMdy.status === 200, 'Mandalay FB webhook POST returns 200');

    // 3. Unknown Page ID Webhook
    const fbPayloadUnknown = {
      object: 'page',
      entry: [{
        id: 'unknown_page_999999',
        messaging: [{
          sender: { id: 'psid_unknown_cust' },
          recipient: { id: 'unknown_page_999999' },
          message: { text: 'Hello' },
        }],
      }],
    };
    const reqFbUnknown = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify(fbPayloadUnknown),
    });
    const resFbUnknown = await postFacebookWebhook(reqFbUnknown);
    assert(resFbUnknown.status === 200, 'Unknown FB page webhook returns 200 without throwing');

    // 4. Non-page event
    const reqFbNotPage = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify({ object: 'user' }),
    });
    const resFbNotPage = await postFacebookWebhook(reqFbNotPage);
    assert(resFbNotPage.status === 404, 'Non-page FB event returns 404');
  }

  // --- SUITE 4: Inbound TikTok Webhook Simulation ---
  console.log('\n--- SUITE 4: Inbound TikTok Webhook Simulation ---');
  {
    // 1. TikTok message matching shop by shop_id
    const ttPayload = {
      event: 'im.message.receive',
      data: {
        shop_id: 'tt_shop_8291029',
        sender_id: 'tt_customer_01',
        conversation_id: 'tt_conv_01',
        content: { text: 'မိတ်ကပ်နှုတ်ခမ်းနီ ပို့ခ ဘယ်လောက်လဲ စမ်းချောင်း' },
      },
    };
    const reqTtPost = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
      method: 'POST',
      body: JSON.stringify(ttPayload),
    });
    const resTtPost = await postTikTokWebhook(reqTtPost);
    assert(resTtPost.status === 200, 'TikTok webhook POST returns 200');
    const jsonTt = await resTtPost.json();
    assert(jsonTt.code === 0 && jsonTt.message === 'success', 'TikTok webhook returns success code 0');

    // 2. Unknown TikTok channel payload
    const ttPayloadUnknown = {
      event: 'im.message.receive',
      data: {
        shop_id: 'unknown_tt_shop_999',
        sender_id: 'tt_customer_99',
        content: { text: 'Hello' },
      },
    };
    const reqTtUnknown = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
      method: 'POST',
      body: JSON.stringify(ttPayloadUnknown),
    });
    const resTtUnknown = await postTikTokWebhook(reqTtUnknown);
    assert(resTtUnknown.status === 200, 'Unknown TikTok tenant returns 200');
    const jsonTtUnknown = await resTtUnknown.json();
    assert(jsonTtUnknown.message === 'no_tenant', 'Unknown TikTok tenant returns no_tenant');
  }

  // --- SUITE 5: Outbound Social Channel Dispatchers (Mock Mode) ---
  console.log('\n--- SUITE 5: Outbound Social Channel Dispatchers ---');
  {
    const fbRes = await sendFacebookMessage('psid_test_01', 'မင်္ဂလာပါရှင့်', 'EAA_mock_fb_access_token_yangon_01');
    assert(fbRes.success === true, 'sendFacebookMessage succeeds with mock token');
    assert(typeof fbRes.messageId === 'string', 'sendFacebookMessage returns messageId');

    const fbMissingToken = await sendFacebookMessage('psid_test_01', 'မင်္ဂလာပါရှင့်', '');
    assert(fbMissingToken.success === false, 'sendFacebookMessage fails cleanly on missing token');

    const ttRes = await sendTikTokMessage('tt_conv_01', 'မင်္ဂလာပါရှင့်', 'tt_mock_access_token_yangon_01');
    assert(ttRes.success === true, 'sendTikTokMessage succeeds with mock token');
    assert(typeof ttRes.messageId === 'string', 'sendTikTokMessage returns messageId');

    const ttMissingToken = await sendTikTokMessage('tt_conv_01', 'မင်္ဂလာပါရှင့်', '');
    assert(ttMissingToken.success === false, 'sendTikTokMessage fails cleanly on missing token');
  }

  // --- SUITE 6: On-Demand Conversation & Thread Fetchers ---
  console.log('\n--- SUITE 6: On-Demand Conversation & Thread Fetchers ---');
  {
    const fbThreads = await fetchFacebookConversations('109283746501928', 'EAA_mock_fb_access_token_yangon_01');
    assert(Array.isArray(fbThreads) && fbThreads.length > 0, 'fetchFacebookConversations returns threads');
    assert(typeof fbThreads[0].snippet === 'string', 'Conversation summary includes snippet');
    assert(typeof fbThreads[0].senderId === 'string', 'Conversation summary includes senderId');

    const fbMessages = await fetchFacebookThreadMessages(fbThreads[0].id, 'EAA_mock_fb_access_token_yangon_01');
    assert(Array.isArray(fbMessages) && fbMessages.length > 0, 'fetchFacebookThreadMessages returns messages');
    assert(typeof fbMessages[0].text === 'string', 'Thread message includes text');

    const ttThreads = await fetchTikTokConversations('tt_mock_access_token_yangon_01');
    assert(Array.isArray(ttThreads) && ttThreads.length > 0, 'fetchTikTokConversations returns threads');
    assert(typeof ttThreads[0].snippet === 'string', 'TikTok conversation includes snippet');
  }

  // --- SUITE 7: Forensic Zero-Chat Disk Probe ---
  console.log('\n--- SUITE 7: Forensic Zero-Chat Disk Probe ---');
  {
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    assert(fs.existsSync(dbPath), 'data/db.json exists on disk');
    const rawContent = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    const rootKeys = Object.keys(rawContent).sort();
    assert(
      JSON.stringify(rootKeys) === JSON.stringify(['channels', 'orders', 'products', 'shops']),
      'Database root keys strictly match ["channels", "orders", "products", "shops"]'
    );
    assert(!('conversations' in rawContent), 'Database has zero "conversations" root key');
    assert(!('messages' in rawContent), 'Database has zero "messages" root key');
    assert(!('chat_logs' in rawContent), 'Database has zero "chat_logs" root key');

    // Instance method verification
    assert((db as any).conversations === undefined, 'MultiTenantDB instance has no conversations collection');
    assert((db as any).messages === undefined, 'MultiTenantDB instance has no messages collection');
    assert((db as any).getConversations === undefined, 'MultiTenantDB instance has no getConversations method');
    assert((db as any).saveMessage === undefined, 'MultiTenantDB instance has no saveMessage method');
  }

  console.log('\n================================================================');
  console.log(`TOTAL ASSERTIONS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('\n>>> ALL MILESTONE 3 CHANNEL ASSERTIONS PASSED CLEANLY! <<<\n');
  } else {
    console.error('\n>>> SOME ASSERTIONS FAILED <<<\n');
    process.exit(1);
  }
}

if (require.main === module || !process.env.VITEST) {
  runM3Tests().catch((err) => {
    console.error('Test execution exception:', err);
    process.exit(1);
  });
}
```

---

## 5. Verification Method

1. **Static Inspection**:
   - Inspect `src/app/api/webhooks/facebook/route.ts` lines 39 & 66: verify `db.findShopByChannel('facebook', pageId)` and `channel?.accessToken` are used.
   - Inspect `src/app/api/webhooks/tiktok/route.ts`: verify `GET` handler exists and `channelIdentifier` includes `shop_id` / `channel_id` / `page_id`.
   - Inspect `src/lib/facebook.ts` & `src/lib/tiktok.ts`: verify mock fallback is present.
2. **Automated Verification Command**:
   ```powershell
   npx.cmd tsx scripts/verify_m3_channels.ts
   ```
   - Expect: Exit code 0, 50+ passing assertions, zero failures.
3. **Full Regression Test**:
   ```powershell
   npm.cmd test
   ```
   - Expect: All M1 persistence tests, all M2 NLP & logistics tests, adversarial zero-chat probe, and M3 channel tests pass with 0 failures.
4. **Invalidation Conditions**:
   - Any `conversations` or `messages` key appearing in `data/db.json`.
   - Any fallback routing of an unknown Facebook page ID to `shop-yangon-01`.
   - Passing `channel.pageId` instead of `channel.accessToken` to `sendFacebookMessage`.
   - Returning HTTP 405 on `GET /api/webhooks/tiktok`.
