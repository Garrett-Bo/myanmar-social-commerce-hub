import fs from 'fs';
import path from 'path';
import { MultiTenantDB } from '../src/lib/db';
import { Product, Order, ChannelConnection, Shop } from '../src/types';

async function runVerification() {
  console.log('================================================================');
  console.log('MILESTONE 1 AUTOMATED VERIFICATION SUITE');
  console.log('================================================================');

  const testDbDir = path.join(process.cwd(), 'data');
  const testDbPath = path.join(testDbDir, 'test_m1_verify.json');

  // Clean up any old test file
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  let passedAssertions = 0;
  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      process.exit(1);
    }
    console.log(`✅ PASS: ${message}`);
    passedAssertions++;
  }

  // ----------------------------------------------------------------------------
  // 1. First-Run Seeding & Disk Persistence
  // ----------------------------------------------------------------------------
  console.log('\n--- 1. Testing First-Run Seeding & Initial Persistence ---');
  const db1 = new MultiTenantDB(testDbPath);

  assert(fs.existsSync(testDbPath), 'Database file created on disk at test path');

  const rawJsonInitial = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
  assert(Array.isArray(rawJsonInitial.shops) && rawJsonInitial.shops.length >= 3, 'Initial shops seeded on disk');
  assert(Array.isArray(rawJsonInitial.products) && rawJsonInitial.products.length >= 5, 'Initial products seeded on disk');
  assert(Array.isArray(rawJsonInitial.channels) && rawJsonInitial.channels.length >= 3, 'Initial channels seeded on disk');
  assert(Array.isArray(rawJsonInitial.orders) && rawJsonInitial.orders.length >= 2, 'Initial orders seeded on disk');

  // ----------------------------------------------------------------------------
  // 2. Zero-Chat Storage Invariant Verification
  // ----------------------------------------------------------------------------
  console.log('\n--- 2. Testing Strict Zero-Chat Storage Invariant ---');
  assert(!('conversations' in rawJsonInitial), 'Raw database JSON contains NO "conversations" key');
  assert(!('messages' in rawJsonInitial), 'Raw database JSON contains NO "messages" key');
  assert(!('chat_logs' in rawJsonInitial), 'Raw database JSON contains NO "chat_logs" key');

  // Check instance properties and methods
  assert((db1 as any).conversations === undefined, 'MultiTenantDB instance has no "conversations" map');
  assert((db1 as any).messages === undefined, 'MultiTenantDB instance has no "messages" map');
  assert((db1 as any).getConversations === undefined, 'MultiTenantDB instance has no "getConversations" method');
  assert((db1 as any).getMessages === undefined, 'MultiTenantDB instance has no "getMessages" method');
  assert((db1 as any).addConversation === undefined, 'MultiTenantDB instance has no "addConversation" method');
  assert((db1 as any).addMessage === undefined, 'MultiTenantDB instance has no "addMessage" method');

  // Verify orders on disk have no foreign key to conversation
  for (const ord of rawJsonInitial.orders) {
    assert(ord.conversationId === undefined, `Order ${ord.id} does not contain conversationId`);
    assert(typeof ord.platform === 'string', `Order ${ord.id} contains platform: ${ord.platform}`);
    assert(typeof ord.customerPlatformId === 'string', `Order ${ord.id} contains customerPlatformId: ${ord.customerPlatformId}`);
  }

  // ----------------------------------------------------------------------------
  // 3. Multi-Tenant Isolation
  // ----------------------------------------------------------------------------
  console.log('\n--- 3. Testing Strict Multi-Tenant Isolation ---');
  const shopYangon = 'shop-yangon-01';
  const shopMandalay = 'shop-mdy-02';

  const yangonProducts = await db1.getProducts(shopYangon);
  const mandalayProducts = await db1.getProducts(shopMandalay);

  assert(yangonProducts.every((p) => p.shopId === shopYangon), 'Yangon catalog only contains Yangon products');
  assert(mandalayProducts.every((p) => p.shopId === shopMandalay), 'Mandalay catalog only contains Mandalay products');
  assert(
    !yangonProducts.some((yp) => mandalayProducts.some((mp) => mp.id === yp.id)),
    'Zero product ID overlap between Yangon and Mandalay shops'
  );

  const yangonOrders = await db1.getOrders(shopYangon);
  const mandalayOrders = await db1.getOrders(shopMandalay);
  assert(yangonOrders.every((o) => o.shopId === shopYangon), 'Yangon orders only contain Yangon shop orders');
  assert(mandalayOrders.length === 0, 'Mandalay has 0 initial orders; isolated from Yangon orders');

  // ----------------------------------------------------------------------------
  // 4. Persistence Across Instance Reinstantiation
  // ----------------------------------------------------------------------------
  console.log('\n--- 4. Testing Persistence Across Reinstantiation ---');

  // Add new tenant
  const testShop: Shop = {
    id: 'shop-test-persist-99',
    name: 'Shan State Herbal Shop (တောင်ကြီး)',
    ownerEmail: 'shan.herbal@gmail.com',
    telegramChatId: '@shan_herbal_bot',
    kpayNumber: '09887766554',
    kpayName: 'Sai Sai Kham',
    waveNumber: '09887766554',
    waveName: 'Sai Sai Kham',
  };
  await db1.saveShop(testShop);

  // Add product for test shop
  const testProduct: Product = {
    id: 'prod-shan-01',
    shopId: testShop.id,
    sku: 'SHAN-TEA-01',
    nameMm: 'ရှမ်းရိုးရာ သဘာဝ လက်ဖက်ခြောက်',
    nameEn: 'Organic Shan Green Tea',
    category: 'Beverage',
    priceMmk: 12000,
    stockQuantity: 50,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400',
    isAvailable: true,
  };
  await db1.saveProduct(testShop.id, testProduct);

  // Add channel connection
  const testChannel: ChannelConnection = {
    id: 'ch-fb-shan-99',
    shopId: testShop.id,
    platform: 'facebook',
    accountName: 'Shan Herbal FB Page',
    pageId: '987654321098765',
    accessToken: 'EAA_SHAN_PERSIST_TEST_TOKEN_XYZ',
    isActive: true,
  };
  await db1.saveChannelConnection(testShop.id, testChannel);

  // Create order
  const testOrder = await db1.createOrder(testShop.id, {
    platform: 'facebook',
    customerPlatformId: 'fb_psid_shan_user_1',
    customerName: 'Nan Mwe Kham',
    customerPhone: '09254433221',
    township: 'Taunggyi',
    fullAddress: 'Main Street, Taunggyi, Shan State',
    items: [{ productId: testProduct.id, name: testProduct.nameMm, quantity: 2, priceMmk: 12000 }],
    subtotalMmk: 24000,
    deliveryFeeMmk: 3000,
    totalMmk: 27000,
    paymentMethod: 'kpay',
    status: 'pending_slip',
  });

  // Mutate product stock
  const updatedProd = await db1.updateProductStock(testShop.id, testProduct.id, -2);
  assert(updatedProd !== null && updatedProd.stockQuantity === 48, 'Stock decremented to 48');

  // Update order status
  const updatedOrder = await db1.updateOrderStatus(testShop.id, testOrder.id, 'confirmed');
  assert(updatedOrder !== null && updatedOrder.status === 'confirmed', 'Order status updated to confirmed');

  // REINSTANTIATE A COMPLETELY NEW MultiTenantDB INSTANCE
  console.log('\n--- Reinstantiating brand new MultiTenantDB(testDbPath) ---');
  const db2 = new MultiTenantDB(testDbPath);

  // Verify test shop persisted
  const reloadedShop = await db2.getShop(testShop.id);
  assert(reloadedShop !== null && reloadedShop.name === testShop.name, 'Shop survived reinstantiation');

  // Verify test product persisted with decremented stock
  const reloadedProducts = await db2.getProducts(testShop.id);
  assert(reloadedProducts.length === 1, 'Product list survived reinstantiation');
  assert(reloadedProducts[0].stockQuantity === 48, 'Product stock quantity (48) survived reinstantiation');

  // Verify channel connection persisted with accessToken
  const channelLookup = await db2.findShopByChannel('facebook', testChannel.pageId);
  assert(channelLookup !== null, 'Channel lookup found shop across reinstantiation');
  assert(channelLookup?.channel.accessToken === 'EAA_SHAN_PERSIST_TEST_TOKEN_XYZ', 'Channel accessToken persisted correctly');
  assert(channelLookup?.shop.id === testShop.id, 'Channel lookup mapped to correct owning shop');

  // Verify order persisted with updated status
  const reloadedOrders = await db2.getOrders(testShop.id);
  assert(reloadedOrders.length === 1, 'Order survived reinstantiation');
  assert(reloadedOrders[0].status === 'confirmed', 'Order confirmed status survived reinstantiation');
  assert(reloadedOrders[0].customerPlatformId === 'fb_psid_shan_user_1', 'Order customerPlatformId persisted');

  // Verify disk content after second instance
  const rawDiskAfter = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
  assert(!('conversations' in rawDiskAfter), 'Disk content remains zero-chat after reloads and writes');
  assert(!('messages' in rawDiskAfter), 'Disk content has zero messages after reloads and writes');

  // ----------------------------------------------------------------------------
  // 5. Canonical Contracts & Backwards Compatibility
  // ----------------------------------------------------------------------------
  console.log('\n--- 5. Testing Canonical Contracts & Backward Compatible Aliases ---');
  // Aliases
  const shopAlias = await db2.getShopById(testShop.id);
  assert(shopAlias?.id === testShop.id, 'getShopById alias works');

  const shopsAlias = await db2.getShops();
  assert(shopsAlias.length === (await db2.listShops()).length, 'getShops alias works');

  const fbFallback = await db2.findShopByPageId('non-existent-page-id');
  assert(fbFallback !== null && fbFallback.shop.id === 'shop-yangon-01', 'findShopByPageId returns default fallback on unknown');

  // Clean up test file
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  console.log('\n================================================================');
  console.log(`>>> ALL ${passedAssertions} PERSISTENCE & ZERO-CHAT ASSERTIONS PASSED CLEANLY! <<<`);
  console.log('================================================================');
}

runVerification().catch((err) => {
  console.error('Unhandled error in verification suite:', err);
  process.exit(1);
});
