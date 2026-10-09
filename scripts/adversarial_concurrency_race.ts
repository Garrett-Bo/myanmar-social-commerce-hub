/**
 * ADVERSARIAL CHALLENGE HARNESS: Concurrency, Inventory Depletion,
 * Negative Stock Prevention, Telegram Alerts & Forensic Zero-Chat DB Probe.
 *
 * Agent: challenger_m4_2
 * Role: Concurrency, Inventory Guard & Zero-Chat Storage Challenger
 */

import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';
import {
  processCustomerMessage,
  AgentContext,
} from '../src/lib/gemini-agent';
import {
  telegramAlertSpy,
  sendTelegramOrderAlert,
} from '../src/lib/telegram';
import { Shop, Product, Order, ChannelConnection } from '../src/types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: any, testName: string, detail?: string) {
  totalTests++;
  if (Boolean(condition)) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failedTests++;
  }
}

export async function runAdversarialChallenge() {
  console.log('================================================================');
  console.log('MILESTONE 4 ADVERSARIAL CHALLENGE HARNESS (challenger_m4_2)');
  console.log('Stress Testing Concurrency, Inventory Race, Alerts & Zero-Chat DB');
  console.log('================================================================\n');

  // Setup Test Shops
  const shopA: Shop = {
    id: 'shop-adv-a',
    name: 'Yangon Elite Fashion (Shop A)',
    ownerEmail: 'shop_a@test.com',
    telegramBotToken: 'mock_token_a',
    telegramChatId: '@shop_a_orders',
    kpayNumber: '09111111111',
    kpayName: 'Daw A',
    waveNumber: '09111111111',
    waveName: 'Daw A',
  };

  const shopB: Shop = {
    id: 'shop-adv-b',
    name: 'Mandalay Royal Gems (Shop B)',
    ownerEmail: 'shop_b@test.com',
    telegramBotToken: 'mock_token_b',
    telegramChatId: '@shop_b_orders',
    kpayNumber: '09222222222',
    kpayName: 'U B',
    waveNumber: '09222222222',
    waveName: 'U B',
  };

  await db.saveShop(shopA);
  await db.saveShop(shopB);

  // Setup Test Products
  const prodA: Product = {
    id: 'prod-adv-a1',
    shopId: shopA.id,
    sku: 'SKU-ADV-A1',
    nameMm: 'သဘာဝ ရှားစောင်းဂျယ် (Limited)',
    nameEn: 'Natural Aloe Vera Gel',
    category: 'Skincare',
    priceMmk: 15000,
    stockQuantity: 5,
    imageUrl: 'https://example.com/aloe.jpg',
    isAvailable: true,
  };

  const prodB: Product = {
    id: 'prod-adv-b1',
    shopId: shopB.id,
    sku: 'SKU-ADV-B1',
    nameMm: 'ကျောက်စိမ်း လက်ကောက် (Mandalay Jade)',
    nameEn: 'Authentic Jade Bracelet',
    category: 'Jewelry',
    priceMmk: 80000,
    stockQuantity: 2,
    imageUrl: 'https://example.com/jade.jpg',
    isAvailable: true,
  };

  await db.saveProduct(shopA.id, prodA);
  await db.saveProduct(shopB.id, prodB);

  // ============================================================================
  // SUITE 1: Sequential Inventory Depletion & Negative Stock Prevention
  // ============================================================================
  console.log('--- SUITE 1: Sequential Inventory Depletion & Negative Stock Prevention ---');
  {
    // Check initial stock is 5
    const products0 = await db.getProducts(shopA.id);
    const item0 = products0.find((p) => p.id === prodA.id)!;
    assert(item0.stockQuantity === 5, 'Initial stock for Shop A product is exactly 5');

    // Step 1: Order 3 units (5 - 3 = 2 remaining)
    const ctx1: AgentContext = {
      shop: shopA,
      products: await db.getProducts(shopA.id),
      customerName: 'Customer Alpha',
    };
    const res1 = await processCustomerMessage(
      'သဘာဝ ရှားစောင်းဂျယ် ၃ ဘူး ဝယ်မယ်။ အမည် Customer Alpha၊ ဖုန်း ၀၉-၁၂၃-၄၅၆-၇၈၉၊ စမ်းချောင်း၊ COD',
      ctx1
    );
    assert(res1.completedOrder !== undefined, 'Order 1 (3 units) completed successfully');
    assert(res1.completedOrder?.items[0].quantity === 3, 'Order 1 records quantity 3');

    const products1 = await db.getProducts(shopA.id);
    const item1 = products1.find((p) => p.id === prodA.id)!;
    assert(item1.stockQuantity === 2, `Stock decremented from 5 to 2 (actual: ${item1.stockQuantity})`);

    // Step 2: Attempt to order 3 units when only 2 remain (deficit condition)
    const ctx2: AgentContext = {
      shop: shopA,
      products: await db.getProducts(shopA.id),
      customerName: 'Customer Beta',
    };
    const res2 = await processCustomerMessage(
      'သဘာဝ ရှားစောင်းဂျယ် ၃ ဘူး ဝယ်မယ်။ အမည် Customer Beta၊ ဖုန်း ၀၉-၁၂၃-၄၅၆-၇၈၉၊ စမ်းချောင်း၊ COD',
      ctx2
    );
    assert(res2.completedOrder === undefined, 'Order 2 aborted: requested 3 units > available 2 units');
    assert(
      res2.replyTextMm.includes('မလုံလောက်ပါရှင့်') || res2.replyTextMm.includes('လက်ကျန်'),
      'Polite Burmese deficit notice mentions insufficient stock'
    );

    const products2 = await db.getProducts(shopA.id);
    const item2 = products2.find((p) => p.id === prodA.id)!;
    assert(item2.stockQuantity === 2, 'Stock remains unchanged at 2 after rejected order');

    // Step 3: Order exact remaining 2 units (2 - 2 = 0 remaining)
    const ctx3: AgentContext = {
      shop: shopA,
      products: await db.getProducts(shopA.id),
      customerName: 'Customer Gamma',
    };
    const res3 = await processCustomerMessage(
      'သဘာဝ ရှားစောင်းဂျယ် ၂ ဘူး ဝယ်မယ်။ အမည် Customer Gamma၊ ဖုန်း ၀၉-၁၂၃-၄၅၆-၇၈၉၊ စမ်းချောင်း၊ COD',
      ctx3
    );
    assert(res3.completedOrder !== undefined, 'Order 3 (2 units) completed successfully, exhausting stock');

    const products3 = await db.getProducts(shopA.id);
    const item3 = products3.find((p) => p.id === prodA.id)!;
    assert(item3.stockQuantity === 0, 'Stock reached exactly 0');
    assert(item3.isAvailable === false, 'Product marked as isAvailable = false when stock is 0');

    // Step 4: Attempt to order 1 unit when stock is 0
    const ctx4: AgentContext = {
      shop: shopA,
      products: await db.getProducts(shopA.id),
      customerName: 'Customer Delta',
    };
    const res4 = await processCustomerMessage(
      'သဘာဝ ရှားစောင်းဂျယ် ၁ ဘူး ဝယ်မယ်။ အမည် Customer Delta၊ ဖုန်း ၀၉-၁၂၃-၄၅၆-၇၈၉၊ စမ်းချောင်း၊ COD',
      ctx4
    );
    assert(res4.completedOrder === undefined, 'Order 4 strictly rejected when stock is 0');
    assert(
      res4.replyTextMm.includes('လက်ကျန် (0) ခုသာ ရှိပါသဖြင့်') || res4.replyTextMm.includes('မလုံလောက်ပါ'),
      'Agent returns explicit Burmese notice that stock is 0 units'
    );

    const products4 = await db.getProducts(shopA.id);
    const item4 = products4.find((p) => p.id === prodA.id)!;
    assert(item4.stockQuantity === 0, 'Stock remains strictly 0 (never drops to -1)');
    assert(item4.stockQuantity >= 0, 'Invariant stockQuantity >= 0 strictly holds');

    // Step 5: Direct DB updateProductStock stress: attempt massive negative decrement on 0 stock
    await db.updateProductStock(shopA.id, prodA.id, -100);
    const products5 = await db.getProducts(shopA.id);
    const item5 = products5.find((p) => p.id === prodA.id)!;
    assert(item5.stockQuantity === 0, 'Direct db.updateProductStock(-100) on 0 stock clamps to 0');
    assert(item5.stockQuantity >= 0, 'Negative stock strictly prevented at DB level');
  }

  // ============================================================================
  // SUITE 2: Concurrent Checkout Stress & Inventory Race Condition Probe
  // ============================================================================
  console.log('\n--- SUITE 2: Concurrent Checkout Stress & Inventory Race Condition Probe ---');
  {
    // Setup a new fresh product with stock = 3
    const raceProd: Product = {
      id: 'prod-race-stress',
      shopId: shopA.id,
      sku: 'SKU-SERUM-RACE',
      nameMm: 'ဗီတာမင်စီ ဆီရမ် (Race Edition)',
      nameEn: 'Vitamin C Serum Race Edition',
      category: 'Skincare',
      priceMmk: 20000,
      stockQuantity: 3,
      imageUrl: 'https://example.com/race.jpg',
      isAvailable: true,
    };
    await db.saveProduct(shopA.id, raceProd);

    telegramAlertSpy.reset();
    const initialOrdersCount = (await db.getOrders(shopA.id)).length;

    // Launch 15 concurrent checkout attempts in parallel via Promise.all
    // Each customer attempts to buy 1 unit of the product
    const concurrentAttempts = 15;
    const promises = Array.from({ length: concurrentAttempts }, (_, i) => {
      return (async () => {
        const freshProducts = await db.getProducts(shopA.id);
        const ctx: AgentContext = {
          shop: shopA,
          products: freshProducts,
          customerName: `Concurrent Buyer ${i + 1}`,
        };
        return processCustomerMessage(
          `ဗီတာမင်စီ ဆီရမ် ၁ ဘူး ဝယ်မယ်။ အမည် Concurrent Buyer ${i + 1}၊ ဖုန်း ၀၉-၇၉၈-၇၆၅-၄၃၂၊ စမ်းချောင်း၊ COD`,
          ctx
        );
      })();
    });

    const results = await Promise.all(promises);

    const postRaceProducts = await db.getProducts(shopA.id);
    const raceProdAfter = postRaceProducts.find((p) => p.id === raceProd.id)!;
    const finalStock = raceProdAfter.stockQuantity;

    assert(finalStock >= 0, `Race condition invariant: final stock (${finalStock}) is >= 0`);
    assert(finalStock === 0, `All initial 3 units were depleted: final stock is ${finalStock}`);

    const confirmedResults = results.filter((r) => r.completedOrder !== undefined);
    const rejectedResults = results.filter((r) => r.completedOrder === undefined);

    console.log(`    [Empirical Telemetry] Concurrent Attempts: ${concurrentAttempts}`);
    console.log(`    [Empirical Telemetry] Initial Stock: 3`);
    console.log(`    [Empirical Telemetry] Confirmed Orders: ${confirmedResults.length}`);
    console.log(`    [Empirical Telemetry] Rejected Attempts: ${rejectedResults.length}`);
    console.log(`    [Empirical Telemetry] Final Stock in DB: ${finalStock}`);
    if (rejectedResults.length > 0) {
      console.log(`    [Sample Rejection Intent]: ${rejectedResults[0].intent}`);
      console.log(`    [Sample Rejection Reply]: ${rejectedResults[0].replyTextMm}`);
    }

    // Analyze race behavior:
    // In stateless single-event-loop Node without mutex locks,
    // if all promises read snapshot stock = 3 before atomic decrement completes,
    // does DB clamp prevent negative stock?
    assert(finalStock >= 0, 'Database level non-negative stock clamping strictly holds');

    // Verify all created orders exist in db.orders
    const postOrders = await db.getOrders(shopA.id);
    const newOrdersCount = postOrders.length - initialOrdersCount;
    assert(newOrdersCount === confirmedResults.length, `New orders created in DB (${newOrdersCount}) matches confirmed results (${confirmedResults.length})`);

    // Verify telegramAlertSpy captured alerts for all confirmed orders with exact Order IDs
    assert(
      telegramAlertSpy.count() === confirmedResults.length,
      `telegramAlertSpy captured alerts for all ${confirmedResults.length} confirmed orders (count: ${telegramAlertSpy.count()})`
    );

    let allOrderIdsMatchedInSpy = true;
    for (const res of confirmedResults) {
      const orderId = res.completedOrder!.id;
      const log = telegramAlertSpy.getByOrderId(orderId);
      if (!log || log.orderId !== orderId) {
        allOrderIdsMatchedInSpy = false;
      }
    }
    assert(
      allOrderIdsMatchedInSpy,
      'telegramAlertSpy logs contain exact Order IDs for 100% of confirmed orders'
    );
  }

  // ============================================================================
  // SUITE 3: Telegram Alert Exact Tracking & Notification Integrity
  // ============================================================================
  console.log('\n--- SUITE 3: Telegram Alert Exact Tracking & Notification Integrity ---');
  {
    telegramAlertSpy.reset();
    assert(telegramAlertSpy.count() === 0, 'telegramAlertSpy reset to 0');

    // 1. Successful order on Shop A
    const orderA: Order = {
      id: 'ord-tg-verif-a1',
      shopId: shopA.id,
      platform: 'facebook',
      customerPlatformId: 'fb-user-111',
      customerName: 'Daw Mya Mya',
      customerPhone: '09123456789',
      township: 'Sanchaung',
      fullAddress: 'ဗဟိုလမ်း၊ အမှတ် ၄၅',
      items: [
        {
          productId: prodA.id,
          name: prodA.nameMm,
          quantity: 2,
          priceMmk: prodA.priceMmk,
        },
      ],
      subtotalMmk: 30000,
      deliveryFeeMmk: 2500,
      totalMmk: 32500,
      paymentMethod: 'cod',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    const alertA = await sendTelegramOrderAlert(shopA, orderA);
    assert(alertA.success === true, 'Telegram alert dispatched successfully for Shop A order');

    // 2. Successful order on Shop B
    const orderB: Order = {
      id: 'ord-tg-verif-b1',
      shopId: shopB.id,
      platform: 'tiktok',
      customerPlatformId: 'tt-user-222',
      customerName: 'Ko Kyaw Kyaw',
      customerPhone: '09987654321',
      township: 'Chanayethazan',
      fullAddress: '၇၈ လမ်း၊ ၃၁x၃၂ ကြား',
      items: [
        {
          productId: prodB.id,
          name: prodB.nameMm,
          quantity: 1,
          priceMmk: prodB.priceMmk,
        },
      ],
      subtotalMmk: 80000,
      deliveryFeeMmk: 3000,
      totalMmk: 83000,
      paymentMethod: 'kpay',
      status: 'pending_slip',
      createdAt: new Date().toISOString(),
    };

    const alertB = await sendTelegramOrderAlert(shopB, orderB);
    assert(alertB.success === true, 'Telegram alert dispatched successfully for Shop B order');

    // Check spy captured both
    assert(telegramAlertSpy.count() === 2, `telegramAlertSpy captured exactly 2 alerts (count: ${telegramAlertSpy.count()})`);

    const logA = telegramAlertSpy.getByOrderId('ord-tg-verif-a1');
    assert(logA !== undefined, 'telegramAlertSpy found log for order ord-tg-verif-a1');
    assert(logA?.shopId === shopA.id, 'Alert A logged correct shopId');
    assert(logA?.shopName === shopA.name, 'Alert A logged correct shopName');
    assert(logA?.text.includes('ord-tg-verif-a1'), 'Alert A text contains Order ID');
    assert(logA?.text.includes('09123456789'), 'Alert A text contains customer phone');
    assert(logA?.text.includes('32,500 MMK'), 'Alert A text contains total MMK');

    const logB = telegramAlertSpy.getByOrderId('ord-tg-verif-b1');
    assert(logB !== undefined, 'telegramAlertSpy found log for order ord-tg-verif-b1');
    assert(logB?.shopId === shopB.id, 'Alert B logged correct shopId');
    assert(logB?.shopName === shopB.name, 'Alert B logged correct shopName');
    assert(logB?.text.includes('ord-tg-verif-b1'), 'Alert B text contains Order ID');
    assert(logB?.text.includes('09987654321'), 'Alert B text contains customer phone');
    assert(logB?.text.includes('83,000 MMK'), 'Alert B text contains total MMK');

    // 3. Rejected Orders (Insufficient stock & COD violation) must NOT generate alerts
    const alertsBeforeFailed = telegramAlertSpy.count();

    // Deficit checkout attempt
    const ctxDeficit: AgentContext = {
      shop: shopA,
      products: await db.getProducts(shopA.id),
      customerName: 'Fail Buyer 1',
    };
    await processCustomerMessage(
      'သဘာဝ ရှားစောင်းဂျယ် ၁၀၀ ဘူး ဝယ်မယ်။ အမည် Fail 1၊ ဖုန်း ၀၉-၁၂၃-၄၅၆-၇၈၉၊ စမ်းချောင်း၊ COD',
      ctxDeficit
    );

    // Regional COD violation checkout attempt
    const ctxCodViolation: AgentContext = {
      shop: shopA,
      products: await db.getProducts(shopA.id),
      customerName: 'Fail Buyer 2',
    };
    await processCustomerMessage(
      'သဘာဝ ရှားစောင်းဂျယ် ၁ ဘူး ဝယ်မယ်။ အမည် Fail 2၊ ဖုန်း ၀၉-၁၂၃-၄၅၆-၇၈၉၊ တောင်ကြီး၊ COD',
      ctxCodViolation
    );

    const alertsAfterFailed = telegramAlertSpy.count();
    assert(
      alertsAfterFailed === alertsBeforeFailed,
      `No Telegram alerts sent for rejected orders (before: ${alertsBeforeFailed}, after: ${alertsAfterFailed})`
    );
  }

  // ============================================================================
  // SUITE 4: High-Volume Traffic Simulation & Deep Forensic Zero-Chat DB Probe
  // ============================================================================
  console.log('\n--- SUITE 4: High-Volume Traffic Simulation & Deep Forensic Zero-Chat DB Probe ---');
  {
    console.log('    Simulating 200+ customer messages across Facebook and TikTok channels...');
    const simulatedQueries = [
      'မင်္ဂလာပါရှင့်',
      'mingalarpar',
      'ဟဲလို ပစ္စည်းဈေးလေး သိချင်လို့ပါ',
      'bl lout ll',
      'instock shi lr',
      'ပစ္စည်းရှိသေးလား',
      'စမ်းချောင်း ပို့ခ ဘယ်လောက်လဲ',
      'dali charge bl lout ll',
      'kpay ရလား',
      'kpay ya lr',
      'wave နဲ့ ရှင်းလို့ရလား',
      'တောင်ကြီး ပို့ပေးလား',
      'မန္တလေး ပို့ခ ဘယ်လောက်လဲ',
      'ကားဂိတ် ချပေးလား',
      'လူနဲ့ပြောချင်တယ်',
      'admin နဲ့ စကားပြောမယ်',
      'discount ပေးလား',
      'လျှော့ပေးပါလား',
      'အရမ်းကြိုက်တယ်',
      'စလစ် ပို့ထားပါတယ်',
    ];

    const currentShopAProducts = await db.getProducts(shopA.id);

    // Fire 200 diverse customer messages through the sales agent
    const messageVolume = 200;
    for (let i = 0; i < messageVolume; i++) {
      const q = simulatedQueries[i % simulatedQueries.length];
      const ctx: AgentContext = {
        shop: shopA,
        products: currentShopAProducts,
        customerName: `Simulated User ${i + 1}`,
        senderPlatformId: `fb_sim_user_${i + 1}`,
      };
      await processCustomerMessage(q, ctx);
    }

    console.log(`    Successfully processed ${messageVolume} customer interactions without errors.`);

    // Force disk persistence check
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    assert(fs.existsSync(dbPath), 'data/db.json exists on disk after 200+ messages');

    const dbRaw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const rootKeys = Object.keys(dbRaw).sort();
    const expectedKeys = ['channels', 'orders', 'products', 'shops'].sort();

    assert(
      JSON.stringify(rootKeys) === JSON.stringify(expectedKeys),
      'After 200+ messages, root keys strictly match ["channels", "orders", "products", "shops"]'
    );
    assert(rootKeys.length === 4, `Database has exactly 4 root collections (found ${rootKeys.length})`);

    // Check for any forbidden chat keys
    const forbiddenKeys = [
      'conversations',
      'messages',
      'chat_history',
      'chat_logs',
      'threads',
      'chats',
      'inbox',
      'dialogs',
      'transcripts',
    ];

    for (const key of forbiddenKeys) {
      assert(!(key in dbRaw), `data/db.json contains NO "${key}" collection`);
    }

    // Inspect every order in data/db.json to verify stateless customer referencing
    let allOrdersStateless = true;
    let anyChatLeakedInOrders = false;

    for (const order of dbRaw.orders) {
      if (
        'conversationId' in order ||
        'conversation_id' in order ||
        'threadId' in order ||
        'messages' in order ||
        'chat' in order
      ) {
        anyChatLeakedInOrders = true;
      }
      if (!order.customerPlatformId || !order.platform) {
        allOrdersStateless = false;
      }
    }

    assert(
      !anyChatLeakedInOrders,
      'Every order in data/db.json has 0 conversationId, threadId, or chat references'
    );
    assert(
      allOrdersStateless,
      'Every order in data/db.json uses stateless customerPlatformId and platform attributes'
    );

    // Verify in-memory MultiTenantDB instance purity
    assert((db as any).messages === undefined, 'db.messages is strictly undefined');
    assert((db as any).conversations === undefined, 'db.conversations is strictly undefined');
    assert((db as any).chat_history === undefined, 'db.chat_history is strictly undefined');
  }

  // ============================================================================
  // SUITE 5: Multi-Tenant Data Isolation Under High Order Volume
  // ============================================================================
  console.log('\n--- SUITE 5: Multi-Tenant Data Isolation Under High Order Volume ---');
  {
    const ordersA = await db.getOrders(shopA.id);
    const ordersB = await db.getOrders(shopB.id);

    // Verify Shop A orders do NOT contain Shop B orders
    const aOrderIds = new Set(ordersA.map((o) => o.id));
    const bOrderIds = new Set(ordersB.map((o) => o.id));

    let intersectionCount = 0;
    for (const id of aOrderIds) {
      if (bOrderIds.has(id)) intersectionCount++;
    }

    assert(intersectionCount === 0, 'Zero order ID overlap between Shop A and Shop B');
    assert(ordersA.every((o) => o.shopId === shopA.id), 'All orders in Shop A strictly belong to shopA.id');
    assert(ordersB.every((o) => o.shopId === shopB.id), 'All orders in Shop B strictly belong to shopB.id');

    // Products isolation
    const prodsA = await db.getProducts(shopA.id);
    const prodsB = await db.getProducts(shopB.id);

    assert(prodsA.every((p) => p.shopId === shopA.id), 'All products in Shop A belong to shopA.id');
    assert(prodsB.every((p) => p.shopId === shopB.id), 'All products in Shop B belong to shopB.id');
  }

  console.log('\n================================================================');
  console.log(`TOTAL ADVERSARIAL CHALLENGE ASSERTIONS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('================================================================');

  if (failedTests === 0) {
    console.log('\n>>> ADVERSARIAL CHALLENGE VERDICT: ALL ASSERTIONS PASSED CLEANLY! <<<\n');
  } else {
    console.error(`\n>>> ADVERSARIAL CHALLENGE VERDICT: ${failedTests} ASSERTIONS FAILED <<<\n`);
    process.exitCode = 1;
  }

  return { totalTests, passedTests, failedTests };
}

if (require.main === module || !process.env.VITEST) {
  runAdversarialChallenge().catch((err) => {
    console.error('Adversarial challenge execution error:', err);
    process.exit(1);
  });
}
