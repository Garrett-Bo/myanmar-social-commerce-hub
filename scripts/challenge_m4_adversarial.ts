/**
 * Milestone 4 Adversarial Challenge Suite:
 * Empirical Stress-Testing Burmese NLP, Intent Classification, Slang Fuzzing,
 * Out-of-Order Attribute Extraction, Phone Number Normalization, Missing Field Prompting,
 * Regional Prepaid Policy Rejection, Inventory Guard, and Zero-Chat Invariant.
 *
 * 7 Challenge Suites:
 *  Suite 1: Intent Classification Stress, Zawgyi & Burglish Slang Fuzzing (50 assertions)
 *  Suite 2: Myanmar Phone Number Normalizer & Extractor Edge Cases (30 assertions)
 *  Suite 3: Out-of-Order Attribute Delivery During Checkout (20 assertions)
 *  Suite 4: Missing Field Prompts Precision & Politeness (20 assertions)
 *  Suite 5: Regional Prepaid Policy Strict COD Rejection (20 assertions)
 *  Suite 6: Pre-Decrement Stock Guard & Inventory Boundaries (15 assertions)
 *  Suite 7: Telegram Alerts & Zero-Chat DB Invariant Forensic Audit (10 assertions)
 */

import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';
import {
  classifyBurmeseIntent,
  matchCatalogProducts,
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
  telegramAlertSpy,
  formatTelegramOrderAlertText,
} from '../src/lib/telegram';
import {
  normalizeBurmese,
  convertBurmeseDigits,
  normalizeMyanmarPhone,
  isZawgyi,
} from '../src/lib/burmese-converter';
import { lookupTownshipDelivery, isRegionalPrepaidOnly } from '../src/lib/myanmar-townships';
import { Product, Shop, Order } from '../src/types';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedAssertions++;
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

