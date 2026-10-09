# Technical Handoff Report: TikTok Open API & On-Demand Messaging (Milestone 3)

**Agent**: `explorer_m3_2` (`teamwork_preview_explorer`)  
**Mission**: Analyze `src/lib/tiktok.ts` and formulate the implementation blueprint for Milestone 3 (Social Channels & On-Demand Messaging).  
**Target File**: `src/lib/tiktok.ts`  
**Related Files**: `src/types/index.ts`, `src/app/api/webhooks/tiktok/route.ts`, `PROJECT.md`, `scripts/adversarial_zero_chat_probe.ts`  

---

## 1. Observation

### Observation 1.1: Project Requirements & Interface Contracts
In `PROJECT.md` lines 107–108:
```typescript
- sendTikTokMessage(conversationId: string, messageText: string, accessToken: string): Promise<{ success: boolean; messageId?: string; error?: string }>
- fetchTikTokConversations(accessToken: string): Promise<Array<{ id: string; snippet: string; updatedAt: string }>>
```
And in `ORIGINAL_REQUEST.md` lines 7–10:
```markdown
CRITICAL USER ARCHITECTURAL CONSTRAINT: 
"chat wont store on ourside we will jsut pull the tik tok and facebook api messaging .. it's expensive to store"
- Do NOT store chat history or message logs in our database.
- Pull conversations and message histories on-demand directly via Facebook Graph API and TikTok API.
```

### Observation 1.2: Current State of `src/lib/tiktok.ts`
Direct inspection of `src/lib/tiktok.ts` (lines 9–118) reveals:
```typescript
9: export interface TikTokSendResult {
10:   success: boolean;
11:   messageId?: string;
12:   error?: string;
13: }
14: 
15: export interface TikTokConversationSummary {
16:   id: string;
17:   snippet: string;
18:   updatedAt: string;
19: }
20: 
21: /**
22:  * Dispatches an automated text reply via TikTok Direct Message API.
23:  */
24: export async function sendTikTokMessage(
25:   conversationId: string,
26:   messageText: string,
27:   accessToken: string
28: ): Promise<TikTokSendResult> {
...
29:   if (!accessToken || !conversationId) {
30:     console.warn('[TikTok Send] Missing accessToken or conversationId. Skipping outbound HTTP call.');
31:     return {
32:       success: false,
33:       error: 'Missing accessToken or conversationId',
34:     };
35:   }
36: 
37:   const url = 'https://open.tiktokapis.com/v2/im/message/send/';
...
83: export async function fetchTikTokConversations(
84:   accessToken: string
85: ): Promise<TikTokConversationSummary[]> {
86:   if (!accessToken) {
87:     return [];
88:   }
89: 
90:   const url = 'https://open.tiktokapis.com/v2/im/conversation/list/';
...
```

### Observation 1.3: Deficiencies in Current `src/lib/tiktok.ts`
1. **Absence of Mock / Test Mode Fallback**:
   In both `sendTikTokMessage` and `fetchTikTokConversations`, if `accessToken` is provided, the function unconditionally performs a live `fetch()` to `https://open.tiktokapis.com/v2/...`.
   In offline environments or test suites running with mock tokens (e.g. `tt_mock_access_token_yangon_01` seeded in `src/lib/store.ts` line 34), these live network calls fail immediately (`TypeError: fetch failed` or HTTP 401).
2. **Missing `messageText` and Whitespace Validation in `sendTikTokMessage`**:
   Line 29 only checks `if (!accessToken || !conversationId)`. If `messageText` is undefined, empty string `""`, or whitespace `"   "`, it still attempts a live fetch with an invalid payload `{ content: { text: "" } }`.
3. **No Request Timeout or SLA Abort Handling**:
   Calls to `fetch()` do not specify a timeout signal (`AbortSignal.timeout(...)`). If network conditions stall, requests hang indefinitely, violating the project's `< 3s SLA` response latency rule (`PROJECT.md` line 59).
