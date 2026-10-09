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
    process.env.MOCK_CHANNELS === 'true' ||
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
