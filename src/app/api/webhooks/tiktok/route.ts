import { NextRequest, NextResponse } from 'next/server';
import { normalizeBurmese } from '@/lib/burmese-converter';
import { processCustomerMessage } from '@/lib/gemini-agent';
import { INITIAL_PRODUCTS, INITIAL_SHOP } from '@/lib/store';

// TikTok Shop / Direct Message Webhook Receiver (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // TikTok event payload handling
    if (body.event === 'im.message.receive' || body.type === 'message') {
      const senderId = body.data?.sender_id || body.sender_id || 'tt_user_unknown';
      const rawText = body.data?.content?.text || body.content?.text || body.text || '';

      if (rawText) {
        // 1. Normalize Burmese text
        const normalized = normalizeBurmese(rawText);
        console.log(`[TikTok Inbound from ${senderId}]: ${normalized}`);

        // 2. Process with AI Agent
        const aiResponse = await processCustomerMessage(normalized, {
          shop: INITIAL_SHOP,
          products: INITIAL_PRODUCTS,
          customerName: `TikTok User (${senderId.slice(-4)})`,
          conversationHistory: [{ role: 'user', content: normalized }],
        });

        console.log(`[AI Response to TikTok]: ${aiResponse.replyTextMm}`);

        // In production: send reply via TikTok Open API
      }

      return NextResponse.json({ code: 0, message: 'success' }, { status: 200 });
    }

    return NextResponse.json({ code: 0, message: 'received' }, { status: 200 });
  } catch (error) {
    console.error('TikTok Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