4. **Fragile Payload Response Extraction in `fetchTikTokConversations`**:
   Lines 104–112 extract `item.last_message?.text`. In TikTok Open API v2, `last_message` can be an object with nested `content.text`, a raw string, or snippet text. If missing, `snippet` becomes empty or defaults poorly without checking fallback properties.
5. **No Thread Message Fetcher for TikTok**:
   `src/lib/facebook.ts` provides `fetchFacebookThreadMessages(threadId, token)`. In `src/lib/tiktok.ts`, there is no `fetchTikTokThreadMessages(conversationId, token)`, preventing on-demand message history retrieval when an operator clicks on a specific TikTok conversation in the live chat interface.

### Observation 1.4: Existing Test Baseline and Zero-Chat Invariant
Running `npm.cmd test` passes cleanly with code 0:
- 127/127 Milestone 2 NLP & Logistics assertions passed.
- 106/106 Adversarial Zero-Chat Storage & Schema Cleanliness assertions passed.
- `data/db.json` strictly contains only `["channels", "orders", "products", "shops"]`.
Any modification to TikTok messaging MUST strictly preserve this invariant: zero storage of conversations, messages, or chat logs in the database.

---

## 2. Logic Chain

1. **Premise 1 (Requirement Compliance)**:
   Per `ORIGINAL_REQUEST.md` (R1, R2) and `PROJECT.md` (lines 48–49, 107–108), the system requires:
   - `sendTikTokMessage(conversationId, messageText, accessToken)`
   - `fetchTikTokConversations(accessToken)`
   Both must be stateless, on-demand, and compliant with zero-chat storage.

2. **Premise 2 (Offline & Automated Test Readiness)**:
   In `src/lib/store.ts` (line 34), the default TikTok channel credential is `accessToken: 'tt_mock_access_token_yangon_01'`.
   Automated integration and webhook simulation suites (`scripts/verify_m3_channels.ts` and Vitest) run without live internet access or real TikTok developer credentials.
   Therefore, `src/lib/tiktok.ts` MUST include an automatic mock/test mode detector:
   - If `accessToken.startsWith('tt_mock_')`, `accessToken.startsWith('mock_')`, `accessToken === 'test_token'`, or `process.env.MOCK_TIKTOK_API === 'true'`, or `process.env.NODE_ENV === 'test'` (without live credentials):
     - `sendTikTokMessage` must return `{ success: true, messageId: 'tt_mock_msg_...' }`.
     - `fetchTikTokConversations` must return high-fidelity mock conversations reflecting Burmese social commerce (inquiries for serum, lip tint, bags in Burmese Unicode).

3. **Premise 3 (In-Memory Test Spy for Verification)**:
   To verify that webhook handlers and sales closing workflows actually invoked `sendTikTokMessage` with the expected normalized Burmese text, without violating zero-chat DB storage, the module should provide an in-memory spy `_mockTikTokSentMessages` with a cleanup helper `_resetMockTikTokMessages()`. This array remains strictly in-memory and never touches `db.ts` or disk.

4. **Premise 4 (Resilience & SLA Enforcement)**:
   Adding `AbortSignal.timeout(5000)` prevents slow network requests from hanging.
   Strict validation ensures callers receive explicit validation errors immediately if `accessToken`, `conversationId`, or `messageText` are blank.

5. **Premise 5 (Feature Parity with Facebook)**:
   Adding an on-demand thread messages fetcher `fetchTikTokThreadMessages(conversationId, accessToken)` brings full architectural symmetry with `src/lib/facebook.ts`, allowing stateless live chat views to pull thread details on demand.

---

## 3. Caveats

1. **TikTok Open API v2 Production Scopes**:
   In production, TikTok Business Messaging requires the `user.info.basic`, `im.message.send`, and `im.message.receive` permissions granted via TikTok Developer Portal and app review.
