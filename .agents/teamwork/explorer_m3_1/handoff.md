# Milestone 3 Explorer Handoff: Facebook Graph API & On-Demand Messaging

**Agent**: `explorer_m3_1`  
**Role**: `teamwork_preview_explorer`  
**Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m3_1`  
**Target Module**: `src/lib/facebook.ts` (with impacts on `src/app/api/webhooks/facebook/route.ts` and test verification suites)  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  

---

## 1. Observation

### 1.1 Existing Facebook Graph API Client in `src/lib/facebook.ts`
- **File**: `src/lib/facebook.ts` (174 lines).
- Functions currently defined:
  1. `sendFacebookMessage(recipientId: string, messageText: string, pageAccessToken: string): Promise<FacebookSendResult>` (lines 38–91):
     - Hits `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`.
     - Payload: `{ recipient: { id: recipientId }, messaging_type: 'RESPONSE', message: { text: messageText } }`.
     - Error handling: Returns `{ success: false, error: data.error?.message || \`HTTP ${response.status}\` }`.
     - **Deficiency Observed**: Does not contain any offline/mock fallback for test environments or mock tokens (e.g., `EAA_mock_fb_access_token_yangon_01` seeded in `src/lib/store.ts`). Without real internet or Meta credentials, calls to `fetch()` fail or reject with HTTP 400 OAuth errors.
     - **Deficiency Observed**: Missing message text validation (empty/whitespace string) and Meta character truncation protection (Meta enforces a maximum of 2,000 UTF-8 characters per message).
     - **Deficiency Observed**: Missing 3-second SLA timeout handling (`AbortSignal.timeout(3000)`).
  2. `fetchFacebookConversations(pageId: string, pageAccessToken: string): Promise<FacebookConversationSummary[]>` (lines 97–133):
     - Takes `pageId: string, pageAccessToken: string`, but line 105 hardcodes `https://graph.facebook.com/v21.0/me/conversations` rather than targeting the provided `pageId` (`/${encodeURIComponent(pageId)}/conversations`).
     - **Deficiency Observed**: Lacks mock mode fallback for testing and offline environments.
  3. `fetchFacebookThreadMessages(threadId: string, pageAccessToken: string): Promise<FacebookThreadMessage[]>` (lines 138–173):
     - Queries `https://graph.facebook.com/v21.0/${encodeURIComponent(threadId)}/messages?fields=id,message,from,created_time&limit=25...`.
     - Reverses items so oldest messages appear first (`.reverse()`).
     - **Deficiency Observed**: Lacks mock mode fallback for testing and offline environments.

### 1.2 Multi-Tenant Database & Zero-Chat Invariant
- **File**: `src/lib/db.ts` (482 lines) and `src/types/index.ts` (127 lines).
- `src/lib/db.ts` explicitly stores only 4 canonical root collections: `shops`, `products`, `channels`, and `orders`.
- The adversarial probe (`scripts/adversarial_zero_chat_probe.ts`) strictly asserts that `db.json` has NO `conversations` or `messages` root keys, and `MultiTenantDB` has zero conversation/message persistence methods.
- Interface contract in `PROJECT.md` line 103–106 specifies:
  - `sendFacebookMessage(recipientId: string, messageText: string, pageAccessToken: string): Promise<{ success: boolean; messageId?: string; error?: string }>`
  - `fetchFacebookConversations(pageId: string, pageAccessToken: string): Promise<Array<{ id: string; updatedTime: string; snippet: string; senderId: string; senderName?: string }>>`
  - `fetchFacebookThreadMessages(threadId: string, pageAccessToken: string): Promise<Array<{ id: string; text: string; from: { id: string; name?: string }; createdTime: string }>>`
- `src/lib/facebook.ts` does NOT import `db` or persist any records, maintaining 100% compliance with the Zero-Chat Storage invariant.

### 1.3 Webhook Route Typo in `src/app/api/webhooks/facebook/route.ts`
- **File**: `src/app/api/webhooks/facebook/route.ts`:
  - Line 66:
    ```typescript
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || channel?.pageId;
    ```
  - **Deficiency Observed**: `channel?.pageId` is passed as the token fallback instead of `channel?.accessToken`. For multi-tenant operation, `channel?.accessToken` holds the tenant's Page Access Token (e.g. `EAA_mock_fb_access_token_yangon_01`).

---

## 2. Logic Chain

1. **Test Environment Independence**: Automated test execution (`npm test`, Vitest) must run deterministically in CI and local machines without external network dependencies, live Meta Developer apps, or active internet connections.
2. **Mock Activation Heuristic**: When `pageAccessToken` contains `"mock"`, starts with `"test_"`, is equal to `"mock-token"`, or when `process.env.NODE_ENV === 'test'` or `process.env.MOCK_FACEBOOK === 'true'`, the client should bypass outbound HTTP network requests and return high-fidelity mock fixtures.
3. **Outbound Messaging Fidelity**:
   - For valid mock tokens, `sendFacebookMessage` should return `{ success: true, messageId: \`m_mock_fb_${Date.now()}_...\`, recipientId }`.
   - Input validation must still run in mock mode: missing or blank `recipientId`, `messageText`, or `pageAccessToken` must return `{ success: false, error: '...' }` to ensure callers properly handle validation errors.
   - For live calls, Meta Graph API v21.0 requires `messaging_type: 'RESPONSE'` for 24-hour customer window replies.
   - Text must be guarded against Meta's 2,000-character ceiling by truncating at 1997 chars + `'...'`.
   - HTTP request must include an AbortController with a 3-second timeout to adhere to the project SLA (< 3s end-to-end response time).
4. **On-Demand Chat Fetching**:
   - `fetchFacebookConversations(pageId, pageAccessToken)` must support `pageId ? encodeURIComponent(pageId) : 'me'`, returning `{ id, updatedTime, snippet, senderId, senderName }`.
   - In mock mode, it must return realistic conversation summaries tailored to the shop (e.g. Aung Thukha Fashion / Mandalay Trendy Closet).
   - `fetchFacebookThreadMessages(threadId, pageAccessToken)` must return chronological messages (`.reverse()`) with `{ id, text, from: { id, name }, createdTime }`.
   - In mock mode, it must return realistic message thread items.
5. **Zero-Chat Storage Invariant Preservation**:
   - All conversation and message data remain ephemeral and in-memory. Under no circumstances should `facebook.ts` interact with `db.ts` or persist data.
6. **Webhook Token Resolution Alignment**:
   - `src/app/api/webhooks/facebook/route.ts` line 66 must resolve `channel?.accessToken` (not `channel?.pageId`), enabling each tenant's configured channel credentials to flow into `sendFacebookMessage`.

---

## 3. Caveats

- **Meta Graph API 24-Hour Policy**: In live production, standard `RESPONSE` messaging type is only permitted within 24 hours of the customer's last message. Outside this window, Meta requires a Message Tag (`CONFIRMED_EVENT_UPDATE`, `POST_PURCHASE_UPDATE`, `ACCOUNT_UPDATE`) or Human Agent tag. In our scope, automated Burmese replies are immediate responses to inbound customer inquiries, which are always within the 24-hour window.
- **Token Permissions**: In production, the Page Access Token requires `pages_messaging` and `pages_read_engagement` permissions approved via Meta App Review. In development/testing, standard mock tokens bypass this requirement.
- **Network Outages**: If Meta's Graph API is down or unreachable during live production calls, the client returns structured error objects `{ success: false, error: '...' }` rather than throwing uncaught exceptions.

---

## 4. Conclusion

The blueprint for `src/lib/facebook.ts` requires:
1. Retaining and perfecting the 3 core functions conforming exactly to `PROJECT.md` contracts:
   - `sendFacebookMessage(recipientId: string, messageText: string, pageAccessToken: string)`
   - `fetchFacebookConversations(pageId: string, pageAccessToken: string)`
   - `fetchFacebookThreadMessages(threadId: string, pageAccessToken: string)`
2. Adding a unified mock mode detector `isFacebookMockMode(token?: string)` and mock fixtures for conversations and messages.
3. Adding input validation (reject empty recipient/message/token) and 2,000-character message truncation.
4. Adding an AbortController with a 3,000ms SLA timeout.
5. Documenting the fix for `src/app/api/webhooks/facebook/route.ts` line 66 to reference `channel?.accessToken`.

### Proposed Implementation Code for `src/lib/facebook.ts`:

```typescript
/**
 * Meta Graph API Client for Facebook Messenger
 * Supports:
 *  1. Outbound message dispatch (POST /me/messages)
 *  2. On-demand thread fetching (GET /{page_id}/conversations)
 *  3. On-demand message fetching (GET /{thread_id}/messages)
 *  4. Mock / Offline test mode for automated test suites
 * Zero-Chat Invariant: Conversation messages are never stored in our database.
 */

export interface FacebookSendResult {
  success: boolean;
  messageId?: string;
  recipientId?: string;
  error?: string;
}

export interface FacebookConversationSummary {
  id: string;
  updatedTime: string;
  snippet: string;
  senderId: string;
  senderName?: string;
}

export interface FacebookThreadMessage {
  id: string;
  text: string;
  from: { id: string; name?: string };
  createdTime: string;
}

/**
 * Determines whether the client should operate in mock mode.
 * Activates when:
 *  - Running in test environment (process.env.NODE_ENV === 'test')
 *  - Token is a mock token (contains 'mock' or starts with 'EAA_mock_' / 'test_')
 *  - Explicitly configured via process.env.MOCK_FACEBOOK === 'true'
 */
export function isFacebookMockMode(token?: string): boolean {
  if (process.env.MOCK_FACEBOOK === 'true') return true;
  if (process.env.NODE_ENV === 'test') return true;
  if (!token) return false;
  const lower = token.toLowerCase();
  return lower.includes('mock') || lower.startsWith('test_') || lower === 'mock-token';
}

/**
 * Dispatches a text message to a Facebook Messenger user.
 * Conforms to Meta Graph API v21.0 POST /me/messages
 *
 * @param recipientId - PSID (Page-Scoped User ID) of the customer
 * @param messageText - The Burmese/English text reply to send
 * @param pageAccessToken - The Page Access Token of the specific shop's Facebook Page
 */
export async function sendFacebookMessage(
  recipientId: string,
  messageText: string,
  pageAccessToken: string
): Promise<FacebookSendResult> {
  // 1. Parameter Validation
  if (!pageAccessToken || !pageAccessToken.trim()) {
    return {
      success: false,
      error: 'Missing pageAccessToken',
    };
  }

  if (!recipientId || !recipientId.trim()) {
    return {
      success: false,
      error: 'Missing recipientId',
    };
  }

  if (!messageText || !messageText.trim()) {
    return {
      success: false,
      error: 'Message text cannot be empty',
    };
  }

  // Sanitize text length (Meta limit is 2000 chars)
  const sanitizedText = messageText.length > 2000 
    ? messageText.substring(0, 1997) + '...' 
    : messageText;

  // 2. Mock / Test Mode Fallback
  if (isFacebookMockMode(pageAccessToken)) {
    return {
      success: true,
      messageId: `m_mock_fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      recipientId: recipientId.trim(),
    };
  }

  // 3. Live Meta Graph API Call
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    const payload = {
      recipient: { id: recipientId.trim() },
      messaging_type: 'RESPONSE',
      message: { text: sanitizedText },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second SLA timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const errObj = data.error || {};
      const errorMessage = errObj.message || `HTTP ${response.status}`;
      const errorCode = errObj.code ? ` (Code ${errObj.code})` : '';
      console.error(`[Facebook Send Error]${errorCode}:`, data);

      return {
        success: false,
        error: `${errorMessage}${errorCode}`,
      };
    }

    return {
      success: true,
      messageId: data.message_id,
      recipientId: data.recipient_id,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Network timeout: Facebook Graph API took longer than 3s',
      };
    }
    console.error('[Facebook Send Network Exception]:', err);
    return {
      success: false,
      error: err.message || 'Network error',
    };
  }
}

