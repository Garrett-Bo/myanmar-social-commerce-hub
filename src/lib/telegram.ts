import { Order, Shop } from '@/types';

/**
 * Telegram Notification Dispatcher
 * Sends free, instant real-time alerts to the Myanmar seller's Telegram Bot / Channel.
 */

export async function sendTelegramOrderNotification(order: Order, shop: Shop): Promise<boolean> {
  if (!shop.telegramBotToken || !shop.telegramChatId) {
    console.log('[Telegram Alert Mock]: No Telegram token configured. Alert payload:', order);
    return false;
  }

  const itemsList = order.items
    .map((item, idx) => `  ${idx + 1}. ${item.name} x ${item.quantity} = ${(item.priceMmk * item.quantity).toLocaleString()} MMK`)
    .join('\n');

  const text = `🚨 *အော်ဒါအသစ် ရောက်ရှိပါသည်!* (New Order Alert)
━━━━━━━━━━━━━━━━━━━━
🛒 *ဆိုင်ခွဲ:* ${shop.name}
👤 *ဝယ်သူအမည်:* ${order.customerName}
📞 *ဖုန်းနံပါတ်:* ${order.customerPhone}
📍 *မြို့နယ်/လိပ်စာ:* ${order.township} (${order.fullAddress})
💳 *ငွေချေစနစ်:* ${order.paymentMethod.toUpperCase()}

📦 *မှာယူထားသော ပစ္စည်းများ:*
${itemsList}

💰 *ပစ္စည်းကျသင့်ငွေ:* ${order.subtotalMmk.toLocaleString()} MMK
🚚 *ပို့ဆောင်ခ:* ${order.deliveryFeeMmk.toLocaleString()} MMK
💵 *စုစုပေါင်း ကျသင့်ငွေ:* *${order.totalMmk.toLocaleString()} MMK*
━━━━━━━━━━━━━━━━━━━━
👉 _ကျေးဇူးပြု၍ Web Inbox တွင် KPay ပြေစာနှင့် အော်ဒါအား စစ်ဆေးပေးပါရှင့်_`;

  try {
    const url = `https://api.telegram.org/bot${shop.telegramBotToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: shop.telegramChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to send Telegram notification:', err);
    return false;
  }
}
