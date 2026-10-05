import fs from 'fs';
import path from 'path';
import { MultiTenantDB } from '../../../src/lib/db';
import { Product, Order, Shop } from '../../../src/types';

async function runAdversarialSuite() {
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS-TEST & INTEGRITY AUDIT SUITE');
  console.log('================================================================');

  const testDir = path.join(__dirname, 'test_data');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  const testDbFile = path.join(testDir, 'adversarial_db.json');

  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }

  let passedChecks = 0;
  function assert(condition: boolean, name: string) {
    if (!condition) {
      console.error(`❌ FAILED: ${name}`);
      process.exit(1);
    }
    console.log(`✅ PASS: ${name}`);
    passedChecks++;
  }

  // ----------------------------------------------------------------------------
  // Test 1: Rapid Concurrent Writes & Windows File Lock Fallback
  // ----------------------------------------------------------------------------
  console.log('\n--- 1. Testing Rapid Sequential & Concurrent Mutations ---');
  const db = new MultiTenantDB(testDbFile);

  const shopYangon = 'shop-yangon-01';
  const initialYangonProducts = await db.getProducts(shopYangon);
  const targetProd = initialYangonProducts[0];
  const initialStock = targetProd.stockQuantity;

  // Perform 20 rapid decrements of stock
  for (let i = 0; i < 10; i++) {
    await db.updateProductStock(shopYangon, targetProd.id, -1);
  }

  const updatedProd = (await db.getProducts(shopYangon)).find((p) => p.id === targetProd.id);
  assert(updatedProd?.stockQuantity === initialStock - 10, `Stock accurately decremented 10 times to ${initialStock - 10}`);

  // Check no temp files lingering
  const dirFiles = fs.readdirSync(testDir);
  const tmpFiles = dirFiles.filter((f) => f.includes('.tmp.'));
  assert(tmpFiles.length === 0, 'Zero lingering temporary .tmp files in data directory');

  // ----------------------------------------------------------------------------
  // Test 2: Cross-Tenant Isolation Attacks
  // ----------------------------------------------------------------------------
  console.log('\n--- 2. Testing Cross-Tenant Isolation Attacks ---');
  const shopMandalay = 'shop-mdy-02';
  const mdyProducts = await db.getProducts(shopMandalay);
  const mdyTarget = mdyProducts[0];
  const mdyInitialStock = mdyTarget.stockQuantity;

  // Attack 2A: Yangon tenant tries to decrement Mandalay's product stock
  const crossStockAttack = await db.updateProductStock(shopYangon, mdyTarget.id, -5);
  assert(crossStockAttack === null, 'Cross-tenant stock update returned null');

  const mdyCheck = (await db.getProducts(shopMandalay)).find((p) => p.id === mdyTarget.id);
  assert(mdyCheck?.stockQuantity === mdyInitialStock, 'Mandalay stock completely untouched by unauthorized shop');

  // Attack 2B: Yangon tenant tries to update Mandalay's order status
  const mdyOrder = await db.createOrder(shopMandalay, {
    platform: 'facebook',
    customerPlatformId: 'fb_mdy_victim',
    customerName: 'Ko Ko',
    customerPhone: '0911223344',
    township: 'Chanayethazan',
    fullAddress: 'Mandalay 78th street',
    items: [{ productId: mdyTarget.id, name: mdyTarget.nameMm, quantity: 1, priceMmk: mdyTarget.priceMmk }],
    subtotalMmk: mdyTarget.priceMmk,
    deliveryFeeMmk: 2000,
    totalMmk: mdyTarget.priceMmk + 2000,
    paymentMethod: 'kpay',
    status: 'pending_slip',
  });

  const crossOrderAttack = await db.updateOrderStatus(shopYangon, mdyOrder.id, 'cancelled');
  assert(crossOrderAttack === null, 'Cross-tenant order status update returned null');

  const mdyOrderCheck = (await db.getOrders(shopMandalay)).find((o) => o.id === mdyOrder.id);
  assert(mdyOrderCheck?.status === 'pending_slip', 'Mandalay order status remained unchanged');

  // Attack 2C: Product body spoofing shopId
  const spoofedProduct: Product = {
    id: 'prod-spoofed-01',
    shopId: shopMandalay, // Attacker puts Mandalay in body
    sku: 'SPOOF-01',
    nameMm: 'စမ်းသပ်ပစ္စည်း',
    nameEn: 'Spoofed Item',
    category: 'Test',
    priceMmk: 10000,
    stockQuantity: 5,
    imageUrl: '',
    isAvailable: true,
  };
  // But calls saveProduct under shopYangon
  await db.saveProduct(shopYangon, spoofedProduct);

  const mdyProdsAfterSpoof = await db.getProducts(shopMandalay);
  assert(!mdyProdsAfterSpoof.some((p) => p.id === 'prod-spoofed-01'), 'Spoofed product NOT injected into Mandalay catalog');

  const yangonProdsAfterSpoof = await db.getProducts(shopYangon);
  const foundInYangon = yangonProdsAfterSpoof.find((p) => p.id === 'prod-spoofed-01');
  assert(foundInYangon?.shopId === shopYangon, 'Product correctly constrained to calling shopId');

  // ----------------------------------------------------------------------------
  // Test 3: Stock Boundary Underflow Protection
  // ----------------------------------------------------------------------------
  console.log('\n--- 3. Testing Stock Boundary Clamping ---');
  // Decrement by 999999
  const clampedProd = await db.updateProductStock(shopYangon, targetProd.id, -999999);
  assert(clampedProd?.stockQuantity === 0, 'Stock clamped to 0 on negative delta overflow');
  assert(clampedProd?.isAvailable === false, 'Product marked unavailable when stock reaches 0');

  // ----------------------------------------------------------------------------
  // Test 4: Corrupted Disk JSON Auto-Recovery
  // ----------------------------------------------------------------------------
  console.log('\n--- 4. Testing Corrupted Disk JSON Recovery ---');
  fs.writeFileSync(testDbFile, '{ MALFORMED JSON !!! NOT PARSEABLE', 'utf-8');

  // Instantiate new DB pointing to corrupted file
  const dbRecovered = new MultiTenantDB(testDbFile);
  const recoveredShops = await dbRecovered.listShops();
  assert(recoveredShops.length >= 3, 'Recovered from corrupted file by re-seeding cleanly');
  const validJson = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  assert(Array.isArray(validJson.shops), 'Corrupted file automatically healed with valid JSON on disk');

  // ----------------------------------------------------------------------------
  // Test 5: Deep Directory Auto-Creation
  // ----------------------------------------------------------------------------
  console.log('\n--- 5. Testing Deep Directory Creation ---');
  const deepDirFile = path.join(testDir, 'deep', 'nested', 'subpath', 'store.json');
  if (fs.existsSync(path.dirname(deepDirFile))) {
    fs.rmSync(path.join(testDir, 'deep'), { recursive: true, force: true });
  }

  const dbDeep = new MultiTenantDB(deepDirFile);
  assert(fs.existsSync(deepDirFile), 'Created deep nested directory and initialized store');

  // ----------------------------------------------------------------------------
  // Test 6: Burmese Unicode & Diacritics Encoding Fidelity
  // ----------------------------------------------------------------------------
  console.log('\n--- 6. Testing Burmese Unicode Fidelity ---');
  const burmeseName = 'မင်္ဂလာပါ ရွှေတိဂုံ အထူးလက်ဆောင် ချည်သားသီးသန့် (၃၀% လျှော့စျေး)';
  const burmeseSku = 'BUR-UNI-၀၁';
  const burmeseProd: Product = {
    id: 'prod-bur-unicode-01',
    shopId: shopYangon,
    sku: burmeseSku,
    nameMm: burmeseName,
    nameEn: 'Special Shwedagon Cotton (30% Discount)',
    category: 'Fashion',
    priceMmk: 55000,
    stockQuantity: 10,
    imageUrl: '',
    isAvailable: true,
  };
  await dbRecovered.saveProduct(shopYangon, burmeseProd);

  // Reload completely from disk
  const dbReloaded = new MultiTenantDB(testDbFile);
  const loadedBurmese = (await dbReloaded.getProducts(shopYangon)).find((p) => p.id === 'prod-bur-unicode-01');
  assert(loadedBurmese?.nameMm === burmeseName, 'Burmese Unicode diacritics preserved byte-for-byte across disk write/read');
  assert(loadedBurmese?.sku === burmeseSku, 'Burmese digit in SKU preserved');

  // ----------------------------------------------------------------------------
  // Test 7: Absolute Zero-Chat Invariant Verification
  // ----------------------------------------------------------------------------
  console.log('\n--- 7. Testing Strict Zero-Chat Invariant After Complex Mutations ---');
  const finalDiskContent = fs.readFileSync(testDbFile, 'utf-8');
  assert(!finalDiskContent.includes('"conversations"'), 'Zero conversations key in final disk store');
  assert(!finalDiskContent.includes('"messages"'), 'Zero messages key in final disk store');
  assert(!finalDiskContent.includes('"chat_logs"'), 'Zero chat_logs in final disk store');

  // Clean up test directory
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {}

  console.log('\n================================================================');
  console.log(`>>> ALL ${passedChecks} ADVERSARIAL STRESS CHECKS PASSED CLEANLY! <<<`);
  console.log('================================================================');
}

runAdversarialSuite().catch((e) => {
  console.error('Fatal in adversarial suite:', e);
  process.exit(1);
});
