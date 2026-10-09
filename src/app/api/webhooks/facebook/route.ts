import { NextRequest, NextResponse } from 'next/server';
import { normalizeBurmese } from '@/lib/burmese-converter';
import { processCustomerMessage } from '@/lib/gemini-agent';
import { db } from '@/lib/db';
import { sendFacebookMessage } from '@/lib/facebook';

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

// Facebook Messenger Inbound Message Receiver & Outbound Dispatcher (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id; // The Facebook Page that received the message
        const webhookEvent = entry.messaging?.[0];

        // Ensure message exists, is not a bot echo, and contains text
        if (webhookEvent && webhookEvent.message && !webhookEvent.message.is_echo && webhookEvent.message.text) {
          const senderId = webhookEvent.sender.id; // Customer PSID
          const rawMessageText = webhookEvent.message.text;

          // 1. Multi-Tenant Lookup: Match incoming Page ID strictly to the owning shop
          const match = await db.findShopByChannel('facebook', pageId);
          const shop = match?.shop;
          const channel = match?.channel;

          if (!shop) {
            console.warn(`[FB Webhook] No shop registered for Page ID ${pageId}`);
            continue;
          }

          // 2. Fetch shop's specific products
          const products = await db.getProducts(shop.id);

          // 3. Normalize Burmese text (Zawgyi -> Unicode)
          const normalized = normalizeBurmese(rawMessageText);
          console.log(`[FB Inbound for Shop "${shop.name}"] from ${senderId}: ${normalized}`);

          // 4. Run Burmese AI Agent (ephemeral in-memory processing)
          const aiResponse = await processCustomerMessage(normalized, {
            shop,
            products,
            customerName: `Customer (${senderId.slice(-4)})`,
            conversationHistory: [{ role: 'user', content: normalized }],
          });

          console.log(`[AI Response for Shop "${shop.name}"]: ${aiResponse.replyTextMm}`);

          // 5. Outbound Dispatch: Send message back to the customer on Facebook Messenger
          const pageAccessToken = channel?.accessToken || process.env.FB_PAGE_ACCESS_TOKEN;
          if (pageAccessToken) {
            const sendResult = await sendFacebookMessage(
              senderId,
              aiResponse.replyTextMm,
              pageAccessToken
            );
            console.log(`[FB Outbound Result]:`, sendResult);
          } else {
            console.log(`[FB Outbound Skipped]: No access token configured for Facebook channel.`);
          }
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
