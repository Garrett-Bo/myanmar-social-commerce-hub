/**
 * Milestone 4 Automated Verification Suite: Burmese AI Sales Closing Engine,
 * 5-Attribute Conversational Checkout, Real-Time Stock Check & Decrement,
 * Telegram Seller Alerts, and Zero-Chat Storage Invariant.
 *
 * 7 Verification Suites:
 *  Suite 1: Burmese & Burglish Intent Classification (17 assertions)
 *  Suite 2: Real-time Product Search & MMK Price Formatting (11 assertions)
 *  Suite 3: 5-Attribute Conversational Checkout Extraction (15 assertions)
 *  Suite 4: Township Delivery Calculation & Prepaid Policy Enforcement (11 assertions)
 *  Suite 5: Order Voucher Generation (ဘောက်ချာ format & arithmetic) (11 assertions)
 *  Suite 6: Order Finalization, Atomic Stock Decrement & Negative Stock Guard (14 assertions)
 *  Suite 7: Telegram Notification Alert & Zero-Chat DB Invariant Verification (13 assertions)
 */

import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';
import {
  classifyBurmeseIntent,
  matchCatalogProducts,
  formatProductPriceMmk,
  formatStockStatus,
  formatOrderVoucher,
  formatMissingAttributesPrompt,
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
  sendTelegramOrderNotification,
  isTelegramMockMode,
  telegramAlertSpy,
  formatTelegramOrderAlertText,
} from '../src/lib/telegram';
import { lookupTownshipDelivery, isRegionalPrepaidOnly } from '../src/lib/myanmar-townships';
import { Product, Shop, Order } from '../src/types';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

