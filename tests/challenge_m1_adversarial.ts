import fs from 'fs';
import path from 'path';
import { MultiTenantDB } from '../src/lib/db';
import { Product, Order, ChannelConnection, Shop, OrderStatus } from '../src/types';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: false, error: err.message || String(err), durationMs });
    console.error(`  [FAIL] ${name} (${durationMs}ms): ${err.message || String(err)}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function cleanupFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }
  // Also clean up any lingering tmp files
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.startsWith(`${base}.tmp.`)) {
        try {
          fs.unlinkSync(path.join(dir, f));
        } catch {}
      }
    }
  }
}

async function main() {
  console.log('================================================================');
  console.log('CHALLENGER M1: EMPIRICAL ADVERSARIAL STRESS TEST SUITE');
  console.log('================================================================\n');

  const testDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // ============================================================================
  // SUITE 1: 50+ RAPID CONCURRENT ASYNCHRONOUS OPERATIONS
  // ============================================================================
  console.log('--- SUITE 1: Concurrency & High-Throughput Stress Testing ---');
  const concurrencyDbPath = path.join(testDir, 'test_m1_adv_concurrency.json');
  cleanupFile(concurrencyDbPath);

  const concurrencyDb = new MultiTenantDB(concurrencyDbPath);

  await runTest('Concurrency', '60 concurrent createOrder operations on same tenant', async () => {
    const shopId = 'shop-yangon-01';
    const initialOrders = await concurrencyDb.getOrders(shopId);
    const initialCount = initialOrders.length;

    const promises: Promise<Order>[] = [];
    const ORDER_COUNT = 60;

    for (let i = 0; i < ORDER_COUNT; i++) {
      promises.push(
        concurrencyDb.createOrder(shopId, {
          platform: 'facebook',
          customerPlatformId: `concurrent_user_${i}`,
          customerName: `Concurrent Customer ${i}`,
          customerPhone: `0998877${String(i).padStart(4, '0')}`,
          township: 'Hlaing',
          fullAddress: `Hlaing Ward ${i}, Yangon`,
          items: [{ productId: 'prod-ygn-01', name: 'Product', quantity: 1, priceMmk: 10000 }],
          subtotalMmk: 10000,
          deliveryFeeMmk: 2500,
          totalMmk: 12500,
          paymentMethod: 'cod',
          status: 'pending_approval',
        })
      );
    }

    const createdOrders = await Promise.all(promises);
    assert(createdOrders.length === ORDER_COUNT, `Created ${createdOrders.length}/${ORDER_COUNT} orders`);

    // Verify all order IDs are unique
    const uniqueIds = new Set(createdOrders.map((o) => o.id));
    assert(uniqueIds.size === ORDER_COUNT, `Expected ${ORDER_COUNT} unique order IDs, got ${uniqueIds.size}`);

    // Verify memory list matches
    const ordersInDb = await concurrencyDb.getOrders(shopId);
    assert(ordersInDb.length === initialCount + ORDER_COUNT, `Memory orders count mismatch: got ${ordersInDb.length}, expected ${initialCount + ORDER_COUNT}`);

    // Verify disk content is valid JSON and has all orders
    const rawOnDisk = JSON.parse(fs.readFileSync(concurrencyDbPath, 'utf-8'));
    const diskOrdersForShop = rawOnDisk.orders.filter((o: any) => o.shopId === shopId);
    assert(diskOrdersForShop.length === initialCount + ORDER_COUNT, `Disk orders count mismatch: got ${diskOrdersForShop.length}`);

    // Verify persistence across new instance
    const reloadedDb = new MultiTenantDB(concurrencyDbPath);
    const reloadedOrders = await reloadedDb.getOrders(shopId);
    assert(reloadedOrders.length === initialCount + ORDER_COUNT, `Reloaded instance orders count mismatch: got ${reloadedOrders.length}`);
  });

  await runTest('Concurrency', '60 concurrent saveProduct operations across 3 distinct shops', async () => {
    const shops = ['shop-yangon-01', 'shop-mdy-02', 'shop-npt-03'];
    const promises: Promise<Product>[] = [];

    // 20 products per shop = 60 total concurrent writes
    for (let i = 0; i < 60; i++) {
      const shopId = shops[i % shops.length];
      promises.push(
        concurrencyDb.saveProduct(shopId, {
          id: `prod-stress-${i}`,
          sku: `SKU-STRESS-${i}`,
          nameMm: `စမ်းသပ်ကုန်ပစ္စည်း ${i}`,
          nameEn: `Stress Test Product ${i}`,
          category: 'Stress Test',
          priceMmk: 5000 + i * 100,
          stockQuantity: 10 + i,
          imageUrl: 'https://example.com/img.jpg',
          isAvailable: true,
        })
      );
    }

    const results = await Promise.all(promises);
    assert(results.length === 60, 'All 60 product writes completed');

    // Verify tenant isolation
    for (const shopId of shops) {
      const prods = await concurrencyDb.getProducts(shopId);
      assert(prods.every((p) => p.shopId === shopId), `Tenant leakage: products for ${shopId} have foreign shopId`);
    }

    // Verify persistence on disk
    const rawDisk = JSON.parse(fs.readFileSync(concurrencyDbPath, 'utf-8'));
    const stressProdsOnDisk = rawDisk.products.filter((p: any) => p.id.startsWith('prod-stress-'));
    assert(stressProdsOnDisk.length === 60, `Disk contains ${stressProdsOnDisk.length}/60 stress products`);
  });

  await runTest('Concurrency', '50 concurrent stock mutations on high-contention single product', async () => {
    const shopId = 'shop-yangon-01';
    const highContentionProduct: Product = {
      id: 'prod-contention-01',
      shopId,
      sku: 'SKU-CONTENTION-01',
      nameMm: 'အပြိုင်ဝယ်ယူမှု စမ်းသပ်ကုန်ပစ္စည်း',
      nameEn: 'High Contention Product',
      category: 'Contention',
      priceMmk: 25000,
      stockQuantity: 100, // Starting with 100
      imageUrl: 'https://example.com/c.jpg',
      isAvailable: true,
    };
    await concurrencyDb.saveProduct(shopId, highContentionProduct);

    // 50 concurrent mutations:
    // 30 decrements of -1 (-30 total)
    // 20 increments of +2 (+40 total)
    // Mathematical final stock = 100 - 30 + 40 = 110
    const ops: Promise<Product | null>[] = [];
    for (let i = 0; i < 30; i++) {
      ops.push(concurrencyDb.updateProductStock(shopId, highContentionProduct.id, -1));
    }
    for (let i = 0; i < 20; i++) {
      ops.push(concurrencyDb.updateProductStock(shopId, highContentionProduct.id, 2));
    }

    await Promise.all(ops);

    const products = await concurrencyDb.getProducts(shopId);
    const finalProd = products.find((p) => p.id === highContentionProduct.id);
    assert(finalProd !== undefined, 'Contention product must exist');
    assert(finalProd!.stockQuantity === 110, `Expected exact final stock 110, got ${finalProd!.stockQuantity}`);

    // Verify disk content
    const reloaded = new MultiTenantDB(concurrencyDbPath);
    const reloadedProds = await reloaded.getProducts(shopId);
    const reloadedFinal = reloadedProds.find((p) => p.id === highContentionProduct.id);
    assert(reloadedFinal!.stockQuantity === 110, `Reloaded instance stock mismatch: got ${reloadedFinal!.stockQuantity}, expected 110`);
  });

  await runTest('Concurrency', '75 mixed concurrent operations (shops, products, channels, orders, stocks)', async () => {
    const mixedOps: Promise<any>[] = [];

    for (let i = 0; i < 15; i++) {
      // 15 shop saves
      mixedOps.push(
        concurrencyDb.saveShop({
          id: `shop-mixed-${i}`,
          name: `Mixed Shop ${i}`,
          ownerEmail: `mixed_${i}@shop.com`,
          kpayNumber: '09123456789',
          kpayName: 'Seller',
          waveNumber: '09123456789',
          waveName: 'Seller',
        })
      );
      // 15 channel saves
      mixedOps.push(
        concurrencyDb.saveChannelConnection(`shop-mixed-${i}`, {
          id: `ch-mixed-${i}`,
          platform: 'facebook',
          accountName: `Page ${i}`,
          pageId: `page-mixed-${i}`,
          accessToken: `token-${i}`,
          isActive: true,
        })
      );
      // 15 product saves
      mixedOps.push(
        concurrencyDb.saveProduct(`shop-mixed-${i}`, {
          id: `prod-mixed-${i}`,
          sku: `SKU-MIX-${i}`,
          nameMm: `ပစ္စည်း ${i}`,
          nameEn: `Product ${i}`,
          category: 'General',
          priceMmk: 1000 * (i + 1),
          stockQuantity: 50,
          imageUrl: '',
          isAvailable: true,
        })
      );
      // 15 order creations
      mixedOps.push(
        concurrencyDb.createOrder(`shop-mixed-${i}`, {
          platform: 'facebook',
          customerPlatformId: `user-mix-${i}`,
          customerName: `Customer ${i}`,
          customerPhone: '0911223344',
          township: 'Kamayut',
          fullAddress: 'Address',
          items: [{ productId: `prod-mixed-${i}`, name: 'Item', quantity: 1, priceMmk: 1000 }],
          subtotalMmk: 1000,
          deliveryFeeMmk: 2500,
          totalMmk: 3500,
          paymentMethod: 'cod',
          status: 'pending_approval',
        })
      );
      // 15 stock updates
      mixedOps.push(
        concurrencyDb.updateProductStock(`shop-mixed-${i}`, `prod-mixed-${i}`, -5)
      );
    }

    assert(mixedOps.length === 75, `Expected 75 operations, prepared ${mixedOps.length}`);
    await Promise.all(mixedOps);

    // Verify all shops exist
    const allShops = await concurrencyDb.listShops();
    for (let i = 0; i < 15; i++) {
      assert(allShops.some((s) => s.id === `shop-mixed-${i}`), `Mixed shop ${i} missing`);
    }

    // Verify disk readability
    const diskData = JSON.parse(fs.readFileSync(concurrencyDbPath, 'utf-8'));
    assert(Array.isArray(diskData.shops), 'Disk shops is array');
    assert(Array.isArray(diskData.products), 'Disk products is array');
    assert(Array.isArray(diskData.channels), 'Disk channels is array');
    assert(Array.isArray(diskData.orders), 'Disk orders is array');
  });

  cleanupFile(concurrencyDbPath);

  // ============================================================================
  // SUITE 2: NEGATIVE STOCK PROTECTION & CLAMPING
  // ============================================================================
  console.log('\n--- SUITE 2: Negative Stock Protection & Clamping ---');
  const stockDbPath = path.join(testDir, 'test_m1_adv_stock.json');
  cleanupFile(stockDbPath);
  const stockDb = new MultiTenantDB(stockDbPath);

  await runTest('Stock Protection', 'Delta decrement larger than available stock clamps to 0', async () => {
    const shopId = 'shop-yangon-01';
    const prod: Product = {
      id: 'prod-clamp-01',
      shopId,
      sku: 'SKU-CLAMP-01',
      nameMm: 'ကန့်သတ်စမ်းသပ် ပစ္စည်း ၁',
      nameEn: 'Clamp Test 1',
      category: 'General',
      priceMmk: 15000,
      stockQuantity: 10,
      imageUrl: '',
      isAvailable: true,
    };
    await stockDb.saveProduct(shopId, prod);

    // Decrement by -25 (10 - 25 = -15 -> MUST clamp to 0)
    const result = await stockDb.updateProductStock(shopId, prod.id, -25);
    assert(result !== null, 'Product must be returned');
    assert(result!.stockQuantity === 0, `Expected stock 0, got ${result!.stockQuantity}`);
    assert(result!.isAvailable === false, `Expected isAvailable false when stock 0, got ${result!.isAvailable}`);

    // Reinstantiate and verify disk persistence
    const reloaded = new MultiTenantDB(stockDbPath);
    const reloadedProds = await reloaded.getProducts(shopId);
    const p = reloadedProds.find((x) => x.id === prod.id);
    assert(p!.stockQuantity === 0, `Reloaded stock must be 0, got ${p!.stockQuantity}`);
    assert(p!.isAvailable === false, 'Reloaded isAvailable must be false');
  });

  await runTest('Stock Protection', 'Decrement when stock is already 0 remains 0', async () => {
    const shopId = 'shop-yangon-01';
    const prodId = 'prod-clamp-01'; // currently 0
    const result = await stockDb.updateProductStock(shopId, prodId, -5);
    assert(result !== null, 'Product must be returned');
    assert(result!.stockQuantity === 0, `Expected stock 0, got ${result!.stockQuantity}`);
    assert(result!.isAvailable === false, 'Expected isAvailable false');
  });

  await runTest('Stock Protection', 'Extreme negative delta (-Number.MAX_SAFE_INTEGER) clamps safely to 0', async () => {
    const shopId = 'shop-yangon-01';
    const prod: Product = {
      id: 'prod-clamp-extreme',
      shopId,
      sku: 'SKU-EXTREME-01',
      nameMm: 'အစွန်းရောက် ကန့်သတ်စမ်းသပ် ပစ္စည်း',
      nameEn: 'Extreme Clamp Test',
      category: 'General',
      priceMmk: 50000,
      stockQuantity: 1000,
      imageUrl: '',
      isAvailable: true,
    };
    await stockDb.saveProduct(shopId, prod);

    const result = await stockDb.updateProductStock(shopId, prod.id, -Number.MAX_SAFE_INTEGER);
    assert(result !== null, 'Product must be returned');
    assert(result!.stockQuantity === 0, `Expected stock 0, got ${result!.stockQuantity}`);
    assert(result!.isAvailable === false, 'Expected isAvailable false');
  });

  await runTest('Stock Protection', '50 concurrent decrements draining stock past 0 clamps at exactly 0', async () => {
    const shopId = 'shop-yangon-01';
    const drainProduct: Product = {
      id: 'prod-drain-01',
      shopId,
      sku: 'SKU-DRAIN-01',
      nameMm: 'ကုန်ခန်းမှု စမ်းသပ် ပစ္စည်း',
      nameEn: 'Drain Stock Test',
      category: 'General',
      priceMmk: 8000,
      stockQuantity: 15, // Only 15 available
      imageUrl: '',
      isAvailable: true,
    };
    await stockDb.saveProduct(shopId, drainProduct);

    // 50 concurrent requests each decrementing -1
    const decrements: Promise<Product | null>[] = [];
    for (let i = 0; i < 50; i++) {
      decrements.push(stockDb.updateProductStock(shopId, drainProduct.id, -1));
    }

    const decResults = await Promise.all(decrements);
    assert(decResults.length === 50, 'All 50 operations completed');

    const prods = await stockDb.getProducts(shopId);
    const finalProd = prods.find((p) => p.id === drainProduct.id);
    assert(finalProd!.stockQuantity === 0, `Final stock must be exactly 0, got ${finalProd!.stockQuantity}`);
    assert(finalProd!.isAvailable === false, 'isAvailable must be false');
    assert(finalProd!.stockQuantity >= 0, 'Stock must NEVER be negative');
  });

  await runTest('Stock Protection', 'Restocking a 0-stock product updates isAvailable to true', async () => {
    const shopId = 'shop-yangon-01';
    const prodId = 'prod-clamp-01'; // currently 0
    const result = await stockDb.updateProductStock(shopId, prodId, 25);
    assert(result !== null, 'Product must be returned');
    assert(result!.stockQuantity === 25, `Expected stock 25, got ${result!.stockQuantity}`);
    assert(result!.isAvailable === true, 'Expected isAvailable true when stock > 0');
  });

  cleanupFile(stockDbPath);

  // ============================================================================
  // SUITE 3: NON-EXISTENT ENTITIES & CORRUPTED JSON RECOVERY
  // ============================================================================
  console.log('\n--- SUITE 3: Non-Existent Entities & Corrupted JSON Recovery ---');
  const recoveryDbPath = path.join(testDir, 'test_m1_adv_recovery.json');
  cleanupFile(recoveryDbPath);
  const recoveryDb = new MultiTenantDB(recoveryDbPath);

  await runTest('Non-Existent Entities', 'Querying non-existent shop returns null or empty array', async () => {
    const bogusShopId = 'shop-does-not-exist-404';
    const shop = await recoveryDb.getShop(bogusShopId);
    assert(shop === null, 'getShop must return null for non-existent shop');

    const shopById = await recoveryDb.getShopById(bogusShopId);
    assert(shopById === null, 'getShopById alias must return null for non-existent shop');

    const prods = await recoveryDb.getProducts(bogusShopId);
    assert(Array.isArray(prods) && prods.length === 0, 'getProducts must return empty array for non-existent shop');

    const orders = await recoveryDb.getOrders(bogusShopId);
    assert(Array.isArray(orders) && orders.length === 0, 'getOrders must return empty array for non-existent shop');

    const channels = await recoveryDb.getChannels(bogusShopId);
    assert(Array.isArray(channels) && channels.length === 0, 'getChannels must return empty array for non-existent shop');
  });

  await runTest('Non-Existent Entities', 'Mutations on non-existent shop or entity return null without crashing', async () => {
    const bogusShopId = 'shop-bogus-999';
    const bogusProdId = 'prod-bogus-999';
    const bogusOrderId = 'ord-bogus-999';

    const stockResult1 = await recoveryDb.updateProductStock(bogusShopId, bogusProdId, -5);
    assert(stockResult1 === null, 'updateProductStock on non-existent shop must return null');

    const stockResult2 = await recoveryDb.updateProductStock('shop-yangon-01', bogusProdId, -5);
    assert(stockResult2 === null, 'updateProductStock on non-existent product must return null');

    const orderResult1 = await recoveryDb.updateOrderStatus(bogusShopId, bogusOrderId, 'confirmed');
    assert(orderResult1 === null, 'updateOrderStatus on non-existent shop must return null');

    const orderResult2 = await recoveryDb.updateOrderStatus('shop-yangon-01', bogusOrderId, 'confirmed');
    assert(orderResult2 === null, 'updateOrderStatus on non-existent order must return null');

    const shopUpdateResult = await recoveryDb.updateShop(bogusShopId, { name: 'Ghost' });
    assert(shopUpdateResult === null, 'updateShop on non-existent shop must return null');
  });

  await runTest('Non-Existent Entities', 'findShopByChannel on unregistered pageId/platform returns null', async () => {
    const channel1 = await recoveryDb.findShopByChannel('facebook', 'unregistered_page_123456');
    assert(channel1 === null, 'findShopByChannel must return null for unknown facebook page');

    const channel2 = await recoveryDb.findShopByChannel('tiktok', 'unregistered_tiktok_account_999');
    assert(channel2 === null, 'findShopByChannel must return null for unknown tiktok account');
  });

  await runTest('Corrupted JSON Recovery', 'Malformed syntax (truncated JSON) recovers cleanly by re-seeding', async () => {
    const corruptFile = path.join(testDir, 'test_m1_corrupt_syntax.json');
    cleanupFile(corruptFile);

    // Write invalid, truncated JSON
    fs.writeFileSync(corruptFile, '{"shops": [{"id": "broken", "name": "truncated...', 'utf-8');

    // MultiTenantDB should catch SyntaxError, log warning, and re-seed
    const dbCorrupt = new MultiTenantDB(corruptFile);
    const shops = await dbCorrupt.listShops();
    assert(shops.length >= 3, `Expected at least 3 seeded shops after corrupt recovery, got ${shops.length}`);

    // Verify file on disk was re-written with valid JSON
    const diskContent = fs.readFileSync(corruptFile, 'utf-8');
    const parsed = JSON.parse(diskContent);
    assert(Array.isArray(parsed.shops), 'Recovered file on disk is valid JSON with shops array');

    cleanupFile(corruptFile);
  });

  await runTest('Corrupted JSON Recovery', 'Empty 0-byte file recovers cleanly by re-seeding', async () => {
    const emptyFile = path.join(testDir, 'test_m1_empty.json');
    cleanupFile(emptyFile);

    // Write empty file
    fs.writeFileSync(emptyFile, '', 'utf-8');

    const dbEmpty = new MultiTenantDB(emptyFile);
    const shops = await dbEmpty.listShops();
    assert(shops.length >= 3, `Expected at least 3 seeded shops after empty file recovery, got ${shops.length}`);

    cleanupFile(emptyFile);
  });

  await runTest('Corrupted JSON Recovery', 'Invalid non-object JSON payload ("null" or "[1, 2, 3]") recovers cleanly', async () => {
    const nullFile = path.join(testDir, 'test_m1_null.json');
    cleanupFile(nullFile);

    // Write "null"
    fs.writeFileSync(nullFile, 'null', 'utf-8');

    const dbNull = new MultiTenantDB(nullFile);
    const shops = await dbNull.listShops();
    assert(shops.length >= 3, 'Recovered from null JSON');

    cleanupFile(nullFile);
  });

  cleanupFile(recoveryDbPath);

  // ============================================================================
  // SUITE 4: BURMESE UNICODE, ZAWGYI, QUOTES & SPECIAL CHARACTER INTEGRITY
  // ============================================================================
  console.log('\n--- SUITE 4: Burmese Unicode, Zawgyi, Quotes & Special Characters ---');
  const burmeseDbPath = path.join(testDir, 'test_m1_adv_burmese.json');
  cleanupFile(burmeseDbPath);
  const burmeseDb = new MultiTenantDB(burmeseDbPath);

  // Burmese test strings
  const burmeseUnicodeShopName = 'ရွှေနန်းတော် ပိုးထည်နှင့် အထည်ချုပ် (ရန်ကုန်)';
  const burmeseZawgyiShopName = 'ေရႊနန္းေတာ္ ပိုးထည္ႏွင့္ အထည္ခ်ဳပ္ (ရန္ကုန္)';
  const paliStackedProduct = 'ဥက္ကဋ္ဌ ရွှေချည်ထိုး ပုဆိုး သမ္မတဂုဏ်ဆောင်';
  const burmeseZawgyiProduct = 'မႏၲေလး ခ်ည္ပိုးထည္ လုံခ်ည္';
  const complexSpecialCustomerName = 'Daw "Su Su" Aye\'s & Co. <VIP> 🇲🇲🛍️';
  const specialAddressWithEscapes = 'အမှတ် (၁၂၃/က)၊ ဗိုလ်ချုပ်လမ်း၊ \nအခန်း (၄-B)၊ \t"လမ်းမတော်"၊ ရန်ကုန်။ \\ backslash';
  const burglishSlangNote = 'bro order confirm pay pr dl naw kpay slipပို့ပီးပီနော် 100% legit!';
  const myanmarDigitsPhone = '၀၉၄၂၁၂၃၄၅၆၇';

  await runTest('Burmese & Special Characters', 'Save and retrieve Burmese Unicode with stacked diacritics', async () => {
    const shop: Shop = {
      id: 'shop-unicode-burmese',
      name: burmeseUnicodeShopName,
      ownerEmail: 'burmese.unicode@shop.mm',
      telegramChatId: '@unicode_mm_bot',
      kpayNumber: '09791122334',
      kpayName: 'ဒေါ်အေးအေးသင်း',
      waveNumber: '09791122334',
      waveName: 'ဒေါ်အေးအေးသင်း',
    };
    await burmeseDb.saveShop(shop);

    const product: Product = {
      id: 'prod-pali-stacked',
      shopId: shop.id,
      sku: 'SKU-UNICODE-STACK',
      nameMm: paliStackedProduct,
      nameEn: 'Pali Stacked Diacritics Product',
      category: 'ရိုးရာဝတ်စုံ',
      priceMmk: 125000,
      stockQuantity: 10,
      imageUrl: 'https://example.com/pali.jpg',
      isAvailable: true,
    };
    await burmeseDb.saveProduct(shop.id, product);

    const savedShop = await burmeseDb.getShop(shop.id);
    assert(savedShop !== null, 'Shop must exist');
    assert(savedShop!.name === burmeseUnicodeShopName, `Unicode shop name mismatch:\nExpected: ${burmeseUnicodeShopName}\nGot: ${savedShop!.name}`);
    assert(savedShop!.kpayName === 'ဒေါ်အေးအေးသင်း', 'KPay Burmese name mismatch');

    const savedProds = await burmeseDb.getProducts(shop.id);
    assert(savedProds.length === 1, 'Product must exist');
    assert(savedProds[0].nameMm === paliStackedProduct, `Unicode product name mismatch:\nExpected: ${paliStackedProduct}\nGot: ${savedProds[0].nameMm}`);
    assert(savedProds[0].category === 'ရိုးရာဝတ်စုံ', 'Unicode category mismatch');
  });

  await runTest('Burmese & Special Characters', 'Save and retrieve Burmese Zawgyi encoded strings without distortion', async () => {
    const shop: Shop = {
      id: 'shop-zawgyi-burmese',
      name: burmeseZawgyiShopName,
      ownerEmail: 'zawgyi@shop.mm',
      kpayNumber: '09459988776',
      kpayName: 'ေမာင္ေမာင္',
      waveNumber: '09459988776',
      waveName: 'ေမာင္ေမာင္',
    };
    await burmeseDb.saveShop(shop);

    const product: Product = {
      id: 'prod-zawgyi-01',
      shopId: shop.id,
      sku: 'SKU-ZAWGYI-01',
      nameMm: burmeseZawgyiProduct,
      nameEn: 'Zawgyi Longyi',
      category: 'အထည္',
      priceMmk: 35000,
      stockQuantity: 20,
      imageUrl: '',
      isAvailable: true,
    };
    await burmeseDb.saveProduct(shop.id, product);

    const savedShop = await burmeseDb.getShop(shop.id);
    assert(savedShop!.name === burmeseZawgyiShopName, 'Zawgyi shop name mismatch');
    assert(savedShop!.kpayName === 'ေမာင္ေမာင္', 'Zawgyi kpay name mismatch');

    const prods = await burmeseDb.getProducts(shop.id);
    assert(prods[0].nameMm === burmeseZawgyiProduct, 'Zawgyi product name mismatch');
  });

  await runTest('Burmese & Special Characters', 'Quotes, backslashes, newlines, tabs, emojis and XSS strings persist intact', async () => {
    const shopId = 'shop-unicode-burmese';
    const order = await burmeseDb.createOrder(shopId, {
      platform: 'facebook',
      customerPlatformId: 'fb_user_special_char_99',
      customerName: complexSpecialCustomerName,
      customerPhone: myanmarDigitsPhone,
      township: 'Lanmadaw (လမ်းမတော်)',
      fullAddress: specialAddressWithEscapes,
      items: [
        {
          productId: 'prod-pali-stacked',
          name: paliStackedProduct,
          quantity: 2,
          priceMmk: 125000,
        },
      ],
      subtotalMmk: 250000,
      deliveryFeeMmk: 2500,
      totalMmk: 252500,
      paymentMethod: 'kpay',
      status: 'pending_slip',
      paymentSlipUrl: 'https://storage.example.com/slips/slip_123.jpg?token=abc"&xyz=\'123\'',
    });

    assert(order.customerName === complexSpecialCustomerName, 'Customer name with quotes/emojis preserved');
    assert(order.fullAddress === specialAddressWithEscapes, 'Address with escapes/newlines preserved');
    assert(order.customerPhone === myanmarDigitsPhone, 'Myanmar digits phone preserved');
  });

  await runTest('Burmese & Special Characters', 'Disk reload: brand new MultiTenantDB maintains byte-for-byte fidelity', async () => {
    // Reinstantiate completely brand new instance
    const reloadedDb = new MultiTenantDB(burmeseDbPath);

    // 1. Check Unicode shop
    const shop = await reloadedDb.getShop('shop-unicode-burmese');
    assert(shop !== null, 'Unicode shop must survive reload');
    assert(shop!.name === burmeseUnicodeShopName, 'Shop name codepoint exact match after reload');
    assert(Buffer.from(shop!.name).equals(Buffer.from(burmeseUnicodeShopName)), 'Byte buffer equality for Unicode shop name');

    // 2. Check Zawgyi shop
    const zawgyiShop = await reloadedDb.getShop('shop-zawgyi-burmese');
    assert(zawgyiShop !== null, 'Zawgyi shop must survive reload');
    assert(zawgyiShop!.name === burmeseZawgyiShopName, 'Zawgyi shop name codepoint exact match after reload');
    assert(Buffer.from(zawgyiShop!.name).equals(Buffer.from(burmeseZawgyiShopName)), 'Byte buffer equality for Zawgyi shop name');

    // 3. Check Order with complex characters
    const orders = await reloadedDb.getOrders('shop-unicode-burmese');
    assert(orders.length === 1, 'Order must survive reload');
    const order = orders[0];
    assert(order.customerName === complexSpecialCustomerName, 'Complex customer name survived reload');
    assert(order.fullAddress === specialAddressWithEscapes, 'Escaped address survived reload');
    assert(Buffer.from(order.fullAddress).equals(Buffer.from(specialAddressWithEscapes)), 'Byte buffer equality for escaped address');
    assert(order.items[0].name === paliStackedProduct, 'Pali stacked item name survived reload');
  });

  cleanupFile(burmeseDbPath);

  // ============================================================================
  // SUITE 5: ZERO CHAT PERSISTENCE FORENSIC CHECK
  // ============================================================================
  console.log('\n--- SUITE 5: Zero-Chat Storage Forensic Verification ---');
  await runTest('Zero Chat Invariant', 'Database file never contains chat keys or properties under any mutation', async () => {
    const forensicPath = path.join(testDir, 'test_m1_adv_forensic.json');
    cleanupFile(forensicPath);
    const forensicDb = new MultiTenantDB(forensicPath);

    // Perform multiple operations
    await forensicDb.saveShop({
      id: 'shop-forensic-1',
      name: 'Forensic Shop',
      ownerEmail: 'forensic@test.com',
      kpayNumber: '09123',
      kpayName: 'Test',
      waveNumber: '09123',
      waveName: 'Test',
    });
    await forensicDb.saveProduct('shop-forensic-1', {
      id: 'prod-f-1',
      sku: 'SKU-F-1',
      nameMm: 'ပစ္စည်း',
      nameEn: 'Prod',
      category: 'Cat',
      priceMmk: 1000,
      stockQuantity: 10,
      imageUrl: '',
      isAvailable: true,
    });
    await forensicDb.createOrder('shop-forensic-1', {
      platform: 'tiktok',
      customerPlatformId: 'tt_forensic_user',
      customerName: 'Customer',
      customerPhone: '09112233',
      township: 'Bahan',
      fullAddress: 'Address',
      items: [{ productId: 'prod-f-1', name: 'Prod', quantity: 1, priceMmk: 1000 }],
      subtotalMmk: 1000,
      deliveryFeeMmk: 2500,
      totalMmk: 3500,
      paymentMethod: 'cod',
      status: 'pending_approval',
    });

    const fileRaw = fs.readFileSync(forensicPath, 'utf-8');
    const parsed = JSON.parse(fileRaw);

    const forbiddenKeys = ['conversations', 'messages', 'chat_logs', 'chatHistory', 'thread', 'threads'];
    for (const key of forbiddenKeys) {
      assert(!(key in parsed), `Forbidden key "${key}" found in database root JSON`);
    }

    // Check each entity has no chat leaks
    for (const ord of parsed.orders) {
      assert(ord.conversationId === undefined, `Order ${ord.id} leaked conversationId`);
      assert(ord.messageId === undefined, `Order ${ord.id} leaked messageId`);
    }

    // Verify only the 4 allowed keys exist at root
    const allowedKeys = new Set(['shops', 'products', 'channels', 'orders']);
    const actualKeys = Object.keys(parsed);
    for (const key of actualKeys) {
      assert(allowedKeys.has(key), `Unexpected top-level key "${key}" in database JSON`);
    }

    cleanupFile(forensicPath);
  });

  // ============================================================================
  // SUMMARY & VERDICT
  // ============================================================================
  console.log('\n================================================================');
  console.log('CHALLENGE EXECUTION SUMMARY');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Scenarios Tested : ${total}`);
  console.log(`Passed                 : ${passed}`);
  console.log(`Failed                 : ${failed}`);

  if (failed > 0) {
    console.log('\n❌ VERDICT: REJECT');
    console.log('Failures encountered:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - [${r.suite}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ VERDICT: APPROVE');
    console.log('All adversarial stress tests, concurrency harnesses, and edge cases passed cleanly.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal unhandled error in challenge suite:', err);
  process.exit(1);
});
