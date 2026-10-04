/**
 * Meta Graph API Client for Facebook Messenger Outbound Messaging
 * Sends automated responses directly to customers on Facebook Messenger.
 */

export interface FacebookSendResult {
  success: boolean;
  messageId?: string;
  recipientId?: string;
  error?: string;
}

/**
 * Dispatches a text message to a Facebook Messenger user.
 * @param recipientId - PSID (Page-Scoped User ID) of the customer
 * @param messageText - The Burmese/English text reply to send
 * @param pageAccessToken - The Page Access Token of the specific shop's Facebook Page
 */
export async function sendFacebookMessage(
  recipientId: string,
  messageText: string,
  pageAccessToken: string
): Promise<FacebookSendResult> {
  if (!pageAccessToken || !recipientId) {
    console.warn('[Facebook Send] Missing pageAccessToken or recipientId. Skipping outbound HTTP call.');
    return {
      success: false,
      error: 'Missing pageAccessToken or recipientId',
    };
  }

  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    const payload = {
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text: messageText },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Facebook Send Error]:', data);
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    console.log(`[Facebook Send Success] Message delivered to PSID ${recipientId}: ID ${data.message_id}`);
    return {
      success: true,
      messageId: data.message_id,
      recipientId: data.recipient_id,
    };
  } catch (err: any) {
    console.error('[Facebook Send Network Exception]:', err);
    return {
      success: false,
      error: err.message || 'Network error',
    };
  }
}
