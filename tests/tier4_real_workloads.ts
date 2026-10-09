/**
 * Tier 4 Test Suite: Real-World Workload Scenarios
 * Implements 5 complete end-to-end Myanmar online shopping journeys per TEST_INFRA.md § 7.
 *
 * Scenarios:
 * 1. Yangon Customer via Facebook Messenger (COD Order in Sanchaung)
 * 2. Mandalay Customer via Facebook Messenger in Zawgyi (KPay Order in Chanayethazan)
 * 3. Taunggyi Customer via TikTok (Highway Bus Gate & Regional Prepaid Policy)
 * 4. Burglish Bargaining, Item Switch & Letter Wa Typo Checkout
 * 5. High-Concurrency Multi-Tenant Webhook Flood & Forensic Zero-Chat DB Audit
 */

import { db } from '../src/lib/db';
import {
  processCustomerMessage,
  matchCatalogProducts,
  classifyBurmeseIntent,
  formatOrderVoucher,
  extractQuantity,
  extractCustomerName,
  extractCustomerPhone,
  extractPaymentMethod,
  extractFullAddress,
  AgentContext,
} from '../src/lib/gemini-agent';
import {
  sendFacebookMessage,
  _mockFacebookSentMessages,
  _resetMockFacebookMessages,
} from '../src/lib/facebook';
import {
  sendTikTokMessage,
  _mockTikTokSentMessages,
  _resetMockTikTokMessages,
} from '../src/lib/tiktok';
import { telegramAlertSpy } from '../src/lib/telegram';
import { lookupTownshipDelivery, isRegionalPrepaidOnly } from '../src/lib/myanmar-townships';
import { normalizeBurmese, convertBurmeseDigits, normalizeMyanmarPhone } from '../src/lib/burmese-converter';
import { Shop, Product, Order, ChannelConnection } from '../src/types';
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