export async function runAdversarialM4Challenge() {
  console.log('================================================================');
  console.log('CHALLENGER M4: ADVERSARIAL STRESS TEST & INTEGRITY HARNESS');
  console.log('================================================================\n');

  // Shared mock shop
  const testShop: Shop = {
    id: 'shop-m4-adv',
    name: 'Padamyar Myanmar Crafts & Cosmetics',
    ownerEmail: 'padamyar@test.com',
    kpayNumber: '09798765432',
    kpayName: 'Daw Padamyar',
    waveNumber: '09798765432',
    waveName: 'Daw Padamyar',
    telegramBotToken: 'mock_adv_bot_token',
    telegramChatId: '@padamyar_orders',
  };

  // Shared mock products
  const testProducts: Product[] = [
    {
      id: 'prod-adv-1',
      shopId: testShop.id,
      sku: 'SKU-SERUM-01',
      nameMm: 'ဗီတာမင်စီ ဆီရမ်',
      nameEn: 'Vitamin C Serum',
      category: 'Skincare',
      priceMmk: 25000,
      stockQuantity: 15,
      imageUrl: 'https://example.com/serum.jpg',
      isAvailable: true,
    },
    {
      id: 'prod-adv-2',
      shopId: testShop.id,
      sku: 'SKU-LIP-02',
      nameMm: 'နှုတ်ခမ်းနီ',
      nameEn: 'Velvet Lip Tint',
      category: 'Cosmetics',
      priceMmk: 10000,
      stockQuantity: 0, // Out of stock intentionally
      imageUrl: 'https://example.com/liptint.jpg',
      isAvailable: false,
    },
    {
      id: 'prod-adv-3',
      shopId: testShop.id,
      sku: 'SKU-SUN-03',
      nameMm: 'နေကာခရင်မ်',
      nameEn: 'Sunscreen SPF 50',
      category: 'Skincare',
      priceMmk: 18000,
      stockQuantity: 5,
      imageUrl: 'https://example.com/sunscreen.jpg',
      isAvailable: true,
    },
    {
      id: 'prod-adv-4',
      shopId: testShop.id,
      sku: 'SKU-PASO-04',
      nameMm: 'မန္တလေး ချည်ပိုးထည်',
      nameEn: 'Mandalay Silk Paso',
      category: 'Fashion',
      priceMmk: 40000,
      stockQuantity: 8,
      imageUrl: 'https://example.com/paso.jpg',
      isAvailable: true,
    },
  ];

  await db.saveShop(testShop);
  for (const p of testProducts) {
    await db.saveProduct(testShop.id, p);
  }

  // ==========================================================================
  // SUITE 1: Burmese & Burglish Intent Classification Stress & Slang Fuzzing
  // ==========================================================================
  console.log('--- SUITE 1: Intent Classification Stress, Zawgyi & Burglish Slang Fuzzing ---');

  // 1.1 All 11 Intents with Standard Unicode
  assert(classifyBurmeseIntent('မင်္ဂလာပါရှင်').intent === 'greeting', 'Greeting: မင်္ဂလာပါရှင်');
  assert(classifyBurmeseIntent('ဟဲလို မင်မင်').intent === 'greeting', 'Greeting: ဟဲလို မင်မင်');
  assert(classifyBurmeseIntent('ဆီရမ် ဈေးဘယ်လောက်လဲရှင့်').intent === 'price_inquiry', 'Price: ဈေးဘယ်လောက်လဲရှင့်');
  assert(classifyBurmeseIntent('ဘယ်လောက်ကျမလဲ').intent === 'price_inquiry', 'Price: ဘယ်လောက်ကျမလဲ');
  assert(classifyBurmeseIntent('ဆီရမ် ရှိသေးလား').intent === 'stock_inquiry', 'Stock: ရှိသေးလား');
  assert(classifyBurmeseIntent('ပစ္စည်းကျန်သေးလား').intent === 'stock_inquiry', 'Stock: ပစ္စည်းကျန်သေးလား');
  assert(classifyBurmeseIntent('စမ်းချောင်း ပို့ခ ဘယ်လောက်လဲ').intent === 'delivery_inquiry', 'Delivery: ပို့ခ ဘယ်လောက်လဲ');
  assert(classifyBurmeseIntent('ဘယ်နှစ်ရက်ကြာမလဲ').intent === 'delivery_inquiry', 'Delivery: ဘယ်နှစ်ရက်ကြာမလဲ');
  assert(classifyBurmeseIntent('kpay ရလားရှင့်').intent === 'payment_inquiry', 'Payment: kpay ရလားရှင့်');
  assert(classifyBurmeseIntent('wavepay နဲ့ ငွေဘယ်လိုချေရမလဲ').intent === 'payment_inquiry', 'Payment: ငွေဘယ်လိုချေရမလဲ');
  assert(classifyBurmeseIntent('ဆီရမ် ၁ ဘူး ဝယ်မယ်').intent === 'order_intent', 'Order: ဝယ်မယ်');
  assert(classifyBurmeseIntent('ယူမယ်ရှင့်').intent === 'order_intent', 'Order: ယူမယ်ရှင့်');
  assert(classifyBurmeseIntent('မှာချင်လို့ပါ').intent === 'order_intent', 'Order: မှာချင်လို့ပါ');
  assert(classifyBurmeseIntent('09798765432 စမ်းချောင်း ဗဟိုလမ်း').intent === 'checkout_info', 'Checkout info: phone + township + road');
  assert(classifyBurmeseIntent('ဈေးလျှော့ပေးလား').intent === 'discount_inquiry', 'Discount: ဈေးလျှော့ပေးလား');
  assert(classifyBurmeseIntent('ပရိုမိုးရှင်း ရှိလား').intent === 'discount_inquiry', 'Discount: ပရိုမိုးရှင်း ရှိလား');
  assert(classifyBurmeseIntent('စလစ်ပို့ထားပါတယ်').intent === 'slip_inquiry', 'Slip: စလစ်ပို့ထားပါတယ်');
  assert(classifyBurmeseIntent('kpay လွှဲပြီးပါပြီ').intent === 'slip_inquiry', 'Slip: kpay လွှဲပြီးပါပြီ');
  assert(classifyBurmeseIntent('လူနဲ့ပြောချင်လို့ မင်မင်ခေါ်ပေးပါ').intent === 'human_takeover', 'Human: လူနဲ့ပြောချင်လို့');
  assert(classifyBurmeseIntent('admin plz').intent === 'human_takeover', 'Human: admin plz');

  // 1.2 Zawgyi Encoding Auto-Detection & Normalized Intent Classification
  assert(classifyBurmeseIntent('ေစ်းဘယ္ေလာက္လဲ').intent === 'price_inquiry', 'Zawgyi: ေစ်းဘယ္ေလာက္လဲ -> price_inquiry');
  assert(classifyBurmeseIntent('မဂၤလာပါ').intent === 'greeting', 'Zawgyi: မဂၤလာပါ -> greeting');
  assert(classifyBurmeseIntent('ဝယ္မယ္').intent === 'order_intent', 'Zawgyi: ဝယ္မယ္ -> order_intent');
  assert(classifyBurmeseIntent('ပစၥည္းရွိလား').intent === 'stock_inquiry', 'Zawgyi: ပစၥည္းရွိလား -> stock_inquiry');
  assert(classifyBurmeseIntent('လမ္းမေတာ္ ပို့ခ ဘယ္ေလာက္လဲ').intent === 'delivery_inquiry', 'Zawgyi: လမ္းမေတာ္ ပို့ခ -> delivery_inquiry');
  assert(classifyBurmeseIntent('ေစ်း kpay ရလား').intent === 'payment_inquiry', 'Zawgyi mixed: ေစ်း kpay ရလား -> payment_inquiry');

  // 1.2B Empirical Boundary Probes for Pure Burmese KPay Transliteration
  // In classifyBurmeseIntent, pure Burmese transliterations like 'ကေပေး ရလား' fall back to general_inquiry:
  const pureMmKpayResult = classifyBurmeseIntent('ကေပေး ရလား');
  assert(
    pureMmKpayResult.intent === 'general_inquiry',
    'Boundary Probe: "ကေပေး ရလား" falls back to general_inquiry in classifyBurmeseIntent'
  );
  // BUT in extractPaymentMethod during checkout, 'ကေပေး' is correctly recognized as kpay:
  const extractKpayResult = extractPaymentMethod('ကေပေး', null);
  assert(
    extractKpayResult.paymentMethod === 'kpay',
    'Checkout Resiliency: extractPaymentMethod recognizes pure Burmese "ကေပေး" as kpay'
  );

  // 1.3 Burglish Slang Fuzzing Matrix
  assert(classifyBurmeseIntent('bl lout ll').intent === 'price_inquiry', 'Burglish: bl lout ll');
  assert(classifyBurmeseIntent('bl lout le').intent === 'price_inquiry', 'Burglish: bl lout le');
  assert(classifyBurmeseIntent('ze bl lout').intent === 'price_inquiry', 'Burglish: ze bl lout');
  assert(classifyBurmeseIntent('zay bl lout').intent === 'price_inquiry', 'Burglish: zay bl lout');
  assert(classifyBurmeseIntent('price plx').intent === 'price_inquiry', 'Burglish: price plx');
  assert(classifyBurmeseIntent('price plz').intent === 'price_inquiry', 'Burglish: price plz');
  assert(classifyBurmeseIntent('price pr').intent === 'price_inquiry', 'Burglish: price pr');
  assert(classifyBurmeseIntent('price please').intent === 'price_inquiry', 'Burglish: price please');
  assert(classifyBurmeseIntent('instock shi lr').intent === 'stock_inquiry', 'Burglish: instock shi lr');
  assert(classifyBurmeseIntent('shi lr').intent === 'stock_inquiry', 'Burglish: shi lr');
  assert(classifyBurmeseIntent('shi thay lr').intent === 'stock_inquiry', 'Burglish: shi thay lr');
  assert(classifyBurmeseIntent('stock kyan lr').intent === 'stock_inquiry', 'Burglish: stock kyan lr');
  assert(classifyBurmeseIntent('oos').intent === 'stock_inquiry', 'Burglish: oos');
  assert(classifyBurmeseIntent('dali charge').intent === 'delivery_inquiry', 'Burglish: dali charge');
  assert(classifyBurmeseIntent('deli fee').intent === 'delivery_inquiry', 'Burglish: deli fee');
  assert(classifyBurmeseIntent('deli bl lout').intent === 'delivery_inquiry', 'Burglish: deli bl lout');
  assert(classifyBurmeseIntent('deli kha').intent === 'delivery_inquiry', 'Burglish: deli kha');
  assert(classifyBurmeseIntent('cod ya lr').intent === 'delivery_inquiry', 'Burglish: cod ya lr');
  assert(classifyBurmeseIntent('kpay ya lr').intent === 'payment_inquiry', 'Burglish: kpay ya lr');
  assert(classifyBurmeseIntent('kpay r lr').intent === 'payment_inquiry', 'Burglish: kpay r lr');
  assert(classifyBurmeseIntent('wave ya lr').intent === 'payment_inquiry', 'Burglish: wave ya lr');
  assert(classifyBurmeseIntent('bhr lo shin').intent === 'payment_inquiry', 'Burglish: bhr lo shin');
  assert(classifyBurmeseIntent('order tin ml').intent === 'order_intent', 'Burglish: order tin ml');
  assert(classifyBurmeseIntent('order ml').intent === 'order_intent', 'Burglish: order ml');
  assert(classifyBurmeseIntent('yuu ml').intent === 'order_intent', 'Burglish: yuu ml');
  assert(classifyBurmeseIntent('yu ml').intent === 'order_intent', 'Burglish: yu ml');
  assert(classifyBurmeseIntent('mhar ml').intent === 'order_intent', 'Burglish: mhar ml');
  assert(classifyBurmeseIntent('we ml').intent === 'order_intent', 'Burglish: we ml');
  assert(classifyBurmeseIntent('take 1').intent === 'order_intent', 'Burglish: take 1');
  assert(classifyBurmeseIntent('take one').intent === 'order_intent', 'Burglish: take one');
  assert(classifyBurmeseIntent('mingalarpar').intent === 'greeting', 'Burglish: mingalarpar');
  assert(classifyBurmeseIntent('mglpar').intent === 'greeting', 'Burglish: mglpar');
  assert(classifyBurmeseIntent('mglba').intent === 'greeting', 'Burglish: mglba');
  assert(classifyBurmeseIntent('human plz').intent === 'human_takeover', 'Burglish: human plz');
  assert(classifyBurmeseIntent('talk to human').intent === 'human_takeover', 'Burglish: talk to human');
  assert(classifyBurmeseIntent('slip po').intent === 'slip_inquiry', 'Burglish: slip po');
  assert(classifyBurmeseIntent('screenshot').intent === 'slip_inquiry', 'Burglish: screenshot');
  assert(classifyBurmeseIntent('kpay lwe pee').intent === 'slip_inquiry', 'Burglish: kpay lwe pee');
  assert(classifyBurmeseIntent('shout pay lr').intent === 'discount_inquiry', 'Burglish: shout pay lr');

  // 1.4 Noisy & Malformed Inputs
  assert(classifyBurmeseIntent('🔥🔥 မင်္ဂလာပါ မင်မင်ရေ 🙏🌸').intent === 'greeting', 'Noisy greeting with emojis');
  assert(classifyBurmeseIntent('???? ze bl lout ll ????!!!!').intent === 'price_inquiry', 'Noisy price with punctuation');
  assert(classifyBurmeseIntent('   \n\t   kpay ya lr   \n   ').intent === 'payment_inquiry', 'Whitespace padded payment inquiry');
  assert(classifyBurmeseIntent('human agent plz deli charge bl lout ll').intent === 'human_takeover', 'Precedence: human takeover beats delivery');
  assert(classifyBurmeseIntent('').intent === 'general_inquiry', 'Empty input returns general_inquiry');
  assert(classifyBurmeseIntent('random gibberish xyz 12345').intent === 'general_inquiry', 'Unrecognized string returns general_inquiry');

  // ==========================================================================
  // SUITE 2: Myanmar Phone Number Normalizer & Extractor Edge Cases
  // ==========================================================================
  console.log('\n--- SUITE 2: Myanmar Phone Number Normalizer & Extractor Edge Cases ---');

  // 2.1 Standard formats
  assert(normalizeMyanmarPhone('09798765432') === '09798765432', 'Standard 11-digit mobile: 09798765432');
  assert(normalizeMyanmarPhone('09979876543') === '09979876543', 'Standard 11-digit Ooredoo: 09979876543');
  assert(normalizeMyanmarPhone('09250012345') === '09250012345', 'Standard 11-digit MPT: 09250012345');
  assert(normalizeMyanmarPhone('09420012345') === '09420012345', 'Standard 11-digit Atom: 09420012345');

  // 2.2 International prefixes
  assert(normalizeMyanmarPhone('+959798765432') === '09798765432', 'International prefix: +959...');
  assert(normalizeMyanmarPhone('+95 9 798 765 432') === '09798765432', 'International spaced: +95 9 798 765 432');
  assert(normalizeMyanmarPhone('00959798765432') === '09798765432', 'International double-zero: 00959...');
  assert(normalizeMyanmarPhone('959798765432') === '09798765432', 'International no-plus: 959...');
  assert(normalizeMyanmarPhone('+09798765432') === '09798765432', 'Plus-zero-nine: +09...');

  // 2.3 Delimiters (spaces, hyphens, dots, mixed)
  assert(normalizeMyanmarPhone('09 798 765 432') === '09798765432', 'Spaced: 09 798 765 432');
  assert(normalizeMyanmarPhone('09-798-765-432') === '09798765432', 'Hyphenated: 09-798-765-432');
  assert(normalizeMyanmarPhone('09.798.765.432') === '09798765432', 'Dotted: 09.798.765.432');
  assert(normalizeMyanmarPhone('09 798-765.432') === '09798765432', 'Mixed delimiters: 09 798-765.432');

  // 2.4 Burmese numerals
  assert(normalizeMyanmarPhone('၀၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Burmese numerals: ၀၉၇၉၈၇၆၅၄၃၂');
  assert(normalizeMyanmarPhone('၀၉-၇၉၈-၇၆၅-၄၃၂') === '09798765432', 'Burmese numerals hyphenated');
  assert(normalizeMyanmarPhone('၀၉ ၇၉၈ ၇၆၅ ၄၃၂') === '09798765432', 'Burmese numerals spaced');

  // 2.5 Letter Wa 'ဝ' typos
  assert(normalizeMyanmarPhone('ဝ၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Letter Wa prefix: ဝ၉...');
  assert(normalizeMyanmarPhone('ဝ၉-798765432') === '09798765432', 'Letter Wa with ASCII digits');
  assert(normalizeMyanmarPhone('ဝ၉ 798 765 432') === '09798765432', 'Letter Wa spaced with ASCII');

  // 2.6 Missing leading zero
  assert(normalizeMyanmarPhone('9798765432') === '09798765432', 'Missing leading zero 10-digit: 9798765432');
  assert(normalizeMyanmarPhone('9250012345') === '09250012345', 'Missing leading zero 10-digit: 9250012345');

  // 2.7 Extraction in conversational context
  assert(
    extractCustomerPhone('ဖုန်းနံပါတ်က ၀၉-၇၉၈၇၆၅၄၃၂ ပါ') === '09798765432',
    'Extract from Burmese text with Burmese digits'
  );
  assert(
    extractCustomerPhone('Ph: +95 9 798 765 432 pls deliver') === '09798765432',
    'Extract international phone from mixed Burglish'
  );
  assert(
    extractCustomerPhone('ဈေး ၂၅၀၀၀ ကျပ် ဖုန်း 09798765432 အရေအတွက် ၂ ဘူး') === '09798765432',
    'Extract phone without confusing price (25000) or quantity (2)'
  );
  assert(
    extractCustomerPhone('အမည် မောင်မောင် ဖုန်း ဝ၉၇၉၈၇၆၅၄၃၂ လိပ်စာ စမ်းချောင်း') === '09798765432',
    'Extract phone with letter Wa from multi-attribute line'
  );

  // 2.8 Invalid phone rejections
  assert(normalizeMyanmarPhone('09123') === '', 'Rejects too short (5 digits)');
  assert(normalizeMyanmarPhone('1234567890') === '', 'Rejects non-09 prefix (123...)');
  assert(normalizeMyanmarPhone('+14155552671') === '', 'Rejects US country code (+1...)');
  assert(normalizeMyanmarPhone('09abcdefghi') === '', 'Rejects non-numeric alphabetic string');
  assert(normalizeMyanmarPhone('') === '', 'Rejects empty string');
  assert(extractCustomerPhone('ဖုန်းမရှိပါဘူး') === undefined, 'Returns undefined when no phone in text');

  // ==========================================================================
  // SUITE 3: Out-of-Order Attribute Delivery During Checkout
  // ==========================================================================
  console.log('\n--- SUITE 3: Out-of-Order Attribute Delivery During Checkout ---');

  // Order Permutation 1: Phone -> Township -> Product -> Quantity -> Payment -> Name
  {
    const text1 = '09798765432 စမ်းချောင်း ဗီတာမင်စီ ဆီရမ် ၂ ဘူး kpay အမည်: မောင်မောင်';
    const res1 = await processCustomerMessage(text1, {
      shop: testShop,
      products: testProducts,
    });
    assert(!!res1.completedOrder, 'Permutation 1 (Phone first): Order finalized');
    assert(res1.completedOrder?.customerPhone === '09798765432', 'Permutation 1: Phone correct');
    assert(res1.completedOrder?.township === 'Sanchaung', 'Permutation 1: Township correct');
    assert(res1.completedOrder?.items[0].quantity === 2, 'Permutation 1: Quantity correct (2)');
    assert(res1.completedOrder?.paymentMethod === 'kpay', 'Permutation 1: Payment correct (kpay)');
    assert(res1.completedOrder?.customerName === 'မောင်မောင်', 'Permutation 1: Customer name correct');
  }

  // Order Permutation 2: Payment -> Township -> Product -> Phone -> Name
  {
    const text2 = 'kpay စမ်းချောင်း ဗီတာမင်စီ ဆီရမ် 09798765432 အမည် Daw Mya';
    const res2 = await processCustomerMessage(text2, {
      shop: testShop,
      products: testProducts,
    });
    assert(!!res2.completedOrder, 'Permutation 2 (Payment first): Order finalized');
    assert(res2.completedOrder?.paymentMethod === 'kpay', 'Permutation 2: Payment correct');
    assert(res2.completedOrder?.township === 'Sanchaung', 'Permutation 2: Township correct');
    assert(res2.completedOrder?.items[0].name === 'ဗီတာမင်စီ ဆီရမ်', 'Permutation 2: Product matched');
    assert(res2.completedOrder?.customerPhone === '09798765432', 'Permutation 2: Phone correct');
    assert(res2.completedOrder?.customerName === 'Daw Mya', 'Permutation 2: Name correct');
  }

  // Order Permutation 3: Name -> Product -> Payment -> Township -> Phone
  {
    // Permutation 3A: Delimited with Burmese comma
    const text3A = 'လက်ခံသူ ဒေါ်အေး၊ ဆီရမ် ၁ ဘူး wavepay ကမာရွတ် 09798765432';
    const res3A = await processCustomerMessage(text3A, {
      shop: testShop,
      products: testProducts,
    });
    assert(!!res3A.completedOrder, 'Permutation 3A (Name with Burmese comma): Order finalized');
    assert(res3A.completedOrder?.customerName === 'ဒေါ်အေး', 'Permutation 3A: Burmese name extracted cleanly');
    assert(res3A.completedOrder?.township === 'Kamayut', 'Permutation 3A: Township correct (Kamayut)');
    assert(res3A.completedOrder?.paymentMethod === 'wavepay', 'Permutation 3A: Payment correct (wavepay)');
    assert(res3A.completedOrder?.deliveryFeeMmk === 2500, 'Permutation 3A: Delivery fee correct (2500 MMK)');

    // Permutation 3B: Undelimited Name in running text falls back safely to default name without blocking checkout
    const text3B = 'လက်ခံသူ ဒေါ်အေး ဆီရမ် ၁ ဘူး wavepay ကမာရွတ် 09798765432';
    const res3B = await processCustomerMessage(text3B, {
      shop: testShop,
      products: testProducts,
      customerName: 'Daw Aye',
    });
    assert(!!res3B.completedOrder, 'Permutation 3B (Undelimited Name): Order finalized safely without blocking');
    assert(res3B.completedOrder?.customerName === 'Daw Aye', 'Permutation 3B: Uses context customerName fallback');
  }

  // Order Permutation 4: Product -> Phone -> Payment -> Township (COD in Yangon)
  {
    const text4 = 'ဗီတာမင်စီ ဆီရမ် 09798765432 cod လမ်းမတော်';
    const res4 = await processCustomerMessage(text4, {
      shop: testShop,
      products: testProducts,
      customerName: 'Ko Tun',
    });
    assert(!!res4.completedOrder, 'Permutation 4 (Product first): Order finalized');
    assert(res4.completedOrder?.paymentMethod === 'cod', 'Permutation 4: COD allowed for Lanmadaw');
    assert(res4.completedOrder?.status === 'confirmed', 'Permutation 4: COD status is confirmed');
    assert(res4.completedOrder?.township === 'Lanmadaw', 'Permutation 4: Township correct');
  }

  // Order Permutation 5: Deeply conversational and noisy Burglish/Burmese out-of-order
  {
    const text5 =
      'မင်္ဂလာပါရှင် kpay နဲ့ရှင်းချင်လို့ပါ လိပ်စာက အမှတ် ၁၀ ဗဟိုလမ်း စမ်းချောင်းမြို့နယ်ပါ ဖုန်း ၀၉-၇၉၈၇၆၅၄၃၂ ဗီတာမင်စီ ဆီရမ် ၂ ဘူး မှာချင်ပါတယ် အမည် မမြ ပါ';
    const res5 = await processCustomerMessage(text5, {
      shop: testShop,
      products: testProducts,
    });
    assert(!!res5.completedOrder, 'Permutation 5 (Noisy conversational): Order finalized');
    assert(res5.completedOrder?.customerPhone === '09798765432', 'Permutation 5: Normalized Burmese digits phone');
    assert(res5.completedOrder?.township === 'Sanchaung', 'Permutation 5: Township Sanchaung');
    assert(res5.completedOrder?.paymentMethod === 'kpay', 'Permutation 5: KPay payment');
    assert(res5.completedOrder?.items[0].quantity === 2, 'Permutation 5: Quantity 2');
    assert(res5.completedOrder?.subtotalMmk === 50000, 'Permutation 5: Subtotal 50,000 MMK (25,000 * 2)');
    assert(res5.completedOrder?.deliveryFeeMmk === 2500, 'Permutation 5: Delivery fee 2,500 MMK');
    assert(res5.completedOrder?.totalMmk === 52500, 'Permutation 5: Grand total 52,500 MMK');
  }

  // ==========================================================================
  // SUITE 4: Missing Field Prompts Precision & Politeness
  // ==========================================================================
  console.log('\n--- SUITE 4: Missing Field Prompts Precision & Politeness ---');

  const sanchaungDelivery = lookupTownshipDelivery('Sanchaung');
  const taunggyiDelivery = lookupTownshipDelivery('Taunggyi');

  // 4.1 Missing single fields
  {
    const promptPhone = formatMissingAttributesPrompt(['phone'], testShop, sanchaungDelivery);
    assert(promptPhone.includes('ဖုန်းနံပါတ်'), 'Missing phone prompt includes phone request');
    assert(!promptPhone.includes('မှာယူလိုသည့် ပစ္စည်းအမည်'), 'Missing phone does NOT request product');
    assert(!promptPhone.includes('ငွေချေနည်းလမ်း'), 'Missing phone does NOT request payment');
    assert(!promptPhone.includes('မြို့နယ်'), 'Missing phone does NOT request township');
  }

  {
    const promptTownship = formatMissingAttributesPrompt(['township'], testShop, null);
    assert(promptTownship.includes('မြို့နယ် နှင့် အသေးစိတ်လိပ်စာ'), 'Missing township prompt includes township request');
    assert(!promptTownship.includes('ဖုန်းနံပါတ်'), 'Missing township does NOT request phone');
    assert(!promptTownship.includes('ငွေချေနည်းလမ်း'), 'Missing township does NOT request payment');
  }

  {
    // Payment prompt for Yangon (Metro -> COD allowed)
    const promptPaymentYangon = formatMissingAttributesPrompt(['payment'], testShop, sanchaungDelivery);
    assert(promptPaymentYangon.includes('ငွေချေနည်းလမ်း'), 'Missing payment prompt includes payment');
    assert(promptPaymentYangon.includes('COD'), 'Yangon payment prompt includes COD option');
    assert(promptPaymentYangon.includes('KPay'), 'Yangon payment prompt includes KPay');
    assert(promptPaymentYangon.includes('WavePay'), 'Yangon payment prompt includes WavePay');
  }

  {
    // Payment prompt for Taunggyi (Regional -> COD prohibited, Prepaid only)
    const promptPaymentTaunggyi = formatMissingAttributesPrompt(['payment'], testShop, taunggyiDelivery);
    assert(promptPaymentTaunggyi.includes('ငွေချေနည်းလမ်း'), 'Regional missing payment prompt includes payment');
    assert(promptPaymentTaunggyi.includes('ကြိုလွှဲစနစ်'), 'Regional payment prompt specifies prepaid (ကြိုလွှဲစနစ်)');
    assert(!promptPaymentTaunggyi.includes('COD'), 'Regional payment prompt strictly OMITS COD');
  }

  // 4.2 Multi-turn Missing Field Extraction via processCustomerMessage
  {
    // Turn A: Product only provided -> should request phone, township, payment (NOT product)
    const resA = await processCustomerMessage('ဗီတာမင်စီ ဆီရမ် ၂ ဘူး ဝယ်မယ်', {
      shop: testShop,
      products: testProducts,
    });
    assert(!resA.completedOrder, 'Turn A (Product only): Order NOT finalized');
    assert(resA.replyText.includes('ဖုန်းနံပါတ်'), 'Turn A: Requests phone');
    assert(resA.replyText.includes('မြို့နယ်'), 'Turn A: Requests township');
    assert(resA.replyText.includes('ငွေချေနည်းလမ်း'), 'Turn A: Requests payment');
    assert(!resA.replyText.includes('မှာယူလိုသည့် ပစ္စည်းအမည်'), 'Turn A: Does NOT request product');
  }

  {
    // Turn B: Product + Township provided -> should request ONLY phone and payment
    const resB = await processCustomerMessage('ဗီတာမင်စီ ဆီရမ် ၂ ဘူး စမ်းချောင်း ပို့ပေးပါ', {
      shop: testShop,
      products: testProducts,
    });
    assert(!resB.completedOrder, 'Turn B: Order NOT finalized');
    assert(resB.replyText.includes('ဖုန်းနံပါတ်'), 'Turn B: Requests phone');
    assert(resB.replyText.includes('ငွေချေနည်းလမ်း'), 'Turn B: Requests payment');
    assert(!resB.replyText.includes('မြို့နယ် နှင့် အသေးစိတ်လိပ်စာ'), 'Turn B: Does NOT request township');
    assert(!resB.replyText.includes('မှာယူလိုသည့် ပစ္စည်းအမည်'), 'Turn B: Does NOT request product');
  }

  {
    // Turn C: Product + Township + Phone provided -> should request ONLY payment
    const resC = await processCustomerMessage('ဗီတာမင်စီ ဆီရမ် ၂ ဘူး စမ်းချောင်း ၀၉၇၉၈၇၆၅၄၃၂ ဝယ်ချင်လို့', {
      shop: testShop,
      products: testProducts,
    });
    assert(!resC.completedOrder, 'Turn C: Order NOT finalized');
    assert(resC.replyText.includes('ငွေချေနည်းလမ်း'), 'Turn C: Requests ONLY payment');
    assert(!resC.replyText.includes('ဖုန်းနံပါတ်'), 'Turn C: Does NOT request phone');
    assert(!resC.replyText.includes('မြို့နယ်'), 'Turn C: Does NOT request township');
    assert(!resC.replyText.includes('မှာယူလိုသည့် ပစ္စည်းအမည်'), 'Turn C: Does NOT request product');
  }

  // ==========================================================================
  // SUITE 5: Regional Prepaid Policy Strict COD Rejection
  // ==========================================================================
  console.log('\n--- SUITE 5: Regional Prepaid Policy Strict COD Rejection ---');

  // 5.1 City 1: Taunggyi COD Rejection
  {
    const resTaunggyiCod = await processCustomerMessage(
      'ဗီတာမင်စီ ဆီရမ် တောင်ကြီးမြို့နယ် 09798765432 cod နဲ့ ပို့ပေးပါ',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!resTaunggyiCod.completedOrder, 'Taunggyi + COD: Order NOT finalized');
    assert(
      resTaunggyiCod.replyText.includes('Prepaid Only') || resTaunggyiCod.replyText.includes('မရရှိနိုင်ပါရှင့်'),
      'Taunggyi + COD: Rejection mentions Prepaid Only / မရရှိနိုင်ပါရှင့်'
    );
    assert(
      resTaunggyiCod.replyText.includes('KPay') || resTaunggyiCod.replyText.includes('WavePay'),
      'Taunggyi + COD: Prompts for KPay or WavePay prepaid'
    );
  }

  // 5.2 City 2: Mawlamyine COD Rejection
  {
    const resMawlamyineCod = await processCustomerMessage(
      'မော်လမြိုင် COD ရလား ဆီရမ် ယူမယ် 09798765432',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!resMawlamyineCod.completedOrder, 'Mawlamyine + COD: Order NOT finalized');
    assert(
      resMawlamyineCod.replyText.includes('Prepaid Only') || resMawlamyineCod.replyText.includes('မရရှိနိုင်ပါရှင့်'),
      'Mawlamyine + COD: Rejection response generated'
    );
  }

  // 5.3 Express Highway Bus Gate 1: Aung Mingalar COD Rejection
  {
    const resAungMingalarCod = await processCustomerMessage(
      'အောင်မင်္ဂလာ အဝေးပြေးကားဂိတ် cod 09798765432 ဆီရမ်',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!resAungMingalarCod.completedOrder, 'Aung Mingalar + COD: Order NOT finalized');
    assert(
      resAungMingalarCod.replyText.includes('Prepaid Only') || resAungMingalarCod.replyText.includes('အဝေးပြေးကားဂိတ်'),
      'Aung Mingalar + COD: Explains bus gates require prepaid'
    );
  }

  // 5.4 Express Highway Bus Gate 2: Dagon Ayeyar COD Rejection
  {
    const resDagonAyeyarCod = await processCustomerMessage(
      'ဒဂုံဧရာ ကားဂိတ် cod နဲ့ ပို့ပေးပါ 09798765432 ဆီရမ်',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!resDagonAyeyarCod.completedOrder, 'Dagon Ayeyar + COD: Order NOT finalized');
    assert(
      resDagonAyeyarCod.replyText.includes('Prepaid Only') || resDagonAyeyarCod.replyText.includes('ကားဂိတ်'),
      'Dagon Ayeyar + COD: Rejection response generated'
    );
  }

  // 5.5 Colloquial Burmese Slang COD Rejections for Regional Cities
  {
    // 'ပစ္စည်းရောက်မှငွေချေ' (slang for COD) for Taunggyi
    const resSlang1 = await processCustomerMessage(
      'တောင်ကြီး ပစ္စည်းရောက်မှငွေချေမယ် 09798765432 ဆီရမ်',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!resSlang1.completedOrder, 'Taunggyi + "ပစ္စည်းရောက်မှငွေချေ": Order NOT finalized');

    // 'အိမ်ရောက်ငွေချေ' (slang for COD) for Mawlamyine
    const resSlang2 = await processCustomerMessage(
      'မော်လမြိုင် အိမ်ရောက်ငွေချေ 09798765432 ဆီရမ်',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!resSlang2.completedOrder, 'Mawlamyine + "အိမ်ရောက်ငွေချေ": Order NOT finalized');
  }

  // 5.6 Allowed Regional Prepaid (KPay / WavePay)
  {
    // Taunggyi with KPay -> APPROVED as pending_slip
    const resTaunggyiKpay = await processCustomerMessage(
      'တောင်ကြီး kpay နဲ့ရှင်းမယ် 09798765432 ဆီရမ် ၁ ဘူး',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!!resTaunggyiKpay.completedOrder, 'Taunggyi + KPay: Order finalized successfully');
    assert(resTaunggyiKpay.completedOrder?.status === 'pending_slip', 'Taunggyi + KPay: Initial status is pending_slip');
    assert(resTaunggyiKpay.completedOrder?.deliveryFeeMmk === 5000, 'Taunggyi: Delivery fee 5,000 MMK');

    // Mawlamyine with WavePay -> APPROVED as pending_slip
    const resMawlamyineWave = await processCustomerMessage(
      'မော်လမြိုင် wavepay 09798765432 ဆီရမ် ၁ ဘူး',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!!resMawlamyineWave.completedOrder, 'Mawlamyine + WavePay: Order finalized successfully');
    assert(resMawlamyineWave.completedOrder?.status === 'pending_slip', 'Mawlamyine + WavePay: Status is pending_slip');
    assert(resMawlamyineWave.completedOrder?.deliveryFeeMmk === 4500, 'Mawlamyine: Delivery fee 4,500 MMK');

    // Aung Mingalar Bus Gate with KPay -> APPROVED as pending_slip
    const resGateKpay = await processCustomerMessage(
      'အောင်မင်္ဂလာ အဝေးပြေးကားဂိတ် kpay 09798765432 ဆီရမ် ၁ ဘူး',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!!resGateKpay.completedOrder, 'Aung Mingalar + KPay: Order finalized successfully');
    assert(resGateKpay.completedOrder?.status === 'pending_slip', 'Aung Mingalar + KPay: Status is pending_slip');
    assert(resGateKpay.completedOrder?.deliveryFeeMmk === 3500, 'Aung Mingalar: Gate drop fee 3,500 MMK');
  }

  // 5.7 Allowed COD for Metro (Yangon & Mandalay)
  {
    // Yangon Sanchaung COD -> APPROVED as confirmed
    const resYangonCod = await processCustomerMessage(
      'စမ်းချောင်း cod 09798765432 ဆီရမ် ၁ ဘူး',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!!resYangonCod.completedOrder, 'Yangon Sanchaung + COD: Order finalized');
    assert(resYangonCod.completedOrder?.status === 'confirmed', 'Yangon Sanchaung + COD: Status is confirmed');
    assert(resYangonCod.completedOrder?.deliveryFeeMmk === 2500, 'Yangon Sanchaung: Delivery fee 2,500 MMK');

    // Mandalay Chanayethazan COD -> APPROVED as confirmed
    const resMdyCod = await processCustomerMessage(
      'ချမ်းအေးသာစံ cod 09798765432 ဆီရမ် ၁ ဘူး',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!!resMdyCod.completedOrder, 'Mandalay Chanayethazan + COD: Order finalized');
    assert(resMdyCod.completedOrder?.status === 'confirmed', 'Mandalay Chanayethazan + COD: Status is confirmed');
    assert(resMdyCod.completedOrder?.deliveryFeeMmk === 3000, 'Mandalay Chanayethazan: Delivery fee 3,000 MMK');
  }

  // ==========================================================================
  // SUITE 6: Pre-Decrement Stock Guard & Inventory Boundaries
  // ==========================================================================
  console.log('\n--- SUITE 6: Pre-Decrement Stock Guard & Inventory Boundaries ---');

  // 6.1 Item with 0 stock (prod-adv-2: Velvet Lip Tint)
  {
    const zeroStockProd = testProducts.find((p) => p.id === 'prod-adv-2')!;
    assert(zeroStockProd.stockQuantity === 0, 'prod-adv-2 has initial stock 0');

    const resZeroStock = await processCustomerMessage(
      'နှုတ်ခမ်းနီ ၁ ဘူး စမ်းချောင်း cod 09798765432',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!resZeroStock.completedOrder, 'Out of stock item: Order NOT finalized');
    assert(
      resZeroStock.replyText.includes('လက်ကျန် (0) ခုသာ ရှိပါသဖြင့်') ||
        resZeroStock.replyText.includes('မလုံလောက်ပါရှင့်'),
      'Returns polite deficit notice mentioning 0 available stock'
    );

    // Verify database stock unchanged
    const dbProds = await db.getProducts(testShop.id);
    const pInDb = dbProds.find((p) => p.id === zeroStockProd.id);
    assert(pInDb?.stockQuantity === 0, 'Database stock for prod-adv-2 remained 0');
  }

  // 6.2 Requested quantity strictly exceeds available stock (Stock = 5, Request = 10)
  {
    const sunProd = testProducts.find((p) => p.id === 'prod-adv-3')!;
    const initialSunStock = sunProd.stockQuantity; // 5

    const resExcess = await processCustomerMessage(
      'နေကာခရင်မ် ၁၀ ဘူး စမ်းချောင်း cod 09798765432',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!resExcess.completedOrder, 'Excess quantity (10 > 5): Order NOT finalized');
    assert(
      resExcess.replyText.includes(`လက်ကျန် (${initialSunStock}) ခုသာ ရှိပါသဖြင့်`),
      'Deficit notice explicitly reports available stock count (5)'
    );

    const dbProds = await db.getProducts(testShop.id);
    const pInDb = dbProds.find((p) => p.id === sunProd.id);
    assert(pInDb?.stockQuantity === initialSunStock, 'Database stock untouched after excess quantity attempt');
  }

  // 6.3 Exact Stock Depletion (Stock = 5, Request = 5)
  {
    const sunProd = testProducts.find((p) => p.id === 'prod-adv-3')!;
    const resExact = await processCustomerMessage(
      'နေကာခရင်မ် ၅ ဘူး စမ်းချောင်း cod 09798765432',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!!resExact.completedOrder, 'Exact quantity (5 == 5): Order finalized');

    const dbProds = await db.getProducts(testShop.id);
    const pInDb = dbProds.find((p) => p.id === sunProd.id);
    assert(pInDb?.stockQuantity === 0, 'Database stock decremented exactly to 0');

    // Update local object to reflect DB
    sunProd.stockQuantity = 0;

    // Subsequent order for 1 unit should now fail
    const resSubsequent = await processCustomerMessage(
      'နေကာခရင်မ် ၁ ဘူး စမ်းချောင်း cod 09798765432',
      {
        shop: testShop,
        products: testProducts,
      }
    );
    assert(!resSubsequent.completedOrder, 'Subsequent order on now-depleted stock rejected');
  }

  // ==========================================================================
  // SUITE 7: Telegram Alerts & Zero-Chat DB Invariant Forensic Audit
  // ==========================================================================
  console.log('\n--- SUITE 7: Telegram Alerts & Zero-Chat DB Invariant Forensic Audit ---');

  // 7.1 Telegram Alert Payload Inspection
  {
    telegramAlertSpy.reset(); // Clear spy log
    const testOrder: Order = {
      id: 'ord-adv-tele-1',
      shopId: testShop.id,
      platform: 'facebook',
      customerPlatformId: 'fb-cust-999',
      customerName: 'Ko Kyaw Kyaw',
      customerPhone: '09798765432',
      township: 'Sanchaung',
      fullAddress: 'အမှတ် ၄၅၊ ဗဟိုလမ်း၊ စမ်းချောင်းမြို့နယ်',
      items: [{ productId: 'prod-adv-1', name: 'ဗီတာမင်စီ ဆီရမ်', quantity: 2, priceMmk: 25000 }],
      subtotalMmk: 50000,
      deliveryFeeMmk: 2500,
      totalMmk: 52500,
      paymentMethod: 'kpay',
      status: 'pending_slip',
      createdAt: new Date().toISOString(),
    };

    const alertResult = await sendTelegramOrderAlert(testShop, testOrder, testProducts);
    assert(alertResult.success, 'sendTelegramOrderAlert succeeded');
    assert(telegramAlertSpy.count() >= 1, 'telegramAlertSpy captured event in memory');
    const latestAlert = telegramAlertSpy.getLatest();
    assert(latestAlert?.orderId === 'ord-adv-tele-1', 'Spy captured correct order ID');
    assert(latestAlert?.shopId === testShop.id, 'Spy captured correct shop ID');

    const alertText = formatTelegramOrderAlertText(testShop, testOrder);
    assert(alertText.includes('Ko Kyaw Kyaw'), 'Alert text contains customer name');
    assert(alertText.includes('09798765432'), 'Alert text contains phone');
    assert(alertText.includes('52,500 MMK'), 'Alert text contains formatted grand total');
    assert(alertText.includes('Sanchaung'), 'Alert text contains township');
  }

  // 7.2 Zero-Chat DB Invariant Forensic Disk Audit
  {
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    assert(fs.existsSync(dbPath), 'data/db.json exists on disk');

    const dbRaw = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(dbRaw);
    const rootKeys = Object.keys(parsed).sort();
    assert(
      JSON.stringify(rootKeys) === JSON.stringify(['channels', 'orders', 'products', 'shops']),
      'Database root keys strictly match ["channels", "orders", "products", "shops"]'
    );

    // Deep recursive check for forbidden chat storage
    const forbiddenChatKeys = ['messages', 'conversations', 'threads', 'chat_history', 'chatLogs'];
    let forbiddenFound = false;

    function deepInspect(obj: any, pathTrace: string) {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (forbiddenChatKeys.includes(key.toLowerCase())) {
          forbiddenFound = true;
          console.error(`FORBIDDEN CHAT KEY FOUND at ${pathTrace}.${key}`);
        }
        deepInspect(obj[key], `${pathTrace}.${key}`);
      }
    }

    deepInspect(parsed, 'dbRoot');
    assert(!forbiddenFound, 'Forensic invariant verified: 0 chat or message records exist in database');
  }

  console.log('\n================================================================');
  console.log(`TOTAL ADVERSARIAL CHALLENGE ASSERTIONS: ${totalAssertions}`);
  console.log(`PASSED: ${passedAssertions}`);
  console.log(`FAILED: ${failedAssertions}`);
  console.log('================================================================\n');

  if (failedAssertions === 0) {
    console.log('>>> ALL ADVERSARIAL CHALLENGE ASSERTIONS PASSED CLEANLY! <<<');
  } else {
    console.error(`>>> ADVERSARIAL CHALLENGE FAILED WITH ${failedAssertions} FAILURES! <<<`);
    process.exit(1);
  }
}

if (require.main === module || process.argv[1]?.includes('challenge_m4_adversarial')) {
  runAdversarialM4Challenge().catch((err) => {
    console.error('Fatal unhandled error in challenge suite:', err);
    process.exit(1);
  });
}
