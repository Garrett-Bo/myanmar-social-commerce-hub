import { Order, Shop, Product } from '@/types';

/**
 * Telegram Notification Dispatcher
 * Sends free, instant real-time alerts to the Myanmar seller's Telegram Bot / Channel.
 */

export interface TelegramSendResult {
  success: boolean;
  mocked?: boolean;
  messageId?: string;
  error?: string;
}

export interface TelegramAlertLog {
  timestamp: string;
  shopId: string;
  shopName: string;
  orderId: string;
  chatId: string;
  text: string;
  order: Order;
  mocked: boolean;
}

// In-memory test spy tracker (Zero disk / zero DB persistence)
export const _mockTelegramAlerts: TelegramAlertLog[] = [];

export const telegramAlertSpy = {
  get logs(): TelegramAlertLog[] {
    return _mockTelegramAlerts;
  },
  record(log: TelegramAlertLog): void {
    _mockTelegramAlerts.push(log);
  },
  getLatest(): TelegramAlertLog | undefined {
    return _mockTelegramAlerts[_mockTelegramAlerts.length - 1];
  },
  getByOrderId(orderId: string): TelegramAlertLog | undefined {
    return _mockTelegramAlerts.find((l) => l.orderId === orderId);
  },
  count(): number {
    return _mockTelegramAlerts.length;
  },
  reset(): void {
    _mockTelegramAlerts.length = 0;
  },
};

export function isTelegramMockMode(token?: string): boolean {
  if (process.env.MOCK_TELEGRAM === 'true' || process.env.MOCK_CHANNELS === 'true') return true;
  if (!token) return true;
  const lower = token.toLowerCase();
  if (lower.includes('mock') || lower.startsWith('test_') || lower === 'mock-token') return true;
  if (process.env.NODE_ENV === 'test' && !process.env.TELEGRAM_LIVE_CREDENTIALS) return true;
  return false;
}

export function formatTelegramOrderAlertText(shop: Shop, order: Order): string {
  const itemsList = order.items
    .map(
      (item, idx) =>
        `  ${idx + 1}. *${item.name}* x ${item.quantity} = ${(item.priceMmk * item.quantity).toLocaleString()} MMK`
    )
    .join('\n');

  return `🚨 *အော်ဒါအသစ် ရောက်ရှိပါသည်!* (New Order Alert)
━━━━━━━━━━━━━━━━━━━━
🛒 *ဆိုင်ခွဲ:* ${shop.name}
🆔 *Order ID:* \`${order.id}\`
👤 *ဝယ်သူအမည်:* ${order.customerName}
📞 *ဖုန်းနံပါတ်:* ${order.customerPhone}
📍 *ပို့ဆောင်မည့် မြို့နယ်/လိပ်စာ:* ${order.township} (${order.fullAddress})
💳 *ငွေချေစနစ်:* ${order.paymentMethod.toUpperCase()}

📦 *မှာယူထားသော ပစ္စည်းများ:*
${itemsList}

💰 *ပစ္စည်းကျသင့်ငွေ:* ${order.subtotalMmk.toLocaleString()} MMK
🚚 *ပို့ဆောင်ခ:* ${order.deliveryFeeMmk.toLocaleString()} MMK
💵 *စုစုပေါင်း ကျသင့်ငွေ:* *${order.totalMmk.toLocaleString()} MMK*
━━━━━━━━━━━━━━━━━━━━
👉 _ကျေးဇူးပြု၍ Web Inbox တွင် KPay ပြေစာနှင့် အော်ဒါအား စစ်ဆေးပေးပါရှင့်_`;
}

export async function sendTelegramOrderAlert(
  shop: Shop,
  order: Order,
  products?: Product[]
): Promise<TelegramSendResult> {
  const text = formatTelegramOrderAlertText(shop, order);
  const chatId = shop.telegramChatId || '@mock_chat';
  const token = shop.telegramBotToken;

  if (isTelegramMockMode(token) || !token || !shop.telegramChatId) {
    const log: TelegramAlertLog = {
      timestamp: new Date().toISOString(),
      shopId: shop.id,
      shopName: shop.name,
      orderId: order.id,
      chatId,
      text,
      order,
      mocked: true,
    };
    telegramAlertSpy.record(log);
    return { success: true, mocked: true, messageId: `tg_mock_${Date.now()}` };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: shop.telegramChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Telegram API error: ${response.statusText}` };
    }

    telegramAlertSpy.record({
      timestamp: new Date().toISOString(),
      shopId: shop.id,
      shopName: shop.name,
      orderId: order.id,
      chatId: shop.telegramChatId,
      text,
      order,
      mocked: false,
    });

    return { success: true, mocked: false, messageId: `tg_${Date.now()}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

// Backward-compatible wrapper
export async function sendTelegramOrderNotification(order: Order, shop: Shop): Promise<boolean> {
  const result = await sendTelegramOrderAlert(shop, order);
  return result.success;
}
