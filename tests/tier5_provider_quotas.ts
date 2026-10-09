/**
 * TIER 5: SAAS PROVIDER GOVERNANCE, SUBSCRIPTION QUOTAS & COGS VERIFICATION
 * Validates ultra-low-cost provider economics, tier quotas, and 3-tier AI cost guard.
 */

import { db } from '../src/lib/db';
import { processCustomerMessage } from '../src/lib/gemini-agent';
import { Shop, Product, ChannelConnection } from '../src/types';

let total = 0;
let passed = 0;

function assert(condition: boolean, message: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

async function runProviderQuotasTests() {
  console.log('================================================================');
  console.log('TIER 5: SAAS PROVIDER GOVERNANCE & LOW-COST ARCHITECTURE TESTS');
  console.log('================================================================\n');

  // Setup Test Shop on Starter Plan (100 order limit) with unique ID
  const testShopId = 'shop-test-starter-' + Date.now();
  const testStarterShop: Shop = {
    id: testShopId,
    name: 'Shwe Mann Starter Shop (ရွှေမန်း)',
    ownerEmail: 'starter@shwemann.mm',
    kpayNumber: '09791112233',
    kpayName: 'Daw Shwe Mann',
    waveNumber: '09791112233',
    waveName: 'Daw Shwe Mann',
    subscription: {
      plan: 'starter',
      status: 'active',
      monthlyOrderLimit: 100,
      currentMonthOrders: 0,
      monthlyAiTokensUsed: 0,
      monthlyAiTokenLimit: 20000,
      priceMmk: 0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    createdAt: new Date().toISOString(),
  };

  const testProduct: Product = {
    id: 'prod-test-lip',
    shopId: testStarterShop.id,
    sku: 'LIP-01',
    nameMm: 'နှုတ်ခမ်းနီ (Matte Lipstick)',
    nameEn: 'Matte Longwear Lipstick',
    priceMmk: 12000,
    stockQuantity: 50,
    isAvailable: true,
    category: 'Cosmetics',
  };

  const testChannel: ChannelConnection = {
    id: 'ch-test-starter-fb',
    shopId: testStarterShop.id,
    platform: 'facebook',
    pageId: 'page_test_starter_999',
    accessToken: 'mock_starter_token',
    isActive: true,
  };

  await db.saveShop(testStarterShop);
  await db.saveProduct(testStarterShop.id, testProduct);
  await db.saveChannelConnection(testStarterShop.id, testChannel);

  // --------------------------------------------------------------------------
  // TEST SECTION 1: Provider Metrics & High Gross Margin Verification
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Provider Metrics & Unit Economics ---');
  const metrics = await db.getProviderMetrics();
  assert(metrics.totalShops >= 3, `Total shops tracked: ${metrics.totalShops} (>= 3)`);
  assert(metrics.monthlyRecurringRevenueMmk >= 25000, `MRR in MMK: ${metrics.monthlyRecurringRevenueMmk.toLocaleString()} MMK`);
  assert(metrics.monthlyRecurringRevenueUsd > 0, `MRR in USD: $${metrics.monthlyRecurringRevenueUsd}`);
  assert(metrics.estimatedMonthlyCogsUsd < 100, `Provider COGS is strictly controlled: $${metrics.estimatedMonthlyCogsUsd}`);
  assert(metrics.grossMarginPercent >= 90, `Gross Margin exceeds target: ${metrics.grossMarginPercent}% (>= 90%)`);

  // --------------------------------------------------------------------------
  // TEST SECTION 2: Starter Plan Quota Tracking
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Starter Plan Order Quotas ---');
  const initialQuota = await db.checkTenantOrderQuota(testStarterShop.id);
  assert(initialQuota.canCreateOrder === true, 'Starter shop with 0 orders can create orders');
  assert(initialQuota.remainingOrders === 100, `Remaining order quota is 100 (got ${initialQuota.remainingOrders})`);
  assert(initialQuota.plan === 'starter', 'Recognized as Starter plan');

  // Place a regular order to verify counter
  const orderRes1 = await processCustomerMessage(
    '၁ ချောင်း ယူမယ်။ ဒေါ်ရွှေမန်း ၀၉-၇၉၁၁၁၂၂၃၃၊ စမ်းချောင်း။ အိမ်ရောက်ငွေချေမယ်',
    {
      shop: testStarterShop,
      products: [testProduct],
      customerName: 'Daw Shwe Mann',
      channel: testChannel,
    }
  );
  assert(orderRes1.completedOrder !== undefined, 'Order successfully finalized within quota');
  assert(orderRes1.completedOrder?.status === 'confirmed', 'COD order is confirmed');

  const afterOrderQuota = await db.checkTenantOrderQuota(testStarterShop.id);
  assert(afterOrderQuota.remainingOrders === 99, `Remaining orders decremented to 99 (got ${afterOrderQuota.remainingOrders})`);

  // --------------------------------------------------------------------------
  // TEST SECTION 3: Quota Limit Exceeded & Prompt for Pro Upgrade
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Quota Limit Exceeded & Upgrade Notification ---');
  // Simulate reaching the monthly quota by filling dummy orders
  for (let i = 2; i <= 100; i++) {
    await db.createOrder(testStarterShop.id, {
      platform: 'facebook',
      customerPlatformId: `cust_${i}`,
      customerName: `Customer ${i}`,
      customerPhone: '09791112233',
      township: 'Sanchaung',
      fullAddress: 'Sanchaung',
      items: [{ productId: testProduct.id, name: testProduct.nameMm, quantity: 1, priceMmk: 12000 }],
      subtotalMmk: 12000,
      deliveryFeeMmk: 2500,
      totalMmk: 14500,
      paymentMethod: 'cod',
      status: 'confirmed',
    });
  }

  const exhaustedQuota = await db.checkTenantOrderQuota(testStarterShop.id);
  assert(exhaustedQuota.canCreateOrder === false, 'canCreateOrder is FALSE after 100 orders on Starter');
  assert(exhaustedQuota.remainingOrders === 0, 'Remaining orders is 0');

  // Attempt 101st order
  const orderResExceeded = await processCustomerMessage(
    '၁ ချောင်း ယူမယ်။ ဒေါ်ရွှေမန်း ၀၉-၇၉၁၁၁၂၂၃၃၊ စမ်းချောင်း။ အိမ်ရောက်ငွေချေမယ်',
    {
      shop: testStarterShop,
      products: [testProduct],
      customerName: 'Daw Shwe Mann',
      channel: testChannel,
    }
  );
  assert(orderResExceeded.completedOrder === undefined, 'Order is NOT created when quota is exhausted');
  assert(orderResExceeded.replyText.includes('STARTER Plan') || orderResExceeded.replyText.includes('ပမာဏ'), 'Polite Burmese upgrade notification returned');

  // --------------------------------------------------------------------------
  // TEST SECTION 4: Dynamic Upgrade to Pro Tier & Quota Unlock
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Dynamic Merchant Upgrade to Pro Tier ---');
  const upgradedShop = await db.updateShopSubscription(testStarterShop.id, 'pro');
  assert(upgradedShop?.subscription?.plan === 'pro', 'Plan upgraded to PRO');
  assert(upgradedShop?.subscription?.monthlyOrderLimit === 1000, 'Monthly order limit increased to 1,000');
  assert(upgradedShop?.subscription?.priceMmk === 25000, 'Price set to 25,000 MMK/mo');

  const proQuota = await db.checkTenantOrderQuota(testStarterShop.id);
  assert(proQuota.canCreateOrder === true, 'canCreateOrder unlocked immediately after upgrade to Pro');
  assert(proQuota.remainingOrders === 900, `Remaining quota updated to 900 (1000 - 100 used)`);

  // Verify that an order can now be placed
  const orderResAfterUpgrade = await processCustomerMessage(
    '၁ ချောင်း ယူမယ်။ ဒေါ်ရွှေမန်း ၀၉-၇၉၁၁၁၂၂၃၃၊ စမ်းချောင်း။ အိမ်ရောက်ငွေချေမယ်',
    {
      shop: upgradedShop!,
      products: [testProduct],
      customerName: 'Daw Shwe Mann',
      channel: testChannel,
    }
  );
  assert(orderResAfterUpgrade.completedOrder !== undefined, 'Order successfully created after upgrading to Pro!');

  // Verify Provider MRR grew
  const updatedMetrics = await db.getProviderMetrics();
  assert(updatedMetrics.proCount > metrics.proCount, `Pro shops count increased from ${metrics.proCount} to ${updatedMetrics.proCount}`);
  assert(updatedMetrics.monthlyRecurringRevenueMmk > metrics.monthlyRecurringRevenueMmk, 'Provider MRR dynamically increased after upgrade');

  // --------------------------------------------------------------------------
  // TEST SECTION 5: Tier 0 Local NLP Zero Cost & <10ms SLA Execution
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Tier 0 Zero-Cost NLP Execution SLA ---');
  const startTime = Date.now();
  const ruleReply = await processCustomerMessage('နှုတ်ခမ်းနီ ဈေးဘယ်လောက်လဲ', {
    shop: upgradedShop!,
    products: [testProduct],
  });
  const durationMs = Date.now() - startTime;
  assert(ruleReply.replyText.includes('12,000'), 'Tier 0 quotes exact product price without LLM call');
  assert(durationMs < 100, `Tier 0 response executed in ${durationMs}ms (Well within 3,000ms SLA, $0.00 COGS)`);

  console.log('\n================================================================');
  console.log(`TOTAL TIER 5 ASSERTIONS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('\n>>> ALL SAAS PROVIDER GOVERNANCE & QUOTA TESTS PASSED 100%! <<<\n');
  } else {
    process.exit(1);
  }
}

runProviderQuotasTests().catch((err) => {
  console.error('Tier 5 Runner Error:', err);
  process.exit(1);
});