/**
 * Fetches recent conversation threads on-demand from Facebook Page.
 * Kept entirely ephemeral in-memory to enforce the Zero-Chat Database Invariant.
 *
 * @param pageId - Facebook Page ID
 * @param pageAccessToken - Page Access Token
 */
export async function fetchFacebookConversations(
  pageId: string,
  pageAccessToken: string
): Promise<FacebookConversationSummary[]> {
  if (!pageAccessToken || !pageAccessToken.trim()) {
    return [];
  }

  // Mock / Test Mode Fallback
  if (isFacebookMockMode(pageAccessToken)) {
    return getMockFacebookConversations(pageId);
  }

  const target = pageId ? encodeURIComponent(pageId) : 'me';
  const url = `https://graph.facebook.com/v21.0/${target}/conversations?fields=id,updated_time,snippet,senders&access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Facebook API] Failed to fetch conversations: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((item: any) => {
      const sender = item.senders?.data?.find((s: any) => s.id !== pageId) || item.senders?.data?.[0];
      return {
        id: item.id,
        updatedTime: item.updated_time,
        snippet: item.snippet || '',
        senderId: sender?.id || 'unknown',
        senderName: sender?.name || `Customer (${sender?.id ? sender.id.slice(-4) : 'FB'})`,
      };
    });
  } catch (err) {
    console.error('[Facebook API] Error fetching conversations:', err);
    return [];
  }
}

/**
 * Fetches thread message history on-demand directly from Facebook Graph API.
 * Kept strictly ephemeral in memory to maintain the Zero-Chat Invariant.
 *
 * @param threadId - Facebook Conversation Thread ID
 * @param pageAccessToken - Page Access Token
 */
export async function fetchFacebookThreadMessages(
  threadId: string,
  pageAccessToken: string
): Promise<FacebookThreadMessage[]> {
  if (!pageAccessToken || !pageAccessToken.trim() || !threadId || !threadId.trim()) {
    return [];
  }

  // Mock / Test Mode Fallback
  if (isFacebookMockMode(pageAccessToken)) {
    return getMockFacebookThreadMessages(threadId);
  }

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(threadId)}/messages?fields=id,message,from,created_time&limit=25&access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Facebook API] Failed to fetch thread messages: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data
      .map((msg: any) => ({
        id: msg.id,
        text: msg.message || '',
        from: {
          id: msg.from?.id || '',
          name: msg.from?.name,
        },
        createdTime: msg.created_time || '',
      }))
      .reverse(); // Chronological order: Oldest first
  } catch (err) {
    console.error('[Facebook API] Error fetching thread messages:', err);
    return [];
  }
}

// ============================================================================
// MOCK FIXTURES FOR OFFLINE / TEST ENVIRONMENTS
// ============================================================================

function getMockFacebookConversations(pageId: string): FacebookConversationSummary[] {
  if (pageId === '209384756102938') {
    // Mandalay Trendy Closet
    return [
      {
        id: 't_fb_mdy_01',
        updatedTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        snippet: 'မန္တလေးချည်ထည် ပုဆိုးအရောင်စုံရှိလားဗျာ? ချမ်းအေးသာစံကို ပို့ပေးပါ',
        senderId: 'fb_usr_mdy_01',
        senderName: 'Ko Zaw Min Tun',
      },
      {
        id: 't_fb_mdy_02',
        updatedTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        snippet: 'အဖြူရောင် ချည်သား ကော်လံရှပ် L size ရှိလားခင်ဗျ',
        senderId: 'fb_usr_mdy_02',
        senderName: 'Ma Thuzar',
      },
    ];
  }

  // Default / Yangon Shop (Aung Thukha)
  return [
    {
      id: 't_fb_yangon_01',
      updatedTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      snippet: 'Serum လေး instock ရှိလားရှင်? စမ်းချောင်းကို ပို့ခ ဘယ်လောက်ကျမလဲ?',
      senderId: 'fb_user_9921',
      senderName: 'Ma Hnin Yu Wai',
    },
    {
      id: 't_fb_yangon_02',
      updatedTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      snippet: 'မင်္ဂလာပါ ပစ္စည်းပို့တာ အိမ်ရောက်ငွေချေ (COD) ရလားရှင့်?',
      senderId: 'fb_user_3301',
      senderName: 'Daw Khin Myo Chit',
    },
    {
      id: 't_fb_yangon_03',
      updatedTime: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      snippet: 'Vintage Leather Crossbody Bag အနက်ရောင် ကျန်သေးလားရှင့်?',
      senderId: 'fb_user_5512',
      senderName: 'Ma Sandar',
    },
  ];
}

function getMockFacebookThreadMessages(threadId: string): FacebookThreadMessage[] {
  if (threadId === 't_fb_mdy_01') {
    return [
      {
        id: 'm_fb_mdy_101',
        text: 'မန္တလေးချည်ထည် ပုဆိုးအရောင်စုံရှိလားဗျာ? ချမ်းအေးသာစံကို ပို့ပေးပါ',
        from: { id: 'fb_usr_mdy_01', name: 'Ko Zaw Min Tun' },
        createdTime: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
      },
      {
        id: 'm_fb_mdy_102',
        text: 'ဟုတ်ကဲ့ရှိပါတယ်ခင်ဗျာ မန္တလေးချည်ပိုးထည် ပုဆိုး ၄၅,၀၀၀ ကျပ်ပါ ချမ်းအေးသာစံကို အိမ်အရောက် ၂၀၀၀ ကျပ်နဲ့ ပို့ပေးပါတယ်ခင်ဗျာ',
        from: { id: '209384756102938', name: 'Mandalay Trendy Closet' },
        createdTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ];
  }

  // Default thread (Yangon)
  return [
    {
      id: 'm_fb_ygn_101',
      text: 'Serum လေး instock ရှိလားရှင်? စမ်းချောင်းကို ပို့ခ ဘယ်လောက်ကျမလဲ?',
      from: { id: 'fb_user_9921', name: 'Ma Hnin Yu Wai' },
      createdTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'm_fb_ygn_102',
      text: 'မင်္ဂလာပါရှင့် မင်မင်တို့ဆိုင်မှ ကြိုဆိုပါတယ်ရှင်🌸 Niacinamide Whitening Serum ၂၈,၀၀၀ ကျပ် instock ရှိပါတယ်ရှင်။ စမ်းချောင်းမြို့နယ်ဆို ပို့ခ ၂,၅၀၀ ကျပ်နဲ့ အိမ်အရောက် ငွေချေ (COD) ရပါတယ်ရှင့်💕',
      from: { id: '109283746501928', name: 'Aung Thukha Fashion' },
      createdTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
    {
      id: 'm_fb_ygn_103',
      text: 'ဟုတ်ကဲ့ serum ၁ ဘူး ဝယ်ယူပါမယ်ရှင် KPay နဲ့ ရှင်းပေးပါမယ်',
      from: { id: 'fb_user_9921', name: 'Ma Hnin Yu Wai' },
      createdTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ];
}
```

---

## 5. Verification Method

To independently verify this blueprint:
1. **TypeScript Typecheck**:
   Ensure `src/lib/facebook.ts` exports match `PROJECT.md` contracts:
   - `sendFacebookMessage`: returns `Promise<{ success: boolean; messageId?: string; error?: string }>`
   - `fetchFacebookConversations`: returns `Promise<FacebookConversationSummary[]>`
   - `fetchFacebookThreadMessages`: returns `Promise<FacebookThreadMessage[]>`
2. **Automated Unit Verification**:
   Execute a test script testing both validation failures and mock successes:
   ```typescript
   // Test 1: Validation rejection on empty parameters
   const res1 = await sendFacebookMessage('', 'hello', 'token');
   assert(!res1.success && res1.error === 'Missing recipientId');

   // Test 2: Mock mode success with mock token
   const res2 = await sendFacebookMessage('fb_user_123', 'မင်္ဂလာပါ', 'EAA_mock_token');
   assert(res2.success && res2.messageId && res2.recipientId === 'fb_user_123');

   // Test 3: On-demand conversations without DB storage
   const convs = await fetchFacebookConversations('109283746501928', 'EAA_mock_token');
   assert(convs.length > 0 && convs[0].senderId && convs[0].snippet);

   // Test 4: On-demand thread messages
   const msgs = await fetchFacebookThreadMessages('t_fb_yangon_01', 'EAA_mock_token');
   assert(msgs.length > 0 && msgs[0].text && msgs[0].from);
   ```
3. **Zero-Chat Invariant Verification**:
   Run `npx tsx scripts/adversarial_zero_chat_probe.ts` to confirm `data/db.json` continues to have 0 message or conversation records.
4. **Full Test Command**:
   `npm.cmd test` passes cleanly with 0 failures.
