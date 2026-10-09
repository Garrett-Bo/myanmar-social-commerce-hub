import { NextRequest, NextResponse } from 'next/server';
import { normalizeBurmese } from '@/lib/burmese-converter';
import { processCustomerMessage } from '@/lib/gemini-agent';
import { db } from '@/lib/db';
import { sendTikTokMessage } from '@/lib/tiktok';

// TikTok Webhook Verification Handshake (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge');
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ status: 'ok', service: 'tiktok-webhook' }, { status: 200 });
}

// TikTok Shop / Direct Message Webhook Receiver (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // TikTok event payload handling
    if (body.event === 'im.message.receive' || body.type === 'message') {
      const senderId = body.data?.sender_id || body.sender_id || 'tt_user_unknown';
      const conversationId = body.data?.conversation_id || body.conversation_id || senderId;
      const rawText = body.data?.content?.text || body.content?.text || body.text || '';
      const channelIdentifier =
        body.data?.shop_id ||
        body.shop_id ||
        body.data?.channel_id ||
        body.channel_id ||
        body.data?.page_id ||
        body.page_id ||
        body.data?.app_key ||
        body.app_key ||
        '';

      if (rawText) {
        // 1. Resolve owning tenant shop strictly
        const match = channelIdentifier ? await db.findShopByChannel('tiktok', channelIdentifier) : null;
        const shop = match?.shop;
        const channel = match?.channel;

        if (!shop) {
          console.warn('[TikTok Webhook] No matching shop found for TikTok payload identifier:', channelIdentifier);
          return NextResponse.json({ code: 0, message: 'no_tenant' }, { status: 200 });
        }

        // 2. Fetch tenant's live products
        const products = await db.getProducts(shop.id);

        // 3. Normalize Burmese text (Zawgyi -> Unicode)
        const normalized = normalizeBurmese(rawText);
        console.log(`[TikTok Inbound for Shop "${shop.name}"] from ${senderId}: ${normalized}`);

        // 4. Process with AI Agent (ephemeral in-memory processing)
        const aiResponse = await processCustomerMessage(normalized, {
          shop,
          products,
          customerName: `TikTok Customer (${senderId.slice(-4)})`,
          conversationHistory: [{ role: 'user', content: normalized }],
        });

        console.log(`[AI Response for Shop "${shop.name}"]: ${aiResponse.replyTextMm}`);

        // 5. Outbound Dispatch: Send message back to TikTok Direct Message
        const accessToken = channel?.accessToken || process.env.TIKTOK_ACCESS_TOKEN;
        if (accessToken) {
          const result = await sendTikTokMessage(conversationId, aiResponse.replyTextMm, accessToken);
          console.log('[TikTok Outbound Result]:', result);
        } else {
          console.log('[TikTok Outbound Skipped]: No access token configured for TikTok channel.');
        }
      }

      return NextResponse.json({ code: 0, message: 'success' }, { status: 200 });
    }

    return NextResponse.json({ code: 0, message: 'received' }, { status: 200 });
  } catch (error) {
    console.error('TikTok Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
