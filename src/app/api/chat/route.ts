import { NextRequest, NextResponse } from 'next/server';
import { processCustomerMessage } from '@/lib/gemini-agent';
import { INITIAL_PRODUCTS, INITIAL_SHOP } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { message, customerName, history } = await req.json();

    const response = await processCustomerMessage(message, {
      shop: INITIAL_SHOP,
      products: INITIAL_PRODUCTS,
      customerName: customerName || 'Customer',
      conversationHistory: history || [],
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
