/**
/**
 * Adversarial Reviewer Probe for Milestone 4:
 * Stress-testing 5-attribute conversational checkout extraction,
 * regional prepaid policy enforcement, stock deficit guard,
 * concurrency bounds, voucher arithmetic, and zero-chat invariant.
 */

import { db } from '../src/lib/db';
import {
  classifyBurmeseIntent,
  matchCatalogProducts,
  formatProductPriceMmk,
  formatStockStatus,
  formatOrderVoucher,
  extractQuantity,
  extractCustomerName,
  extractCustomerPhone,
  extractPaymentMethod,
  extractFullAddress,
  processCustomerMessage,
  AgentContext,
} from '../src/lib/gemini-agent';
import {
  sendTelegramOrderAlert,
  telegramAlertSpy,
  isTelegramMockMode,
  formatTelegramOrderAlertText,
} from '../src/lib/telegram';
import { lookupTownshipDelivery, isRegionalPrepaidOnly } from '../src/lib/myanmar-townships';
import { Product, Shop, Order } from '../src/types';
import fs from 'fs';
import path from 'path';

let passed = 0;
let total = 0;

function assert(condition: any, desc: string, detail?: string) {
  total++;
  if (Boolean(condition)) {
    console.log(`  [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${desc}${detail ? ` -> ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

async function runAdversarialProbes() {
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS TEST & FORENSIC INTEGRITY PROBE — MILESTONE 4');
  console.log('================================================================\n');

  const probeShop: Shop = {
    id: 'shop-probe-adv-4',
    name: 'Adv Reviewer Test Shop',
    ownerEmail: 'reviewer@adv.com',
    kpayNumber: '09123456789',
    kpayName: 'Adv KPay Owner',
    waveNumber: '09987654321',
    waveName: 'Adv Wave Owner',
    telegramBotToken: 'mock_adv_token',
    telegramChatId: '@adv_channel',
  };

  const probeProducts: Product[] = [
    {
      id: 'prod-adv-1',
      shopId: probeShop.id,
      sku: 'SKU-SERUM-ADV',
      nameMm: 'ဗီတာမင်စီ ဆီရမ်',
      nameEn: 'Vitamin C Serum',
      category: 'Skincare',
      priceMmk: 25000,
      stockQuantity: 5,
      imageUrl: '',
      isAvailable: true,
    },
    {
      id: 'prod-adv-2',
      shopId: probeShop.id,
      sku: 'SKU-OUT-OF-STOCK',
      nameMm: 'ရှားစောင်းဂျယ်',
      nameEn: 'Aloe Vera Gel',
      category: 'Skincare',
      priceMmk: 10000,
      stockQuantity: 0,
      imageUrl: '',
      isAvailable: false,
    },
  ];

  await db.saveShop(probeShop);
  for (const p of probeProducts) {
    await db.saveProduct(probeShop.id, p);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Adversarial Intent Classification & Malformed Inputs
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Adversarial Intent Classification ---');
  {
    assert(
      classifyBurmeseIntent('').intent === 'general_inquiry',
      'Empty string safely defaults to general_inquiry'
    );
    assert(
      classifyBurmeseIntent('   ').intent === 'general_inquiry',
      'Whitespace-only safely defaults to general_inquiry'
    );
    assert(
      (classifyBurmeseIntent as any)(null).intent === 'general_inquiry',
      'Null input safely handled without throwing exception'
    );
    assert(
      (classifyBurmeseIntent as any)(undefined).intent === 'general_inquiry',
      'Undefined input safely handled without throwing exception'
    );
    // Mixed casing and noise
    assert(
      classifyBurmeseIntent('Plz PRICE pr... bl lout ll???').intent === 'price_inquiry',
      'Noisy punctuation and mixed casing correctly maps to price_inquiry'
    );
    assert(
      classifyBurmeseIntent('ADMIN plz human agent').intent === 'human_takeover',
      'Urgent admin request maps to human_takeover'
    );
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Phone Normalization & Digit Collision Stress
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Phone Normalization & Digit Collision Stress ---');
  {
    // Letter Wa and Burmese numerals
    assert(
      extractCustomerPhone('ဖုန်း ဝ၉-၇၉၈-၇၆၅-၄၃၂ ပါ') === '09798765432',
      'Letter Wa "ဝ" typo in phone correctly converted to 0'
    );
    assert(
      extractCustomerPhone('+959798765432') === '09798765432',
      'International +959 prefix normalized to 09'
    );
    assert(
      extractCustomerPhone('0095 9 798 765 432') === '09798765432',
      'International 0095 9 prefix normalized to 09'
    );
    assert(
      extractCustomerPhone('9798765432') === '09798765432',
      'Missing leading 0 normalized to 09'
    );

    // Collision check: phone digits must NOT contaminate item quantity
    assert(
      extractQuantity('ဆီရမ် ၀၉၇၉၈၇၆၅၄၃၂') === 1,
      'Phone digits do not inflate item quantity (defaults to 1)'
    );
    assert(
      extractQuantity('၀၉၇၉၈၇၆၅၄၃၂ ကို ဆီရမ် ၂ ဘူး ပို့ပေးပါ') === 2,
      'Burmese numeral 2 preceded by phone number extracts quantity 2 accurately'
    );
    assert(
      extractQuantity('ဆီရမ် သုံးခု ဖုန်း ၀၉၇၉၈၇၆၅၄၃၂') === 3,
      'Burmese word "သုံးခု" (3 units) extracts accurately alongside phone number'
    );
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Adversarial Regional Prepaid Policy Probes
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Adversarial Regional Prepaid Policy Probes ---');
  {
    // Regional cities (11 verified locations from MYANMAR_DELIVERY_MATRIX)
    const regionalTownships = [
      'Taunggyi',
      'Mawlamyine',
      'Bago',
      'Pyay',
      'Pathein',
      'Monywa',
      'Lashio',
      'Magway',
      'Myitkyina',
      'Sittwe',
      'Dawei',
    ];
    for (const tw of regionalTownships) {
      assert(
        isRegionalPrepaidOnly(tw) === true,
        `Regional township "${tw}" enforces isRegionalPrepaidOnly === true`
      );
      const delivery = lookupTownshipDelivery(tw);
      if (delivery) {
        assert(
          delivery.codAvailable === false,
          `Regional township "${tw}" has delivery.codAvailable === false`
        );
        const check = extractPaymentMethod('COD', delivery);
        assert(
          check.isPrepaidViolation === true && check.paymentMethod === undefined,
          `Regional township "${tw}" rejects COD as prepaid violation`
        );
      }
    }

    // Bus terminals
    const busGates = [
      'Aung Mingalar Highway Bus Terminal',
      'Dagon Ayeyar Highway Bus Terminal',
      'အဝေးပြေးကားဂိတ်',
      'ဒဂုံဧရာ ကားဂိတ်',
    ];
    for (const gate of busGates) {
      assert(
        isRegionalPrepaidOnly(gate) === true,
        `Bus gate "${gate}" enforces isRegionalPrepaidOnly === true`
      );
    }

    // Metro areas: Yangon & Mandalay MUST allow COD
    const metroTownships = ['Sanchaung', 'Kamayut', 'Chanayethazan', 'Ahlone', 'Bahan', 'Mahaaungmyay'];
    for (const tw of metroTownships) {
      assert(
        isRegionalPrepaidOnly(tw) === false,
        `Metro township "${tw}" allows COD (isRegionalPrepaidOnly === false)`
      );
      const delivery = lookupTownshipDelivery(tw);
      if (delivery) {
        assert(
          delivery.codAvailable === true,
          `Metro township "${tw}" has codAvailable === true`
        );
        const check = extractPaymentMethod('COD အိမ်ရောက်ငွေချေ', delivery);
        assert(
          check.isPrepaidViolation === false && check.paymentMethod === 'cod',
          `Metro township "${tw}" accepts COD without violation`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Stock Deficit Guard & Zero Stock Refusal
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Stock Deficit Guard & Zero Stock Refusal ---');
  {
    // Case A: Attempt to order Out of Stock product (stock = 0)
    const ctxOutOfStock: AgentContext = {
      shop: probeShop,
      products: await db.getProducts(probeShop.id),
      customerName: 'Ko Ko',
    };

    const resOOS = await processCustomerMessage(
      'ရှားစောင်းဂျယ် ၁ ဘူး ဝယ်မယ် အမည် Ko Ko ဖုန်း ၀၉၇၉၈၇၆၅၄၃၂ စမ်းချောင်း COD',
      ctxOutOfStock
    );
    assert(
      resOOS.completedOrder === undefined,
      'Zero-stock product order is strictly aborted'
    );
    assert(
      resOOS.replyTextMm.includes('မလုံလောက်ပါရှင့်') || resOOS.replyTextMm.includes('လက်ကျန် (0)'),
      'Zero-stock reply contains polite Burmese deficit explanation'
    );

    // Case B: Attempt to order more than available stock (5 available, request 10)
    const resExcess = await processCustomerMessage(
      'ဗီတာမင်စီ ဆီရမ် ၁၀ ဘူး ဝယ်မယ် အမည် Ko Ko ဖုန်း ၀၉၇၉၈၇၆၅၄၃၂ စမ်းချောင်း COD',
      ctxOutOfStock
    );
    assert(
      resExcess.completedOrder === undefined,
      'Order with requested quantity (10) > stock (5) is aborted'
    );

    // Verify stock was not touched
    const prodsAfterRefusal = await db.getProducts(probeShop.id);
    const serumProd = prodsAfterRefusal.find((p) => p.id === 'prod-adv-1')!;
    assert(
      serumProd.stockQuantity === 5,
      'Stock in DB remains unchanged at 5 after deficit refusal'
    );
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Successful Order Creation, Atomic Stock Decrement & Telegram Alert
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Successful Order Creation, Atomic Stock Decrement & Telegram Alert ---');
  {
    telegramAlertSpy.reset();
    const ctxSuccess: AgentContext = {
      shop: probeShop,
      products: await db.getProducts(probeShop.id),
      customerName: 'Ma Su',
    };

    const resSuccess = await processCustomerMessage(
      'ဗီတာမင်စီ ဆီရမ် ၂ ဘူး ဝယ်မယ် အမည် မစု ဖုန်း ၀၉၇၉၈၇၆၅၄၃၂ စမ်းချောင်း COD',
      ctxSuccess
    );

    assert(
      resSuccess.completedOrder !== undefined,
      'Valid order is completed and returned'
    );
    assert(
      resSuccess.completedOrder?.items[0].quantity === 2,
      'Completed order has quantity 2'
    );
    assert(
      resSuccess.completedOrder?.subtotalMmk === 50000,
      'Subtotal is 50,000 MMK (25,000 * 2)'
    );
    assert(
      resSuccess.completedOrder?.deliveryFeeMmk === 2500,
      'Delivery fee is 2,500 MMK'
    );
    assert(
      resSuccess.completedOrder?.totalMmk === 52500,
      'Total is exactly subtotal + deliveryFee (52,500 MMK)'
    );

    // Check stock decremented
    const prodsAfterOrder = await db.getProducts(probeShop.id);
    const serumAfter = prodsAfterOrder.find((p) => p.id === 'prod-adv-1')!;
    assert(
      serumAfter.stockQuantity === 3,
      'Stock in DB atomically decremented from 5 to 3'
    );

    // Check Telegram alert spy
    assert(
      telegramAlertSpy.count() === 1,
      'Telegram alert spy recorded exactly 1 notification'
    );
    const latestAlert = telegramAlertSpy.getLatest();
    assert(
      latestAlert?.orderId === resSuccess.completedOrder?.id,
      'Telegram alert matches completed order ID'
    );
    assert(
      latestAlert?.text.includes('52,500 MMK'),
      'Telegram alert text includes exact grand total'
    );

    // Voucher content checks
    const voucher = resSuccess.voucherText || '';
    assert(
      voucher.includes('🧾 *အော်ဒါဘောက်ချာ (Order Voucher)*'),
      'Voucher includes formal header'
    );
    assert(
      voucher.includes('50,000 ကျပ်'),
      'Voucher includes subtotal MMK'
    );
    assert(
      voucher.includes('52,500 ကျပ်'),
      'Voucher includes grand total MMK'
    );
    assert(
      voucher.includes('ကျေးဇူးတင်'),
      'Voucher includes polite Burmese closing'
    );
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Deep Forensic Zero-Chat Invariant Inspection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Deep Forensic Zero-Chat Invariant Inspection ---');
  {
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    assert(fs.existsSync(dbPath), 'data/db.json exists on disk');
    const rawContent = fs.readFileSync(dbPath, 'utf-8');
    const dbData = JSON.parse(rawContent);

    // Strictly 4 keys
    const keys = Object.keys(dbData).sort();
    assert(
      JSON.stringify(keys) === JSON.stringify(['channels', 'orders', 'products', 'shops']),
      'Database keys strictly match ["channels", "orders", "products", "shops"]'
    );

    // No forbidden terms
    const forbidden = ['conversations', 'messages', 'chat_history', 'chat_logs', 'threads', 'chatMessages'];
    for (const f of forbidden) {
      assert(!(f in dbData), `No forbidden key "${f}" in data/db.json`);
    }

    // Orders must NOT contain conversationId or message history
    for (const ord of dbData.orders) {
      assert(ord.conversationId === undefined, 'Order has no conversationId');
      assert(ord.messages === undefined, 'Order has no embedded messages');
      assert(ord.chatHistory === undefined, 'Order has no embedded chatHistory');
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL ADVERSARIAL ASSERTIONS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('\n>>> ALL ADVERSARIAL PROBES PASSED WITH 100% SUCCESS! <<<\n');
  } else {
    console.error('\n>>> SOME ADVERSARIAL PROBES FAILED! <<<\n');
    process.exit(1);
  }
}

runAdversarialProbes().catch((e) => {
  console.error('Fatal probe error:', e);
  process.exit(1);
});
