import { NextRequest, NextResponse } from 'next/server';
import { normalizeBurmese } from '@/lib/burmese-converter';
import { processCustomerMessage } from '@/lib/gemini-agent';
import { INITIAL_PRODUCTS, INITIAL_SHOP } from '@/lib/store';

// Facebook Webhook Verification Challenge (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'shwe_shop_fb_token_2026';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Facebook Webhook Verified]');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

// Facebook Messenger Inbound Message Receiver (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const webhookEvent = entry.messaging?.[0];
        if (webhookEvent && webhookEvent.message && webhookEvent.message.text) {
          const senderId = webhookEvent.sender.id;
          const rawMessageText = webhookEvent.message.text;

          // 1. Normalize Burmese text (Zawgyi -> Unicode)
          const normalized = normalizeBurmese(rawMessageText);

          console.log(`[FB Inbound from ${senderId}]: ${normalized}`);

          // 2. Process with AI Agent
          const aiResponse = await processCustomerMessage(normalized, {
            shop: INITIAL_SHOP,
            products: INITIAL_PRODUCTS,
            customerName: `FB Customer (${senderId.slice(-4)})`,
            conversationHistory: [{ role: 'user', content: normalized }],
          });

          console.log(`[AI Response to FB]: ${aiResponse.replyTextMm}`);

          // In production: dispatch reply using Meta Graph API:
          // POST https://graph.facebook.com/v21.0/me/messages?access_token=PAGE_ACCESS_TOKEN
        }
      }

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    return NextResponse.json({ status: 'NOT_A_PAGE_EVENT' }, { status: 404 });
  } catch (error) {
    console.error('Facebook Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