2. **Webhook Event Field Variances**:
   TikTok webhook event payloads can arrive as `im.message.receive` or direct shop events. In `src/app/api/webhooks/tiktok/route.ts`, `body.data?.conversation_id || body.conversation_id || body.data?.sender_id` is used. The `conversationId` parameter in `sendTikTokMessage` will accept whatever ID was resolved by the webhook router.
3. **No Direct Source Editing During Exploration**:
   As an explorer agent, no edits have been applied to `src/lib/tiktok.ts`. The complete proposed code is provided as `proposed_tiktok.ts` in `.agents/teamwork/explorer_m3_2/` and embedded below for the worker agent.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Interface Specification
```typescript
export interface TikTokSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TikTokConversationSummary {
  id: string;
  snippet: string;
  updatedAt: string;
}

export interface TikTokThreadMessage {
  id: string;
  text: string;
  from: { id: string; name?: string };
  createdTime: string;
}

export interface MockTikTokSentMessage {
  conversationId: string;
  messageText: string;
  timestamp: string;
}
```

### 4.2 Complete Proposed Drop-in Code for `src/lib/tiktok.ts`
*(Also available as `.agents/teamwork/explorer_m3_2/proposed_tiktok.ts`)*:

```typescript
/**
 * TikTok Open API Client for Direct Messaging
 * Conforms to TikTok Open API v2 Business Direct Messaging specification.
 * 
 * Supports:
 *  1. Outbound message dispatch (`POST /v2/im/message/send/`)
 *  2. On-demand conversation fetching (`GET /v2/im/conversation/list/`)
 *  3. On-demand thread message fetching (`GET /v2/im/message/list/`)
 *  4. Mock / Offline test mode fallback for automated tests
 * 
 * Architectural Invariant (Zero-Chat Storage):
 *  - Conversation threads and messages are NEVER stored in our database.
 *  - Chats are fetched on-demand and kept ephemerally in-memory.
 */

export interface TikTokSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TikTokConversationSummary {
  id: string;
  snippet: string;
  updatedAt: string;
}

export interface TikTokThreadMessage {
  id: string;
  text: string;
  from: { id: string; name?: string };
  createdTime: string;
}

export interface MockTikTokSentMessage {
  conversationId: string;
  messageText: string;
  timestamp: string;
}

// In-memory test spy storage (Never touches disk or database)
export const _mockTikTokSentMessages: MockTikTokSentMessage[] = [];

/**
 * Resets the in-memory test spy for clean test runs.
 */
export function _resetMockTikTokMessages(): void {
  _mockTikTokSentMessages.length = 0;
}

/**
 * Determines whether the given token or environment indicates mock/test mode.
 */
export function isTikTokMockMode(accessToken: string): boolean {
  if (!accessToken) return false;
  return (
    accessToken.startsWith('tt_mock_') ||
    accessToken.startsWith('mock_') ||
    accessToken === 'test_token' ||
    process.env.MOCK_TIKTOK_API === 'true' ||
    (process.env.NODE_ENV === 'test' && !process.env.TIKTOK_LIVE_CREDENTIALS)
  );
}

/**
 * Mock conversations fixtures representing Myanmar social commerce scenarios.
 */
const MOCK_CONVERSATIONS: TikTokConversationSummary[] = [
  {
    id: 'conv-tt-01',
    snippet: 'Lip tint #01 နဲ့ Vintage Bag classic brown တစ်လုံး ဝယ်ချင်လို့ဗျ',
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'conv-tt-02',
    snippet: 'မင်္ဂလာပါရှင့် Serum စျေးလေးသိချင်လို့ပါ KPay ရလားရှင်?',
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'conv-tt-03',
    snippet: 'မန္တလေး ချမ်းအေးသာစံကို ပို့ခ ဘယ်လောက်ကျမလဲ? COD ရလား?',
    updatedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

/**
 * Dispatches an automated text reply via TikTok Direct Message API.
 * 
 * @param conversationId - The TikTok conversation ID
 * @param messageText - The Burmese/English text reply to send
 * @param accessToken - The channel access token (or mock token)
 */
export async function sendTikTokMessage(
  conversationId: string,
  messageText: string,
  accessToken: string
): Promise<TikTokSendResult> {
  // 1. Strict Parameter Validation
  if (!accessToken || !accessToken.trim()) {
    return {
      success: false,
      error: 'Missing or empty accessToken',
    };
  }

  if (!conversationId || !conversationId.trim()) {
    return {
      success: false,
      error: 'Missing or empty conversationId',
    };
  }

  if (!messageText || !messageText.trim()) {
    return {
      success: false,
      error: 'Missing or empty messageText',
    };
  }

  // 2. Mock / Test Mode Fallback
  if (isTikTokMockMode(accessToken)) {
    const mockMessageId = `tt_mock_msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    _mockTikTokSentMessages.push({
      conversationId,
      messageText,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      messageId: mockMessageId,
    };
  }

  // 3. Live TikTok Open API v2 Call
  const url = 'https://open.tiktokapis.com/v2/im/message/send/';

  try {
    const payload = {
      conversation_id: conversationId,
      content: {
        text: messageText,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // Enforce 5s timeout to support < 3s SLA
    });

    const data = await response.json();

    const isOk = response.ok && (data.code === 0 || data.error?.code === 'ok' || Boolean(data.data?.message_id));

    if (!isOk) {
      console.error('[TikTok Send Error]:', data);
      return {
        success: false,
        error: data.error?.message || data.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: data.data?.message_id || data.message_id || `tt_msg_${Date.now()}`,
    };
  } catch (err: any) {
    console.error('[TikTok Send Network Exception]:', err);
    return {
      success: false,
      error: err.name === 'TimeoutError' ? 'TikTok API request timed out' : (err.message || 'Network error'),
    };
  }
}

