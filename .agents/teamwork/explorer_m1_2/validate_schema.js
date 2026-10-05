const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'proposed_001_multi_tenant_schema.sql');
const content = fs.readFileSync(schemaPath, 'utf8');

const tests = [
  { name: 'Contains shops table', regex: /CREATE TABLE (IF NOT EXISTS )?shops\s*\(/i },
  { name: 'Contains channel_connections table', regex: /CREATE TABLE (IF NOT EXISTS )?channel_connections\s*\(/i },
  { name: 'Contains products table', regex: /CREATE TABLE (IF NOT EXISTS )?products\s*\(/i },
  { name: 'Contains orders table', regex: /CREATE TABLE (IF NOT EXISTS )?orders\s*\(/i },
  { name: 'No conversations table', test: () => !/CREATE TABLE[^\n]+conversations/i.test(content) },
  { name: 'No messages table', test: () => !/CREATE TABLE[^\n]+messages/i.test(content) },
  { name: 'RLS enabled on shops', regex: /ALTER TABLE shops ENABLE ROW LEVEL SECURITY;/i },
  { name: 'RLS enabled on channel_connections', regex: /ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;/i },
  { name: 'RLS enabled on products', regex: /ALTER TABLE products ENABLE ROW LEVEL SECURITY;/i },
  { name: 'RLS enabled on orders', regex: /ALTER TABLE orders ENABLE ROW LEVEL SECURITY;/i },
  { name: 'Tenant isolation policy using auth.jwt() ->> shop_id', regex: /auth\.jwt\(\)\s*->>\s*'shop_id'/i },
  { name: 'Service role bypass in policies', regex: /auth\.role\(\)\s*=\s*'service_role'/i },
  { name: 'Index on shop_id', regex: /idx_channel_connections_shop_id/i },
  { name: 'Composite lookup index (shop_id, platform, page_id)', regex: /\(shop_id,\s*platform,\s*page_id\)/i },
  { name: 'Zero-chat runtime assertion present', regex: /ZERO CHAT STORAGE VIOLATION/i },
  { name: 'All 4 required tables present', test: () => {
      const tables = content.match(/CREATE TABLE (IF NOT EXISTS )?(\w+)/gi) || [];
      const tableNames = tables.map(t => t.split(/\s+/).pop());
      return tableNames.length === 4 && 
             ['shops', 'channel_connections', 'products', 'orders'].every(t => tableNames.includes(t));
    }
  }
];

let failed = 0;
console.log('--- RUNNING SQL SCHEMA VALIDATION SUITE ---');
for (const t of tests) {
  let ok = false;
  if (t.regex) {
    ok = t.regex.test(content);
  } else if (t.test) {
    ok = t.test();
  }
  if (ok) {
    console.log(`[PASS] ${t.name}`);
  } else {
    console.error(`[FAIL] ${t.name}`);
    failed++;
  }
}

if (failed === 0) {
  console.log('\n>>> ALL 16 SQL SCHEMA CHECKS PASSED CLEANLY! <<<');
  process.exit(0);
} else {
  console.error(`\n>>> ${failed} CHECKS FAILED! <<<`);
  process.exit(1);
}
