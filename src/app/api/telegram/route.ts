import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramOrderNotification } from '@/lib/telegram';
import { INITIAL_SHOP } from '@/lib/store';
import { Order } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { order, shop } = (await req.json()) as { order: Order; shop?: any };

    const success = await sendTelegramOrderNotification(order, shop || INITIAL_SHOP);
    return NextResponse.json({ success });
  } catch (err) {
    console.error('Telegram API Error:', err);
    return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 });
  }
}