/**
 * Fetches recent TikTok conversation threads on-demand.
 * Kept strictly ephemeral in memory to maintain the Zero-Chat Invariant.
 * 
 * @param accessToken - The channel access token (or mock token)
 */
export async function fetchTikTokConversations(
  accessToken: string
): Promise<TikTokConversationSummary[]> {
  if (!accessToken || !accessToken.trim()) {
    return [];
  }

  // 1. Mock / Test Mode Fallback
  if (isTikTokMockMode(accessToken)) {
    return [...MOCK_CONVERSATIONS];
  }

  // 2. Live TikTok Open API v2 Call
  const url = 'https://open.tiktokapis.com/v2/im/conversation/list/';

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`[TikTok API] Failed to fetch conversations: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const rawList = Array.isArray(data.data?.conversations)
      ? data.data.conversations
      : Array.isArray(data.conversations)
        ? data.conversations
        : [];

    return rawList.map((item: any) => ({
      id: item.conversation_id || item.id || `tt_conv_${Math.random()}`,
      snippet:
        (typeof item.last_message === 'string' ? item.last_message : null) ||
        item.last_message?.text ||
        item.last_message?.content?.text ||
        item.snippet ||
        item.content?.text ||
        '',
      updatedAt:
        item.updated_time ||
        item.updated_at ||
        item.update_time ||
        new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[TikTok API] Error fetching conversations:', err);
    return [];
  }
}

/**
 * Optional Helper: Fetches message history for a specific TikTok thread on-demand.
 * Kept strictly ephemeral in memory to enforce the Zero-Chat Invariant.
 * 
 * @param conversationId - The TikTok conversation thread ID
 * @param accessToken - The channel access token (or mock token)
 */
export async function fetchTikTokThreadMessages(
  conversationId: string,
  accessToken: string
): Promise<TikTokThreadMessage[]> {
  if (!accessToken || !conversationId) {
    return [];
  }

  // 1. Mock Mode Fallback
  if (isTikTokMockMode(accessToken)) {
    return [
      {
        id: `tt_msg_${conversationId}_1`,
        text: 'မင်္ဂလာပါ ပစ္စည်းစျေးနဲ့ ပို့ခလေး သိချင်လို့ပါ',
        from: { id: 'tt_cust_mock', name: 'TikTok Customer' },
        createdTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: `tt_msg_${conversationId}_2`,
        text: 'မင်္ဂလာပါရှင့် မင်မင်တို့ဆိုင်မှ ကြိုဆိုပါတယ်ရှင်🌸 ဘယ်ပစ္စည်းလေးမှာယူလိုပါသလဲရှင့်?',
        from: { id: 'tt_shop_bot', name: 'Shop AI' },
        createdTime: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      },
    ];
  }

  // 2. Live TikTok Open API v2 Call
  const url = `https://open.tiktokapis.com/v2/im/message/list/?conversation_id=${encodeURIComponent(conversationId)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const rawList = Array.isArray(data.data?.messages)
      ? data.data.messages
      : Array.isArray(data.messages)
        ? data.messages
        : [];

    return rawList.map((msg: any) => ({
      id: msg.message_id || msg.id,
      text: msg.content?.text || msg.text || '',
      from: {
        id: msg.sender_id || msg.from?.id || '',
        name: msg.sender_name || msg.from?.name,
      },
      createdTime: msg.create_time || msg.created_at || new Date().toISOString(),
    })).reverse();
  } catch (err) {
    console.error('[TikTok API] Error fetching thread messages:', err);
    return [];
  }
}
```

---

## 5. Verification Method

To verify the implementation once applied:

### Verification Test Suite Items
The verification script (e.g. within `scripts/verify_m3_channels.ts`) must test:
1. **Parameter Validation Probes**:
   - `sendTikTokMessage('', 'hello', 'token')` → returns `{ success: false, error: 'Missing or empty conversationId' }`.
   - `sendTikTokMessage('conv_1', '', 'token')` → returns `{ success: false, error: 'Missing or empty messageText' }`.
   - `sendTikTokMessage('conv_1', 'hello', '')` → returns `{ success: false, error: 'Missing or empty accessToken' }`.
2. **Mock Mode Outbound Dispatch**:
   - `_resetMockTikTokMessages()`
   - `const res = await sendTikTokMessage('conv_tt_01', 'မင်္ဂလာပါ', 'tt_mock_access_token_yangon_01')`
   - Assert: `res.success === true`
   - Assert: `typeof res.messageId === 'string' && res.messageId.startsWith('tt_mock_msg_')`
   - Assert: `_mockTikTokSentMessages.length === 1 && _mockTikTokSentMessages[0].messageText === 'မင်္ဂလာပါ'`
3. **On-Demand Conversation List Fetching**:
   - `const convsEmpty = await fetchTikTokConversations('')` → Assert `convsEmpty.length === 0`
   - `const convsMock = await fetchTikTokConversations('tt_mock_access_token_yangon_01')` → Assert `convsMock.length >= 3`
   - For each conversation in `convsMock`:
     - Assert `typeof convs.id === 'string'`
     - Assert `typeof convs.snippet === 'string' && convs.snippet.length > 0`
     - Assert `typeof convs.updatedAt === 'string'`
4. **On-Demand Thread Message Fetching**:
   - `const msgs = await fetchTikTokThreadMessages('conv_tt_01', 'tt_mock_access_token_yangon_01')` → Assert `msgs.length >= 2`
   - Assert `msgs[0].text.length > 0`
5. **Zero-Chat Storage Invariant Probe**:
   - After running all TikTok calls, inspect `data/db.json`:
     - Assert `data/db.json` has not been modified or poisoned with chat records.
     - Assert `Object.keys(JSON.parse(fs.readFileSync('data/db.json')))` strictly contains only `['channels', 'orders', 'products', 'shops']`.
6. **Command**:
   ```bash
   npm.cmd test
   ```
   Must pass all tests cleanly with exit code 0.

### Invalidation Conditions
- If `sendTikTokMessage` throws unhandled network errors when supplied with mock tokens.
- If `fetchTikTokConversations` writes any record to `db.ts` or `data/db.json`.
- If `npm.cmd test` fails.