export async function runM4Tests() {
  console.log('================================================================');
  console.log('MILESTONE 4: BURMESE AI SALES CLOSING & CHECKOUT VERIFICATION');
  console.log('================================================================\n');

  // Shared mock shop
  const testShop: Shop = {
    id: 'shop-m4-test',
    name: 'Shwe Mandalar Silk & Cosmetics',
    ownerEmail: 'shwemandalar@test.com',
    kpayNumber: '09798765432',
    kpayName: 'Daw Shwe Yee',
    waveNumber: '09798765432',
    waveName: 'Daw Shwe Yee',
    telegramBotToken: 'mock_bot_token_123',
    telegramChatId: '@shwe_mandalar_orders',
  };

  // Shared mock products
  const testProducts: Product[] = [
    {
      id: 'prod-m4-1',
      shopId: testShop.id,
      sku: 'SKU-SERUM',
      nameMm: 'ဗီတာမင်စီ ဆီရမ်',
      nameEn: 'Vitamin C Serum',
      category: 'Skincare',
      priceMmk: 28000,
      stockQuantity: 20,
      imageUrl: 'https://example.com/serum.jpg',
      isAvailable: true,
    },
    {
      id: 'prod-m4-2',
      shopId: testShop.id,
      sku: 'SKU-LIPTINT',
      nameMm: 'နှုတ်ခမ်းနီ',
      nameEn: 'Lip Tint Velvet',
      category: 'Cosmetics',
      priceMmk: 12000,
      stockQuantity: 0,
      imageUrl: 'https://example.com/liptint.jpg',
      isAvailable: false,
    },
    {
      id: 'prod-m4-3',
      shopId: testShop.id,
      sku: 'MDY-SILK-01',
      nameMm: 'မန္တလေး ချည်ပိုးထည်',
      nameEn: 'Mandalay Silk Paso',
      category: 'Fashion',
      priceMmk: 45000,
      stockQuantity: 10,
      imageUrl: 'https://example.com/silk.jpg',
      isAvailable: true,
    },
    {
      id: 'prod-m4-4',
      shopId: testShop.id,
      sku: 'SKU-SUNSCREEN',
      nameMm: 'နေကာခရင်မ်',
      nameEn: 'Sunscreen SPF 50',
      category: 'Skincare',
      priceMmk: 18000,
      stockQuantity: 8,
      imageUrl: 'https://example.com/sunscreen.jpg',
      isAvailable: true,
    },
  ];

  // Seed shop & products into db for persistent testing
  await db.saveShop(testShop);
  for (const p of testProducts) {
    await db.saveProduct(testShop.id, p);
  }

  // --------------------------------------------------------------------------
  // SUITE 1: Burmese & Burglish Intent Classification
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: Burmese & Burglish Intent Classification ---');
  {
    assert(
      classifyBurmeseIntent('မင်္ဂလာပါ').intent === 'greeting',
      'Greeting intent matches "မင်္ဂလာပါ"'
    );
    assert(
      classifyBurmeseIntent('mingalarpar').intent === 'greeting',
      'Greeting intent matches Burglish "mingalarpar"'
    );
    assert(
      classifyBurmeseIntent('ဟဲလို').intent === 'greeting',
      'Greeting intent matches "ဟဲလို"'
    );
    assert(
      classifyBurmeseIntent('ဆီရမ် ဈေးဘယ်လောက်လဲ').intent === 'price_inquiry',
      'Price inquiry matches "ဆီရမ် ဈေးဘယ်လောက်လဲ"'
    );
    assert(
      classifyBurmeseIntent('ေစ်းဘယ္ေလာက္လဲ').intent === 'price_inquiry',
      'Price inquiry matches Zawgyi "ေစ်းဘယ္ေလာက္လဲ"'
    );
    assert(
      classifyBurmeseIntent('price plx').intent === 'price_inquiry',
      'Price inquiry matches Burglish "price plx"'
    );
    assert(
      classifyBurmeseIntent('ပစ္စည်းရှိလား').intent === 'stock_inquiry',
      'Stock inquiry matches "ပစ္စည်းရှိလား"'
    );
    assert(
      classifyBurmeseIntent('instock shi lr').intent === 'stock_inquiry',
      'Stock inquiry matches Burglish "instock shi lr"'
    );
    assert(
      classifyBurmeseIntent('စမ်းချောင်း ပို့ခ ဘယ်လောက်လဲ').intent === 'delivery_inquiry',
      'Delivery inquiry matches "စမ်းချောင်း ပို့ခ ဘယ်လောက်လဲ"'
    );
    assert(
      classifyBurmeseIntent('dali charge bl lout ll').intent === 'delivery_inquiry',
      'Delivery inquiry matches Burglish "dali charge bl lout ll"'
    );
    assert(
      classifyBurmeseIntent('kpay ရလား').intent === 'payment_inquiry',
      'Payment inquiry matches "kpay ရလား"'
    );
    assert(
      classifyBurmeseIntent('kpay ya lr').intent === 'payment_inquiry',
      'Payment inquiry matches Burglish "kpay ya lr"'
    );
    assert(
      classifyBurmeseIntent('ဝယ်မယ်').intent === 'order_intent',
      'Order intent matches "ဝယ်မယ်"'
    );
    assert(
      classifyBurmeseIntent('order tin ml').intent === 'order_intent',
      'Order intent matches Burglish "order tin ml"'
    );
    assert(
      classifyBurmeseIntent('လူနဲ့ပြောချင်တယ်').intent === 'human_takeover',
      'Human takeover intent matches "လူနဲ့ပြောချင်တယ်"'
    );
    assert(
      classifyBurmeseIntent('စလစ်ပို့ထားပါတယ်').intent === 'slip_inquiry',
      'Slip inquiry matches "စလစ်ပို့ထားပါတယ်"'
    );
    assert(
      classifyBurmeseIntent('လျှော့ပေးလား').intent === 'discount_inquiry',
      'Discount inquiry matches "လျှော့ပေးလား"'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 2: Real-time Product Search & MMK Price Formatting
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Real-time Product Search & MMK Price Formatting ---');
  {
    const serumMatches = matchCatalogProducts('serum', testProducts);
    assert(
      serumMatches.some((p) => p.sku === 'SKU-SERUM'),
      'Product search matches English "serum"'
    );

    const lipMatches = matchCatalogProducts('နှုတ်ခမ်းနီ', testProducts);
    assert(
      lipMatches.some((p) => p.sku === 'SKU-LIPTINT'),
      'Product search matches Burmese "နှုတ်ခမ်းနီ"'
    );

    const skuMatches = matchCatalogProducts('MDY-SILK-01', testProducts);
    assert(
      skuMatches.length === 1 && skuMatches[0].sku === 'MDY-SILK-01',
      'Product search matches exact SKU "MDY-SILK-01"'
    );

    const silkNameMatches = matchCatalogProducts('မန္တလေး ချည်ပိုးထည်', testProducts);
    assert(
      silkNameMatches.some((p) => p.sku === 'MDY-SILK-01'),
      'Product search matches Burmese "မန္တလေး ချည်ပိုးထည်"'
    );

    const sunscreenMatches = matchCatalogProducts('sunscreen', testProducts);
    assert(
      sunscreenMatches.some((p) => p.sku === 'SKU-SUNSCREEN'),
      'Product search matches English "sunscreen"'
    );

    const mmSunscreenMatches = matchCatalogProducts('နေကာခရင်မ်', testProducts);
    assert(
      mmSunscreenMatches.some((p) => p.sku === 'SKU-SUNSCREEN'),
      'Product search matches Burmese "နေကာခရင်မ်"'
    );

    const pasoBurglishMatches = matchCatalogProducts('paso', testProducts);
    assert(
      pasoBurglishMatches.some((p) => p.sku === 'MDY-SILK-01'),
      'Product search matches Burglish transliteration "paso"'
    );

    const unknownMatches = matchCatalogProducts('unknown item xyz non-existent', testProducts);
    assert(
      unknownMatches.length === 0,
      'Product search returns empty array for non-existent item'
    );

    assert(
      formatProductPriceMmk(28000) === '28,000 MMK',
      'Price formatter formats 28,000 MMK'
    );
    assert(
      formatProductPriceMmk(45000) === '45,000 MMK',
      'Price formatter formats 45,000 MMK'
    );
    assert(
      formatStockStatus(15).includes('In-stock') && formatStockStatus(0).includes('Out of stock'),
      'Stock status formatter distinguishes in-stock from out-of-stock'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 3: 5-Attribute Conversational Checkout Extraction
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: 5-Attribute Conversational Checkout Extraction ---');
  {
    assert(
      extractQuantity('ဆီရမ် ၁ ဘူး ဝယ်မယ်') === 1,
      'Extracts quantity 1 from Burmese numeral "၁ ဘူး"'
    );
    assert(
      extractQuantity('ဆီရမ် ၂ ဘူး ယူမယ်') === 2,
      'Extracts quantity 2 from Burmese numeral "၂ ဘူး"'
    );
    assert(
      extractQuantity('ဆီရမ် 3 pcs') === 3,
      'Extracts quantity 3 from English "3 pcs"'
    );
    assert(
      extractQuantity('ဆီရမ် သုံးခု') === 3,
      'Extracts quantity 3 from Burmese word "သုံးခု"'
    );
    assert(
      extractQuantity('ဆီရမ် ၁၀ ထည်') === 10,
      'Extracts quantity 10 from Burmese word/numeral "၁၀ ထည်"'
    );
    assert(
      extractQuantity('ဆီရမ် ဝယ်မယ် ဖုန်း ၀၉၇၉၈၇၆၅၄၃၂') === 1,
      'Defaults quantity to 1 without collision from phone number digits'
    );

    assert(
      extractCustomerName('အမည် - မောင်မောင် ပါ') === 'မောင်မောင်',
      'Extracts customer name from "အမည် - မောင်မောင်"'
    );
    assert(
      extractCustomerName('လက်ခံသူ Daw Mya') === 'Daw Mya',
      'Extracts customer name from "လက်ခံသူ Daw Mya"'
    );
    assert(
      extractCustomerName('Name: John Smith') === 'John Smith',
      'Extracts customer name from "Name: John Smith"'
    );
    assert(
      extractCustomerName('ဖုန်း ၀၉၇၉၈၇၆၅၄၃၂', 'Fallback Name') === 'Fallback Name',
      'Falls back to default customer name when not in text'
    );

    assert(
      extractCustomerPhone('ဖုန်း ၀၉-၇၉၈-၇၆၅-၄၃၂ ပါ') === '09798765432',
      'Extracts and normalizes phone with Burmese numerals and hyphens'
    );
    assert(
      extractCustomerPhone('+95 9 798 765 432') === '09798765432',
      'Extracts and normalizes international format "+95 9 ..."'
    );
    assert(
      extractCustomerPhone('hello world without phone') === undefined,
      'Returns undefined when no phone is present'
    );

    assert(
      extractPaymentMethod('kpay နဲ့ ရှင်းပါမယ်', null).paymentMethod === 'kpay',
      'Extracts KPay payment method'
    );
    assert(
      extractPaymentMethod('WavePay ဖြင့် ပေးချေပါမည်', null).paymentMethod === 'wavepay',
      'Extracts WavePay payment method'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Township Delivery Calculation & Prepaid Policy Enforcement
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Township Delivery Calculation & Prepaid Policy Enforcement ---');
  {
    const sanchaungDelivery = lookupTownshipDelivery('စမ်းချောင်း');
    assert(
      sanchaungDelivery !== null && sanchaungDelivery.standardFeeMmk === 2500 && sanchaungDelivery.codAvailable === true,
      'Sanchaung delivery fee is 2,500 MMK and COD is available'
    );

    const kamayutDelivery = lookupTownshipDelivery('ကမာရွတ်');
    assert(
      kamayutDelivery !== null && kamayutDelivery.standardFeeMmk === 2500 && kamayutDelivery.codAvailable === true,
      'Kamayut delivery fee is 2,500 MMK and COD is available'
    );

    const mdyDelivery = lookupTownshipDelivery('ချမ်းအေးသာစံ');
    assert(
      mdyDelivery !== null && mdyDelivery.standardFeeMmk === 3000 && mdyDelivery.codAvailable === true,
      'Mandalay Chanayethazan delivery fee is 3,000 MMK and COD is available'
    );

    const taunggyiDelivery = lookupTownshipDelivery('တောင်ကြီး');
    assert(
      taunggyiDelivery !== null && taunggyiDelivery.standardFeeMmk === 5000 && isRegionalPrepaidOnly('Taunggyi'),
      'Taunggyi delivery fee is 5,000 MMK and is regional prepaid only'
    );

    const mawlamyineDelivery = lookupTownshipDelivery('မော်လမြိုင်');
    assert(
      mawlamyineDelivery !== null && mawlamyineDelivery.standardFeeMmk === 4500 && isRegionalPrepaidOnly('Mawlamyine'),
      'Mawlamyine delivery fee is 4,500 MMK and is regional prepaid only'
    );

    const aungMingalarDelivery = lookupTownshipDelivery('Aung Mingalar Highway Bus Terminal');
    assert(
      aungMingalarDelivery !== null && aungMingalarDelivery.standardFeeMmk === 3500 && isRegionalPrepaidOnly('Aung Mingalar Highway Bus Terminal'),
      'Aung Mingalar Bus Gate fee is 3,500 MMK and is regional prepaid only'
    );

    const dagonAyeyarDelivery = lookupTownshipDelivery('ဒဂုံဧရာ ကားဂိတ်');
    assert(
      dagonAyeyarDelivery !== null && dagonAyeyarDelivery.standardFeeMmk === 3500 && isRegionalPrepaidOnly('ဒဂုံဧရာ ကားဂိတ်'),
      'Dagon Ayeyar Bus Gate fee is 3,500 MMK and is regional prepaid only'
    );

    // Enforcement: COD rejected for Taunggyi
    const codTaunggyiCheck = extractPaymentMethod('COD နဲ့ ရှင်းမယ်', taunggyiDelivery);
    assert(
      codTaunggyiCheck.isPrepaidViolation === true && codTaunggyiCheck.paymentMethod === undefined,
      'Prepaid policy strictly rejects COD for Taunggyi'
    );

    // Enforcement: COD rejected for Aung Mingalar Bus Gate
    const codBusGateCheck = extractPaymentMethod('အိမ်အရောက်ငွေချေ COD', aungMingalarDelivery);
    assert(
      codBusGateCheck.isPrepaidViolation === true && codBusGateCheck.paymentMethod === undefined,
      'Prepaid policy strictly rejects COD for express highway bus gate'
    );

    // Agent conversation check: COD in Taunggyi triggers prepaid explanation
    const ctxRegionalCod: AgentContext = {
      shop: testShop,
      products: testProducts,
      customerName: 'Ko Aung',
    };
    const resRegionalCod = await processCustomerMessage(
      'ဆီရမ် ၁ ဘူး ဝယ်မယ် အမည် ကိုအောင် ဖုန်း ၀၉၇၉၈၇၆၅၄၃၂ တောင်ကြီး COD',
      ctxRegionalCod
    );
    assert(
      resRegionalCod.completedOrder === undefined &&
        (resRegionalCod.replyTextMm.includes('Prepaid Only') || resRegionalCod.replyTextMm.includes('ကြိုလွှဲ')),
      'Agent conversation rejects regional COD and prompts for 100% Prepaid KPay/WavePay'
    );

    // Agent conversation check: KPay in Taunggyi does NOT trigger prepaid violation
    const resRegionalKpay = await processCustomerMessage(
      'ဆီရမ် ၁ ဘူး ဝယ်မယ် အမည် ကိုအောင် ဖုန်း ၀၉၇၉၈၇၆၅၄၃၂ တောင်ကြီး KPay',
      ctxRegionalCod
    );
    assert(
      resRegionalKpay.completedOrder !== undefined && resRegionalKpay.completedOrder.paymentMethod === 'kpay',
      'Agent conversation successfully accepts prepaid KPay for regional delivery'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 5: Order Voucher Generation (ဘောက်ချာ format & arithmetic)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Order Voucher Generation (ဘောက်ချာ format & arithmetic) ---');
  {
    const sampleOrder: Order = {
      id: 'ord-test-voucher-1',
      shopId: testShop.id,
      platform: 'facebook',
      customerPlatformId: 'fb-user-123',
      customerName: 'မနှင်းနု',
      customerPhone: '09798765432',
      township: 'Sanchaung',
      fullAddress: 'အမှတ် ၁၂၊ ဗဟိုလမ်း၊ စမ်းချောင်းမြို့နယ်',
      items: [
        {
          productId: 'prod-m4-1',
          name: 'ဗီတာမင်စီ ဆီရမ်',
          quantity: 2,
          priceMmk: 28000,
        },
      ],
      subtotalMmk: 56000,
      deliveryFeeMmk: 2500,
      totalMmk: 58500,
      paymentMethod: 'cod',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    const deliveryInfo = lookupTownshipDelivery('စမ်းချောင်း');
    const voucherText = formatOrderVoucher(sampleOrder, testShop, deliveryInfo);

    assert(
      voucherText.includes('🧾 *အော်ဒါဘောက်ချာ (Order Voucher)*'),
      'Voucher contains header "🧾 *အော်ဒါဘောက်ချာ (Order Voucher)*"'
    );
    assert(
      voucherText.includes(testShop.name),
      `Voucher contains shop name "${testShop.name}"`
    );
    assert(
      voucherText.includes(sampleOrder.id),
      `Voucher contains Order ID "${sampleOrder.id}"`
    );
    assert(
      voucherText.includes(sampleOrder.customerName),
      `Voucher contains customer name "${sampleOrder.customerName}"`
    );
    assert(
      voucherText.includes(sampleOrder.customerPhone),
      `Voucher contains phone number "${sampleOrder.customerPhone}"`
    );
    assert(
      voucherText.includes(sampleOrder.fullAddress),
      `Voucher contains full address "${sampleOrder.fullAddress}"`
    );
    assert(
      voucherText.includes('ဗီတာမင်စီ ဆီရမ် x 2 = 56,000 ကျပ်'),
      'Voucher contains itemized breakdown with quantity and line item total'
    );
    assert(
      voucherText.includes('56,000 ကျပ်'),
      'Voucher contains subtotal MMK'
    );
    assert(
      voucherText.includes('2,500 ကျပ်'),
      'Voucher contains delivery fee MMK'
    );
    assert(
      sampleOrder.totalMmk === sampleOrder.subtotalMmk + sampleOrder.deliveryFeeMmk &&
        voucherText.includes('58,500 ကျပ်'),
      'Voucher verifies exact arithmetic: total === subtotal + delivery fee (58,500 ကျပ်)'
    );
    assert(
      voucherText.includes('ကျေးဇူးတင်'),
      'Voucher contains polite Burmese closing'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 6: Order Finalization, Atomic Stock Decrement & Negative Stock Guard
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Order Finalization, Atomic Stock Decrement & Negative Stock Guard ---');
  {
    // Record initial stock of prod-m4-1 (Serum, initially 20)
    const initialProducts = await db.getProducts(testShop.id);
    const initialSerum = initialProducts.find((p) => p.id === 'prod-m4-1')!;
    const initialSerumQty = initialSerum.stockQuantity;

    // Test 6.1: Complete 5-attribute checkout for Yangon COD
    const ctxCod: AgentContext = {
      shop: testShop,
      products: await db.getProducts(testShop.id),
      customerName: 'မောင်မောင်',
    };
    const resCod = await processCustomerMessage(
      'ဗီတာမင်စီ ဆီရမ် ၂ ဘူး ဝယ်မယ်။ အမည် မောင်မောင်၊ ဖုန်း ၀၉-၇၉၈-၇၆၅-၄၃၂၊ စမ်းချောင်း ဗဟိုလမ်း၊ COD',
      ctxCod
    );

    assert(resCod.completedOrder !== undefined, 'Successful checkout returns completedOrder');
    assert(
      resCod.completedOrder?.id.startsWith('ord-') === true,
      'Generated Order ID has prefix "ord-"'
    );
    assert(
      resCod.completedOrder?.status === 'confirmed',
      'COD order initial status is "confirmed"'
    );
    assert(
      resCod.completedOrder?.customerPhone === '09798765432',
      'Completed order has normalized phone "09798765432"'
    );
    assert(
      resCod.completedOrder?.township === 'Sanchaung',
      'Completed order township is "Sanchaung"'
    );
    assert(
      resCod.completedOrder?.subtotalMmk === 56000,
      'Completed order subtotal is 56,000 MMK (28,000 * 2)'
    );
    assert(
      resCod.completedOrder?.deliveryFeeMmk === 2500,
      'Completed order delivery fee is 2,500 MMK'
    );
    assert(
      resCod.completedOrder?.totalMmk === 58500,
      'Completed order total is 58,500 MMK'
    );

    // Verify order in database
    const dbOrders = await db.getOrders(testShop.id);
    assert(
      dbOrders.some((o) => o.id === resCod.completedOrder?.id),
      'Order is successfully persisted in database db.orders'
    );

    // Verify atomic stock decrement in DB (initial - 2)
    const afterCodProducts = await db.getProducts(testShop.id);
    const serumAfterCod = afterCodProducts.find((p) => p.id === 'prod-m4-1')!;
    assert(
      serumAfterCod.stockQuantity === initialSerumQty - 2,
      `Atomic stock decrement: stock decreased from ${initialSerumQty} to ${serumAfterCod.stockQuantity}`
    );

    // Test 6.2: Complete 5-attribute checkout for KPay prepaid
    const ctxKpay: AgentContext = {
      shop: testShop,
      products: await db.getProducts(testShop.id),
      customerName: 'မအေး',
    };
    const resKpay = await processCustomerMessage(
      'ဗီတာမင်စီ ဆီရမ် ၁ ဘူး ဝယ်မယ်။ အမည် မအေး၊ ဖုန်း ၀၉-၇၉၈-၇၆၅-၄၃၂၊ စမ်းချောင်း၊ KPay',
      ctxKpay
    );

    assert(
      resKpay.completedOrder !== undefined &&
        resKpay.completedOrder.status === 'pending_slip' &&
        resKpay.completedOrder.paymentMethod === 'kpay',
      'Prepaid KPay order initial status is "pending_slip"'
    );

    // Test 6.3: Pre-decrement inventory guard (insufficient stock)
    // Request 50 units of Serum when remaining stock is <= 18
    const currentProducts = await db.getProducts(testShop.id);
    const currentSerum = currentProducts.find((p) => p.id === 'prod-m4-1')!;
    const ctxDeficit: AgentContext = {
      shop: testShop,
      products: currentProducts,
      customerName: 'ကိုကို',
    };
    const resDeficit = await processCustomerMessage(
      'ဗီတာမင်စီ ဆီရမ် ၅၀ ဘူး ဝယ်မယ်။ အမည် ကိုကို၊ ဖုန်း ၀၉-၇၉၈-၇၆၅-၄၃၂၊ စမ်းချောင်း၊ COD',
      ctxDeficit
    );

    assert(
      resDeficit.completedOrder === undefined,
      'Pre-decrement inventory guard aborts order when requested quantity exceeds available stock'
    );
    assert(
      resDeficit.replyTextMm.includes('မလုံလောက်ပါရှင့်') || resDeficit.replyTextMm.includes('လက်ကျန်'),
      'Inventory guard returns polite Burmese deficit notice mentioning insufficient stock'
    );

    const productsAfterDeficit = await db.getProducts(testShop.id);
    const serumAfterDeficit = productsAfterDeficit.find((p) => p.id === 'prod-m4-1')!;
    assert(
      serumAfterDeficit.stockQuantity === currentSerum.stockQuantity,
      'Stock in DB was NOT decremented when order was aborted due to deficit'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 7: Telegram Notification Alert & Zero-Chat DB Invariant Verification
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Telegram Notification Alert & Zero-Chat DB Invariant Verification ---');
  {
    // Test Telegram mock mode detection
    assert(isTelegramMockMode('mock_token') === true, 'isTelegramMockMode detects "mock_token"');
    assert(isTelegramMockMode(undefined) === true, 'isTelegramMockMode detects undefined token');
    assert(isTelegramMockMode('test_abc') === true, 'isTelegramMockMode detects "test_abc" prefix');

    // Test Telegram alert text formatting
    const alertOrder: Order = {
      id: 'ord-tg-alert-1',
      shopId: testShop.id,
      platform: 'facebook',
      customerPlatformId: 'fb-user-999',
      customerName: 'ကိုမင်းမင်း',
      customerPhone: '09798765432',
      township: 'Sanchaung',
      fullAddress: 'ဗဟိုလမ်း၊ စမ်းချောင်း',
      items: [
        {
          productId: 'prod-m4-1',
          name: 'ဗီတာမင်စီ ဆီရမ်',
          quantity: 1,
          priceMmk: 28000,
        },
      ],
      subtotalMmk: 28000,
      deliveryFeeMmk: 2500,
      totalMmk: 30500,
      paymentMethod: 'kpay',
      status: 'pending_slip',
      createdAt: new Date().toISOString(),
    };

    const alertText = formatTelegramOrderAlertText(testShop, alertOrder);
    assert(alertText.includes(testShop.name), 'Telegram alert text contains shop name');
    assert(alertText.includes(alertOrder.id), 'Telegram alert text contains Order ID');
    assert(alertText.includes(alertOrder.customerPhone), 'Telegram alert text contains customer phone');

    // Test sendTelegramOrderAlert dispatch in mock mode
    telegramAlertSpy.reset();
    const alertResult = await sendTelegramOrderAlert(testShop, alertOrder);
    assert(
      alertResult.success === true && alertResult.mocked === true,
      'sendTelegramOrderAlert executes cleanly in mock mode'
    );

    assert(telegramAlertSpy.logs.length >= 1, 'telegramAlertSpy records dispatched alert in memory');
    const latestSpyLog = telegramAlertSpy.getLatest();
    assert(
      latestSpyLog !== undefined && latestSpyLog.orderId === alertOrder.id,
      'telegramAlertSpy log captures correct Order ID'
    );
    assert(
      latestSpyLog !== undefined && latestSpyLog.shopName === testShop.name,
      'telegramAlertSpy log captures correct shop name'
    );

    // Test backward-compatible wrapper
    const compatResult = await sendTelegramOrderNotification(alertOrder, testShop);
    assert(compatResult === true, 'sendTelegramOrderNotification backward-compatible wrapper returns true');

    // Forensic Zero-Chat DB Invariant Probe
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    assert(fs.existsSync(dbPath), 'data/db.json exists on disk');

    const dbRaw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const rootKeys = Object.keys(dbRaw).sort();
    assert(
      JSON.stringify(rootKeys) === JSON.stringify(['channels', 'orders', 'products', 'shops']),
      'Database root keys strictly match ["channels", "orders", "products", "shops"]'
    );
    assert(
      !('conversations' in dbRaw) &&
        !('messages' in dbRaw) &&
        !('chat_history' in dbRaw) &&
        !('threads' in dbRaw),
      'Database contains zero "conversations", "messages", "chat_history", or "threads" keys'
    );

    assert(
      (db as any).messages === undefined && (db as any).conversations === undefined,
      'MultiTenantDB runtime instance has zero messages or conversations collections'
    );
  }

  console.log('\n================================================================');
  console.log(`TOTAL MILESTONE 4 ASSERTIONS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('\n>>> ALL MILESTONE 4 SALES CLOSING ASSERTIONS PASSED CLEANLY! <<<\n');
  } else {
    console.error('\n>>> SOME MILESTONE 4 ASSERTIONS FAILED <<<\n');
    process.exit(1);
  }
}

if (require.main === module || !process.env.VITEST) {
  runM4Tests().catch((err) => {
    console.error('M4 Test execution error:', err);
    process.exit(1);
  });
}