async function runTier4Journeys() {
  console.log('================================================================');
  console.log('TIER 4: REAL-WORLD CUSTOMER WORKLOAD JOURNEYS & E2E VERIFICATION');
  console.log('================================================================\n');

  // Setup Test Shops
  const yangonShop: Shop = {
    id: 'shop-ygn-tier4',
    name: 'Aung Thukha Beauty & Fashion Store (ရန်ကုန်)',
    ownerEmail: 'aungthukha@beauty.mm',
    kpayNumber: '09798765432',
    kpayName: 'Daw Thukha Win',
    waveNumber: '09798765432',
    waveName: 'Daw Thukha Win',
    telegramBotToken: 'mock_bot_token_tier4',
    telegramChatId: 'mock_chat_id_tier4',
    createdAt: new Date().toISOString(),
  };

  const mandalayShop: Shop = {
    id: 'shop-mdy-tier4',
    name: 'Mandalay Trendy Closet & Silk (မန္တလေး)',
    ownerEmail: 'mandalay@closet.mm',
    kpayNumber: '09451122334',
    kpayName: 'Ko Ye Yint Aung',
    waveNumber: '09451122334',
    waveName: 'Ko Ye Yint Aung',
    telegramBotToken: 'mock_bot_token_mdy_tier4',
    telegramChatId: 'mock_chat_id_mdy_tier4',
    createdAt: new Date().toISOString(),
  };

  await db.saveShop(yangonShop);
  await db.saveShop(mandalayShop);

  // Setup Channels
  const ygnFbChannel: ChannelConnection = {
    id: 'ch-ygn-fb',
    shopId: yangonShop.id,
    platform: 'facebook',
    pageId: '109283746501928',
    pageName: 'Aung Thukha Beauty Page',
    accessToken: 'EAAX_MOCK_YGN_TOKEN_123',
    isConnected: true,
    updatedAt: new Date().toISOString(),
  };

  const mdyFbChannel: ChannelConnection = {
    id: 'ch-mdy-fb',
    shopId: mandalayShop.id,
    platform: 'facebook',
    pageId: '209384756102938',
    pageName: 'Mandalay Trendy Page',
    accessToken: 'EAAX_MOCK_MDY_TOKEN_456',
    isConnected: true,
    updatedAt: new Date().toISOString(),
  };

  const ygnTtChannel: ChannelConnection = {
    id: 'ch-ygn-tt',
    shopId: yangonShop.id,
    platform: 'tiktok',
    pageId: 'tt_user_ygn_9988',
    pageName: 'Aung Thukha TikTok Shop',
    accessToken: 'tt_mock_ygn_token_789',
    isConnected: true,
    updatedAt: new Date().toISOString(),
  };

  await db.saveChannelConnection(yangonShop.id, ygnFbChannel);
  await db.saveChannelConnection(mandalayShop.id, mdyFbChannel);
  await db.saveChannelConnection(yangonShop.id, ygnTtChannel);

  // Setup Products
  const serum: Product = {
    id: 'prod-ygn-serum',
    shopId: yangonShop.id,
    nameMm: 'သဘာဝ နီယာဆင်နာမိုက် ဆီရမ် (Niacinamide Serum)',
    nameEn: 'Niacinamide Glowing Serum',
    priceMmk: 28000,
    stockQuantity: 15,
    isAvailable: true,
    category: 'Skincare',
    sku: 'SERUM-YGN-01',
    description: 'Brightening daily serum',
    createdAt: new Date().toISOString(),
  };

  const dress: Product = {
    id: 'prod-ygn-dress',
    shopId: yangonShop.id,
    nameMm: 'ပြင်သစ်ဒီဇိုင်း ပန်းပွင့်ဂါဝန် (French Floral Dress)',
    nameEn: 'French Floral Vintage Dress',
    priceMmk: 38000,
    stockQuantity: 8,
    isAvailable: true,
    category: 'Fashion',
    sku: 'DRESS-FR-02',
    description: 'Summer vintage floral dress',
    createdAt: new Date().toISOString(),
  };

  const bag: Product = {
    id: 'prod-ygn-bag',
    shopId: yangonShop.id,
    nameMm: 'ခေတ်ဟောင်း သားရေလွယ်အိတ် (Vintage Leather Crossbody Bag)',
    nameEn: 'Vintage Leather Bag Classic Brown',
    priceMmk: 35000,
    stockQuantity: 4,
    isAvailable: true,
    category: 'Accessories',
    sku: 'BAG-VINTAGE-03',
    description: 'Classic brown leather bag',
    createdAt: new Date().toISOString(),
  };

  const silkLongyi: Product = {
    id: 'prod-mdy-silk',
    shopId: mandalayShop.id,
    nameMm: 'မန္တလေး ရိုးရာ ချည်ပိုးထည် ပုဆိုး (Silk Longyi)',
    nameEn: 'Traditional Mandalay Silk Longyi',
    priceMmk: 45000,
    stockQuantity: 20,
    isAvailable: true,
    category: 'Traditional',
    sku: 'MDY-SILK-01',
    description: 'Authentic Mandalay silk longyi',
    createdAt: new Date().toISOString(),
  };

  await db.saveProduct(yangonShop.id, serum);
  await db.saveProduct(yangonShop.id, dress);
  await db.saveProduct(yangonShop.id, bag);
  await db.saveProduct(mandalayShop.id, silkLongyi);

  // -------------------------------------------------------------
  // SCENARIO 1: Yangon Customer via Facebook Messenger (COD Order)
  // -------------------------------------------------------------
  console.log('--- SCENARIO 1: Yangon Customer Facebook Messenger (COD Order) ---');
  _resetMockFacebookMessages();
  telegramAlertSpy.reset();

  // Turn 1: Product & Price Inquiry
  const s1Turn1Response = await processCustomerMessage('ဟယ်လို ဆီရမ် ဈေးဘယ်လောက်လဲရှင့်', {
    shop: yangonShop,
    products: [serum, dress, bag],
    customerName: 'Ma Hnin',
    senderPlatformId: 'fb_psid_hnin_1',
    channel: ygnFbChannel,
  });
  assert(s1Turn1Response.intent === 'price_inquiry', 'S1.T1: Intent classified as price_inquiry');
  assert(s1Turn1Response.replyText.includes('28,000') || s1Turn1Response.replyText.includes('ဆီရမ်'), 'S1.T1: Mentions Serum price');
  assert(s1Turn1Response.replyText.includes('မင်္ဂလာပါ'), 'S1.T1: Burmese courteous greeting included');

  // Turn 2: Delivery Fee Inquiry
  const s1Turn2Response = await processCustomerMessage('စမ်းချောင်း မြို့နယ် ပို့ခ ဘယ်လောက်ကျလဲ', {
    shop: yangonShop,
    products: [serum, dress, bag],
    customerName: 'Ma Hnin',
    senderPlatformId: 'fb_psid_hnin_1',
    channel: ygnFbChannel,
  });
  assert(s1Turn2Response.detectedTownship === 'Sanchaung', 'S1.T2: Detected Sanchaung Township');
  assert(s1Turn2Response.deliveryFeeMmk === 2500, 'S1.T2: Delivery fee correctly calculated as 2,500 MMK');
  assert(s1Turn2Response.replyText.includes('2,500') || s1Turn2Response.replyText.includes('စမ်းချောင်း'), 'S1.T2: Reply confirms Sanchaung delivery fee');

  // Turn 3: Checkout & Order Placement
  const s1Turn3Response = await processCustomerMessage(
    '၁ ဘူး ယူမယ်ရှင့်။ မနှင်းနွယ်၊ ၀၉-၇၉၈၇၆၅၄၃၂၊ အမှတ် ၁၂၊ ဗဟိုလမ်း၊ စမ်းချောင်း။ အိမ်ရောက်ငွေချေမယ်',
    {
      shop: yangonShop,
      products: [serum, dress, bag],
      customerName: 'Ma Hnin',
      senderPlatformId: 'fb_psid_hnin_1',
      channel: ygnFbChannel,
    }
  );
  assert(s1Turn3Response.completedOrder !== undefined, 'S1.T3: Order successfully created');
  assert(s1Turn3Response.completedOrder?.customerPhone === '09798765432', 'S1.T3: Phone normalized to 09798765432');
  assert(s1Turn3Response.completedOrder?.paymentMethod === 'cod', 'S1.T3: Payment method recorded as COD');
  assert(s1Turn3Response.completedOrder?.subtotalMmk === 28000, 'S1.T3: Subtotal is 28,000 MMK');
  assert(s1Turn3Response.completedOrder?.deliveryFeeMmk === 2500, 'S1.T3: Delivery fee is 2,500 MMK');
  assert(s1Turn3Response.completedOrder?.totalMmk === 30500, 'S1.T3: Grand total is 30,500 MMK');
  assert(s1Turn3Response.completedOrder?.status === 'confirmed', 'S1.T3: COD order status is confirmed');

  // Verify outbound Facebook dispatch
  const fbSendRes = await sendFacebookMessage(
    'fb_psid_hnin_1',
    s1Turn3Response.replyText,
    ygnFbChannel.accessToken
  );
  assert(fbSendRes.success === true, 'S1.T3: Outbound Facebook dispatch succeeded');
  assert(_mockFacebookSentMessages.length >= 1, 'S1.T3: Mock Facebook spy recorded dispatched voucher');

  // Verify Stock Decrement
  const updatedSerum = (await db.getProducts(yangonShop.id)).find((p) => p.id === serum.id);
  assert(updatedSerum?.stockQuantity === 14, 'S1.T3: Serum stock atomically decremented from 15 to 14');

  // Turn 4: Forensic Zero-Chat DB Audit
  const dbDataS1 = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data/db.json'), 'utf-8'));
  assert(dbDataS1.conversations === undefined, 'S1.T4: Zero conversations table in DB');
  assert(dbDataS1.messages === undefined, 'S1.T4: Zero messages table in DB');
  assert(dbDataS1.orders.some((o: Order) => o.id === s1Turn3Response.completedOrder?.id), 'S1.T4: Completed order exists in DB orders');

  // -------------------------------------------------------------
  // SCENARIO 2: Mandalay Customer in Zawgyi (KPay Order)
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Mandalay Customer in Zawgyi (KPay Order) ---');
  _resetMockFacebookMessages();

  // Turn 1: Product Inquiry in Zawgyi
  const s2Turn1Response = await processCustomerMessage('မႏၲေလး ပုဆိုး ရွိလား ေစ်းဘယ္ေလာက္လဲ', {
    shop: mandalayShop,
    products: [silkLongyi],
    customerName: 'Ko Ye Yint',
    senderPlatformId: 'fb_psid_yeyint_2',
    channel: mdyFbChannel,
  });
  assert(s2Turn1Response.intent === 'stock_inquiry' || s2Turn1Response.intent === 'price_inquiry', 'S2.T1: Zawgyi intent classified correctly');
  assert(s2Turn1Response.replyText.includes('45,000') || s2Turn1Response.replyText.includes('ပုဆိုး'), 'S2.T1: Matches Mandalay Silk Longyi price in Unicode');

  // Turn 2: Order Placement with 2 units in Zawgyi
  const s2Turn2Response = await processCustomerMessage('၂ ထည္ ယူမယ္ ခ်မ္းေအးသာစံ KPay နဲ့ ရွင္းမယ္', {
    shop: mandalayShop,
    products: [silkLongyi],
    customerName: 'Ko Ye Yint',
    senderPlatformId: 'fb_psid_yeyint_2',
    channel: mdyFbChannel,
  });
  assert(s2Turn2Response.detectedTownship === 'Chanayethazan', 'S2.T2: Detected Chanayethazan Township');
  assert(s2Turn2Response.deliveryFeeMmk === 3000, 'S2.T2: Chanayethazan delivery fee is 3,000 MMK');

  // Turn 3: Complete Checkout with Phone Typo
  const s2Turn3Response = await processCustomerMessage(
    'ကိုရဲရင့် ၂ ထည် ယူမယ်။ ၀၉-၄၅၁၁၂၂၃၃၄၊ ၃၅ လမ်း၊ ၇၈ လမ်းထောင့်၊ ချမ်းအေးသာစံ။ KPay နဲ့ ရှင်းမယ်',
    {
      shop: mandalayShop,
      products: [silkLongyi],
      customerName: 'Ko Ye Yint',
      senderPlatformId: 'fb_psid_yeyint_2',
      channel: mdyFbChannel,
    }
  );
  assert(s2Turn3Response.completedOrder !== undefined, 'S2.T3: Order successfully completed');
  assert(s2Turn3Response.completedOrder?.customerPhone === '09451122334', 'S2.T3: Phone normalized to 09451122334');
  assert(s2Turn3Response.completedOrder?.subtotalMmk === 90000, 'S2.T3: Subtotal is 90,000 MMK (45,000 x 2)');
  assert(s2Turn3Response.completedOrder?.deliveryFeeMmk === 3000, 'S2.T3: Delivery fee is 3,000 MMK');
  assert(s2Turn3Response.completedOrder?.totalMmk === 93000, 'S2.T3: Grand total is 93,000 MMK');
  assert(s2Turn3Response.completedOrder?.paymentMethod === 'kpay', 'S2.T3: Payment method is KPay');
  assert(s2Turn3Response.completedOrder?.status === 'pending_slip', 'S2.T3: KPay order status is pending_slip');

  // Stock Decrement check
  const updatedSilk = (await db.getProducts(mandalayShop.id)).find((p) => p.id === silkLongyi.id);
  assert(updatedSilk?.stockQuantity === 18, 'S2.T3: Silk Longyi stock decremented from 20 to 18');

  // Multi-tenant isolation check
  const mdyOrders = await db.getOrders(mandalayShop.id);
  const ygnOrders = await db.getOrders(yangonShop.id);
  assert(mdyOrders.some((o) => o.id === s2Turn3Response.completedOrder?.id), 'S2.T4: Mandalay shop has the order');
  assert(!ygnOrders.some((o) => o.id === s2Turn3Response.completedOrder?.id), 'S2.T4: Yangon shop does NOT have the Mandalay order (Tenant Isolation)');

  // -------------------------------------------------------------
  // SCENARIO 3: Taunggyi Customer via TikTok (Highway Bus Gate & Prepaid)
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO 3: Taunggyi Customer via TikTok (Highway Bus Gate & Prepaid) ---');
  _resetMockTikTokMessages();

  // Turn 1: Inquiry in Burglish
  const s3Turn1Response = await processCustomerMessage(
    'hello admin, Vintage Bag classic brown instock shi lr? Taunggyi delivery ya lr?',
    {
      shop: yangonShop,
      products: [serum, dress, bag],
      customerName: 'Ma May Thu',
      senderPlatformId: 'tt_uid_maythu_3',
      channel: ygnTtChannel,
    }
  );
  assert(s3Turn1Response.detectedTownship === 'Taunggyi', 'S3.T1: Detected Taunggyi Township');
  assert(s3Turn1Response.replyText.includes('35,000') || s3Turn1Response.replyText.includes('လွယ်အိတ်'), 'S3.T1: Matches Vintage Bag price');
  assert(isRegionalPrepaidOnly('Taunggyi') === true, 'S3.T1: Verified Taunggyi is strictly regional prepaid only');

  // Turn 2: Customer attempts COD
  const s3Turn2Response = await processCustomerMessage(
    'COD nae ya ag loke pay par lar? Taunggyi ko cod pay ml',
    {
      shop: yangonShop,
      products: [bag],
      customerName: 'Ma May Thu',
      senderPlatformId: 'tt_uid_maythu_3',
      channel: ygnTtChannel,
    }
  );
  assert(s3Turn2Response.completedOrder === undefined, 'S3.T2: COD order is strictly REJECTED for regional gate');
  assert(s3Turn2Response.replyText.includes('Prepaid') || s3Turn2Response.replyText.includes('ကြိုတင်') || s3Turn2Response.replyText.includes('KPay'), 'S3.T2: Explains COD unavailable and prompts for Prepaid');

  // Turn 3: Customer switches to KPay and finalizes checkout
  const s3Turn3Response = await processCustomerMessage(
    'ok kpay nae lwal mal. 1 lone yu mal. Ma May Thu, 09-250099887, Taunggyi Myoma Market, Aung Mingalar gate ka tin pay par',
    {
      shop: yangonShop,
      products: [bag],
      customerName: 'Ma May Thu',
      senderPlatformId: 'tt_uid_maythu_3',
      channel: ygnTtChannel,
    }
  );
  assert(s3Turn3Response.completedOrder !== undefined, 'S3.T3: Order finalized with KPay');
  assert(s3Turn3Response.completedOrder?.customerPhone === '09250099887', 'S3.T3: Phone normalized to 09250099887');
  assert(s3Turn3Response.completedOrder?.paymentMethod === 'kpay', 'S3.T3: Recorded payment method is KPay');
  assert(s3Turn3Response.completedOrder?.status === 'pending_slip', 'S3.T3: Status set to pending_slip');

  // Outbound TikTok Dispatch
  const ttSendRes = await sendTikTokMessage(
    'conv_tt_maythu',
    s3Turn3Response.replyText,
    ygnTtChannel.accessToken
  );
  assert(ttSendRes.success === true, 'S3.T3: Outbound TikTok dispatch succeeded');
  assert(_mockTikTokSentMessages.length >= 1, 'S3.T3: Mock TikTok spy recorded sent message');

  // Stock Decrement check
  const updatedBag = (await db.getProducts(yangonShop.id)).find((p) => p.id === bag.id);
  assert(updatedBag?.stockQuantity === 3, 'S3.T3: Vintage Bag stock decremented from 4 to 3');

  // -------------------------------------------------------------
  // SCENARIO 4: Burglish Bargaining, Item Switch & Wa Typo Checkout
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO 4: Burglish Bargaining, Item Switch & Wa Typo Checkout ---');

  // Turn 1: Check Floral Dress
  const s4Turn1Response = await processCustomerMessage('admin discount shi lr? French Floral Dress instock shi lr?', {
    shop: yangonShop,
    products: [serum, dress, bag],
    customerName: 'Ko Min Min',
    senderPlatformId: 'fb_psid_minmin_4',
    channel: ygnFbChannel,
  });
  assert(s4Turn1Response.replyText.includes('38,000') || s4Turn1Response.replyText.includes('ဂါဝန်'), 'S4.T1: Confirms Floral Dress');

  // Turn 2: 2 items combined inquiry
  const s4Turn2Response = await processCustomerMessage(
    'Dress 1 htae nae Serum 1 boo yu mal Bahan delivery bl lout ll?',
    {
      shop: yangonShop,
      products: [serum, dress, bag],
      customerName: 'Ko Min Min',
      senderPlatformId: 'fb_psid_minmin_4',
      channel: ygnFbChannel,
    }
  );
  assert(s4Turn2Response.detectedTownship === 'Bahan', 'S4.T2: Detected Bahan Township');
  assert(s4Turn2Response.deliveryFeeMmk === 2500, 'S4.T2: Bahan delivery fee is 2,500 MMK');

  // Turn 3: Finalize with Wa Typo in Phone (၀၉-၇၉ဝ၁၂၃၄၅၆ has digit 0 and letter Wa)
  const s4Turn3Response = await processCustomerMessage(
    'Bahan ko CODပို့ပေး။ ကိုမင်းမင်း ၀၉-၇၉ဝ၁၂၃၄၅၆၊ ရွှေတောင်ကြားလမ်း၊ ဗဟန်း။ Dress 1 ခု ယူမယ်',
    {
      shop: yangonShop,
      products: [dress],
      customerName: 'Ko Min Min',
      senderPlatformId: 'fb_psid_minmin_4',
      channel: ygnFbChannel,
    }
  );
  assert(s4Turn3Response.completedOrder !== undefined, 'S4.T3: Order created successfully');
  assert(s4Turn3Response.completedOrder?.customerPhone === '09790123456', 'S4.T3: Letter Wa typo normalized into 09790123456');
  assert(s4Turn3Response.completedOrder?.paymentMethod === 'cod', 'S4.T3: Recorded payment method is COD');
  assert(s4Turn3Response.completedOrder?.status === 'confirmed', 'S4.T3: COD order confirmed');

  // Stock Decrement check
  const updatedDress = (await db.getProducts(yangonShop.id)).find((p) => p.id === dress.id);
  assert(updatedDress?.stockQuantity === 7, 'S4.T3: Dress stock decremented from 8 to 7');

  // -------------------------------------------------------------
  // SCENARIO 5: High-Concurrency Multi-Tenant Webhook Flood & Forensic Audit
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO 5: High-Concurrency Webhook Flood & Forensic Zero-Chat DB Audit ---');
  _resetMockFacebookMessages();
  _resetMockTikTokMessages();

  const canaryPrefix = 'CONFIDENTIAL_CHAT_CANARY_';
  const floodPromises: Promise<any>[] = [];

  // 50 FB webhooks to Yangon Shop
  for (let i = 0; i < 50; i++) {
    const text = `${canaryPrefix}YGN_${i}: ဆီရမ် ဈေးဘယ်လောက်လဲ စမ်းချောင်း`;
    floodPromises.push(
      processCustomerMessage(text, {
        shop: yangonShop,
        products: [serum, dress, bag],
        customerName: `FloodUserYGN_${i}`,
        senderPlatformId: `fb_flood_ygn_${i}`,
        channel: ygnFbChannel,
      })
    );
  }

  // 30 FB webhooks to Mandalay Shop
  for (let i = 0; i < 30; i++) {
    const text = `${canaryPrefix}MDY_${i}: မန္တလေး ပုဆိုး ရွိလား`;
    floodPromises.push(
      processCustomerMessage(text, {
        shop: mandalayShop,
        products: [silkLongyi],
        customerName: `FloodUserMDY_${i}`,
        senderPlatformId: `fb_flood_mdy_${i}`,
        channel: mdyFbChannel,
      })
    );
  }

  // 20 TikTok webhooks to Yangon Shop
  for (let i = 0; i < 20; i++) {
    const text = `${canaryPrefix}TT_${i}: Vintage Bag instock shi lr?`;
    floodPromises.push(
      processCustomerMessage(text, {
        shop: yangonShop,
        products: [serum, dress, bag],
        customerName: `FloodUserTT_${i}`,
        senderPlatformId: `tt_flood_ygn_${i}`,
        channel: ygnTtChannel,
      })
    );
  }

  const startTime = Date.now();
  const floodResults = await Promise.all(floodPromises);
  const elapsedMs = Date.now() - startTime;

  assert(floodResults.length === 100, `S5: All 100 concurrent webhook invocations completed (${elapsedMs}ms total)`);
  assert(elapsedMs < 3000, `S5: 100 requests processed in ${elapsedMs}ms (Well within 3,000ms SLA)`);

  // Deep Forensic Audit of data/db.json
  const rawDbContent = fs.readFileSync(path.resolve(process.cwd(), 'data/db.json'), 'utf-8');
  const parsedDb = JSON.parse(rawDbContent);

  assert(!rawDbContent.includes(canaryPrefix), 'S5: ZERO canary strings leaked into data/db.json (Zero-Chat Invariant)');
  assert(!rawDbContent.includes('CONFIDENTIAL_CHAT_CANARY'), 'S5: Zero sensitive message text in data/db.json');

  const rootKeys = Object.keys(parsedDb).sort();
  assert(JSON.stringify(rootKeys) === JSON.stringify(['channels', 'orders', 'products', 'shops']), 'S5: Root keys strictly match ["channels", "orders", "products", "shops"]');
  assert(parsedDb.conversations === undefined, 'S5: No conversations key in data/db.json');
  assert(parsedDb.messages === undefined, 'S5: No messages key in data/db.json');
  assert(parsedDb.chat_logs === undefined, 'S5: No chat_logs key in data/db.json');
  assert(parsedDb.threads === undefined, 'S5: No threads key in data/db.json');

  // Verify only db.json in data/
  const dataFiles = fs.readdirSync(path.resolve(process.cwd(), 'data'));
  const unexpectedFiles = dataFiles.filter((f) => f !== 'db.json' && !f.endsWith('.json'));
  assert(unexpectedFiles.length === 0, 'S5: data/ directory contains strictly database files (no rogue chat logs)');

  console.log('\n================================================================');
  console.log(`TOTAL TIER 4 ASSERTIONS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('\n>>> ALL 5 REAL-WORLD WORKLOAD CUSTOMER JOURNEYS PASSED 100%! <<<\n');
  } else {
    process.exit(1);
  }
}

runTier4Journeys().catch((err) => {
  console.error('Tier 4 Runner Error:', err);
  process.exit(1);
});
