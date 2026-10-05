import fs from 'fs';
import path from 'path';
import { MultiTenantDB } from '../../../src/lib/db';

async function forensicAudit() {
  console.log('=== INDEPENDENT FORENSIC AUDIT: MILESTONE 1 ===');
  let assertions = 0;
  function auditAssert(cond: boolean, name: string) {
    if (!cond) {
      console.error(`[AUDIT FAIL] ${name}`);
      process.exit(1);
    }
    console.log(`[AUDIT PASS] ${name}`);
    assertions++;
  }

  // 1. Direct inspection of supabase/migrations/001_multi_tenant_schema.sql
  const rootDir = process.cwd();
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '001_multi_tenant_schema.sql');
  auditAssert(fs.existsSync(migrationPath), 'Production migration file exists in supabase/migrations/');
  
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  auditAssert(/CREATE TABLE IF NOT EXISTS shops/i.test(sql), 'DDL: shops table defined');
  auditAssert(/CREATE TABLE IF NOT EXISTS channel_connections/i.test(sql), 'DDL: channel_connections table defined');
  auditAssert(/CREATE TABLE IF NOT EXISTS products/i.test(sql), 'DDL: products table defined');
  auditAssert(/CREATE TABLE IF NOT EXISTS orders/i.test(sql), 'DDL: orders table defined');
  
  // RLS check
  auditAssert(/ALTER TABLE shops ENABLE ROW LEVEL SECURITY;/i.test(sql), 'RLS enabled on shops');
  auditAssert(/ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;/i.test(sql), 'RLS enabled on channel_connections');
  auditAssert(/ALTER TABLE products ENABLE ROW LEVEL SECURITY;/i.test(sql), 'RLS enabled on products');
  auditAssert(/ALTER TABLE orders ENABLE ROW LEVEL SECURITY;/i.test(sql), 'RLS enabled on orders');

  // Verify FOREIGN KEY and CASCADE rules
  auditAssert(/REFERENCES shops\(id\) ON DELETE CASCADE/i.test(sql), 'Foreign key references shops(id) with CASCADE');

  // Zero-chat check on SQL
  const forbiddenTables = ['conversations', 'messages', 'chat_logs', 'chat_history', 'chat_messages'];
  for (const t of forbiddenTables) {
    const tableRegex = new RegExp(`CREATE TABLE[^;]+${t}\\s*\\(`, 'i');
    auditAssert(!tableRegex.test(sql), `Zero-chat: No ${t} table defined in SQL`);
  }

  // 2. Direct inspection of data/db.json
  const dbJsonPath = path.join(rootDir, 'data', 'db.json');
  auditAssert(fs.existsSync(dbJsonPath), 'data/db.json exists on disk');
  const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));

  auditAssert(Array.isArray(dbData.shops) && dbData.shops.length >= 2, 'data/db.json has valid shops array');
  auditAssert(Array.isArray(dbData.products) && dbData.products.length >= 2, 'data/db.json has valid products array');
  auditAssert(Array.isArray(dbData.channels) && dbData.channels.length >= 2, 'data/db.json has valid channels array');
  auditAssert(Array.isArray(dbData.orders) && dbData.orders.length >= 2, 'data/db.json has valid orders array');

  // Zero-chat check on db.json
  auditAssert(!('conversations' in dbData), 'data/db.json contains no conversations key');
  auditAssert(!('messages' in dbData), 'data/db.json contains no messages key');
  auditAssert(!('chat_logs' in dbData), 'data/db.json contains no chat_logs key');

  for (const o of dbData.orders) {
    auditAssert(!('conversationId' in o), `Order ${o.id} has no conversationId`);
    auditAssert(typeof o.customerPlatformId === 'string' && o.customerPlatformId.length > 0, `Order ${o.id} has customerPlatformId`);
    auditAssert(typeof o.platform === 'string', `Order ${o.id} has platform`);
  }

  // 3. Stress-testing MultiTenantDB implementation
  const tempTestPath = path.join(rootDir, 'data', 'temp_audit_stress.json');
  if (fs.existsSync(tempTestPath)) fs.unlinkSync(tempTestPath);

  const testDb = new MultiTenantDB(tempTestPath);
  
  // Stress Test A: Stock underflow protection
  const testProd = await testDb.saveProduct('shop-yangon-01', {
    id: 'prod-stress-1',
    sku: 'STRESS-01',
    nameMm: 'စမ်းသပ်ပစ္စည်း',
    nameEn: 'Test Item',
    category: 'Test',
    priceMmk: 1000,
    stockQuantity: 5,
    imageUrl: '',
    isAvailable: true
  });

  const decremented = await testDb.updateProductStock('shop-yangon-01', 'prod-stress-1', -10);
  auditAssert(decremented !== null && decremented.stockQuantity === 0, 'Stock cannot be negative (clamped at 0)');
  auditAssert(decremented !== null && decremented.isAvailable === false, 'Stock 0 sets isAvailable to false');

  // Stress Test B: Cross-tenant isolation during updates
  // Updating shop-mdy-02 should not find prod-stress-1
  const crossUpdate = await testDb.updateProductStock('shop-mdy-02', 'prod-stress-1', 10);
  auditAssert(crossUpdate === null, 'Cannot update another shop product (tenant isolation preserved)');

  // Stress Test C: Unknown channel lookup
  const unknownChan = await testDb.findShopByChannel('facebook', 'completely-non-existent-id');
  auditAssert(unknownChan === null, 'findShopByChannel returns null for nonexistent channel');

  // Stress Test D: Corrupted file recovery
  fs.writeFileSync(tempTestPath, '{{{ corrupt json !!!');
  const recoveryDb = new MultiTenantDB(tempTestPath);
  const recoveredShops = await recoveryDb.listShops();
  auditAssert(recoveredShops.length >= 2, 'Corrupted db.json automatically re-seeds and recovers safely');

  // Clean up
  if (fs.existsSync(tempTestPath)) fs.unlinkSync(tempTestPath);

  console.log(`\n=== INDEPENDENT AUDIT COMPLETE: ALL ${assertions} CHECKS PASSED CLEANLY! ===`);
}

forensicAudit().catch((e) => {
  console.error('Audit script failed:', e);
  process.exit(1);
});
