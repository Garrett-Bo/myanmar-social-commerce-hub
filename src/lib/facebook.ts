/**
 * Meta Graph API Client for Facebook Messenger
 * Supports:
 *  1. Outbound message dispatch (`POST /me/messages`)
 *  2. On-demand thread fetching (`GET /{page_id}/conversations`)
 *  3. On-demand message fetching (`GET /{thread_id}/messages`)
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

export interface MockFacebookSentMessage {
  recipientId: string;
  messageText: string;
  timestamp: string;
}

// In-memory test spy storage (Never touches disk or database)
export const _mockFacebookSentMessages: MockFacebookSentMessage[] = [];

export function _resetMockFacebookMessages(): void {
  _mockFacebookSentMessages.length = 0;
}

/**
 * Determines whether the client should operate in mock mode.
 * Activates when:
 *  - Running in test environment (process.env.NODE_ENV === 'test')
 *  - Token is a mock token (contains 'mock' or starts with 'EAA_mock_' / 'test_' / 'EAAX_MOCK_')
 *  - Explicitly configured via process.env.MOCK_FACEBOOK === 'true' or process.env.MOCK_CHANNELS === 'true'
 */
export function isFacebookMockMode(token?: string): boolean {
  if (process.env.MOCK_FACEBOOK === 'true' || process.env.MOCK_CHANNELS === 'true') return true;
  if (!token) return false;
  const lower = token.toLowerCase();
  if (lower.includes('mock') || lower.startsWith('test_') || lower === 'mock-token') return true;
  if (process.env.NODE_ENV === 'test' && !process.env.FB_LIVE_CREDENTIALS) return true;
  return false;
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
    const mockMsgId = `m_mock_fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    _mockFacebookSentMessages.push({
      recipientId: recipientId.trim(),
      messageText: sanitizedText,
      timestamp: new Date().toISOString(),
    });
    return {
      success: true,
      messageId: mockMsgId,
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
