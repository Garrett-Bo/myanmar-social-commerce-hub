import fs from 'fs';
import path from 'path';
import { MultiTenantDB, db } from '../src/lib/db';
import { Product, Order, ChannelConnection, Shop } from '../src/types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failedTests++;
  }
}

async function runAdversarialProbes() {
  console.log('================================================================');
  console.log('ADVERSARIAL ZERO-CHAT STORAGE & SCHEMA CLEANLINESS PROBE');
  console.log('================================================================\n');

  // ============================================================================
  // PROBE 1: Strict Disk Inspection of data/db.json
  // ============================================================================
  console.log('--- PROBE 1: Strict Disk Inspection of data/db.json ---');
  const dbJsonPath = path.join(process.cwd(), 'data', 'db.json');
  assert(fs.existsSync(dbJsonPath), 'data/db.json exists on disk');

  const rawJsonContent = fs.readFileSync(dbJsonPath, 'utf-8');
  let parsedDbJson: any;
  try {
    parsedDbJson = JSON.parse(rawJsonContent);
    assert(true, 'data/db.json is valid parseable JSON');
  } catch (err: any) {
    assert(false, 'data/db.json is valid parseable JSON', err.message);
  }

  // Check root keys strictly
  const rootKeys = Object.keys(parsedDbJson).sort();
  const expectedRootKeys = ['channels', 'orders', 'products', 'shops'].sort();
  assert(
    JSON.stringify(rootKeys) === JSON.stringify(expectedRootKeys),
    'data/db.json root keys strictly match ["channels", "orders", "products", "shops"]',
    `Found keys: ${JSON.stringify(rootKeys)}`
  );

  assert(rootKeys.length === 4, `data/db.json contains exactly 4 root keys (found ${rootKeys.length})`);
  assert(!('conversations' in parsedDbJson), 'data/db.json has NO "conversations" root key');
  assert(!('messages' in parsedDbJson), 'data/db.json has NO "messages" root key');
  assert(!('chat_logs' in parsedDbJson), 'data/db.json has NO "chat_logs" root key');
  assert(!('chat_history' in parsedDbJson), 'data/db.json has NO "chat_history" root key');
  assert(!('threads' in parsedDbJson), 'data/db.json has NO "threads" root key');

  // Verify all root elements are arrays
  assert(Array.isArray(parsedDbJson.shops), 'data/db.json "shops" is an Array');
  assert(Array.isArray(parsedDbJson.products), 'data/db.json "products" is an Array');
  assert(Array.isArray(parsedDbJson.channels), 'data/db.json "channels" is an Array');
  assert(Array.isArray(parsedDbJson.orders), 'data/db.json "orders" is an Array');

  // Inspect orders on disk for zero-chat invariant
  console.log('\n--- PROBE 1.1: Deep Inspection of Orders in data/db.json ---');
  let allOrdersCleanOfConversationId = true;
  let allOrdersHaveCustomerPlatformId = true;
  let allOrdersHavePlatform = true;

  for (const order of parsedDbJson.orders) {
    if ('conversationId' in order || 'conversation_id' in order || 'threadId' in order) {
      allOrdersCleanOfConversationId = false;
    }
    if (!order.customerPlatformId || typeof order.customerPlatformId !== 'string') {
      allOrdersHaveCustomerPlatformId = false;
    }
    if (!order.platform || !['facebook', 'tiktok', 'manual'].includes(order.platform)) {
      allOrdersHavePlatform = false;
    }
  }

  assert(
    allOrdersCleanOfConversationId,
    'All orders on disk have zero conversationId, conversation_id, or threadId references'
  );
  assert(
    allOrdersHaveCustomerPlatformId,
    'All orders on disk reference customerPlatformId (stateless platform user ID)'
  );
  assert(
    allOrdersHavePlatform,
    'All orders on disk specify valid platform ("facebook" | "tiktok" | "manual")'
  );

  // ============================================================================
  // PROBE 2: MultiTenantDB API & Unsupported Chat Operations Probe
  // ============================================================================
  console.log('\n--- PROBE 2: MultiTenantDB Unsupported Chat Operations Probe ---');
  const testDb = new MultiTenantDB();

  // Forbidden properties
  assert((testDb as any).conversations === undefined, 'testDb.conversations is undefined');
  assert((testDb as any).messages === undefined, 'testDb.messages is undefined');
  assert((testDb as any).chat_logs === undefined, 'testDb.chat_logs is undefined');
  assert((testDb as any).chats === undefined, 'testDb.chats is undefined');

  // Forbidden methods
  const forbiddenMethods = [
    'getConversations',
    'getConversation',
    'addConversation',
    'saveConversation',
    'deleteConversation',
    'listConversations',
    'getMessages',
    'getMessage',
    'addMessage',
    'saveMessage',
    'deleteMessage',
    'listMessages',
    'queryChat',
    'saveChat',
    'fetchChatHistory',
    'storeMessage',
  ];

  for (const method of forbiddenMethods) {
    assert((testDb as any)[method] === undefined, `Method testDb.${method} does not exist (undefined)`);
    try {
      (testDb as any)[method]('dummy-arg');
      assert(false, `Calling testDb.${method}() should throw TypeError`);
    } catch (err: any) {
      assert(
        err instanceof TypeError && err.message.includes('is not a function'),
        `Calling testDb.${method}() properly throws TypeError: is not a function`
      );
    }
  }

  // ============================================================================
  // PROBE 3: Adversarial Database Poisoning & Auto-Purging Test
  // ============================================================================
  console.log('\n--- PROBE 3: Adversarial Database Poisoning & Auto-Purging ---');
  const poisonTestPath = path.join(process.cwd(), 'data', 'adversarial_poison_test.json');
  if (fs.existsSync(poisonTestPath)) {
    fs.unlinkSync(poisonTestPath);
  }

  // Create a deliberately poisoned database file with injected chat records
  const poisonedContent = {
    shops: [...parsedDbJson.shops],
    products: [...parsedDbJson.products],
    channels: [...parsedDbJson.channels],
    orders: [...parsedDbJson.orders],
    conversations: [
      { id: 'conv-injected-999', shopId: 'shop-yangon-01', messages: ['illegal message'] },
    ],
    messages: [
      { id: 'msg-injected-888', text: 'illegal chat history text' },
    ],
    chat_logs: [
      { timestamp: '2026-10-04T12:00:00Z', log: 'confidential conversation log' },
    ],
    malicious_extra_field: 'leakage',
  };

  fs.writeFileSync(poisonTestPath, JSON.stringify(poisonedContent, null, 2), 'utf-8');
  assert(fs.existsSync(poisonTestPath), 'Poisoned DB test file created');

  // Load poisoned file into MultiTenantDB
  const poisonedDb = new MultiTenantDB(poisonTestPath);

  // Verify internal exportData does NOT contain poisoned keys
  const exported = poisonedDb.exportData();
  assert(!('conversations' in exported), 'exportData() does NOT include poisoned "conversations"');
  assert(!('messages' in exported), 'exportData() does NOT include poisoned "messages"');
  assert(!('chat_logs' in exported), 'exportData() does NOT include poisoned "chat_logs"');
  assert(!('malicious_extra_field' in exported), 'exportData() does NOT include "malicious_extra_field"');
  assert(
    JSON.stringify(Object.keys(exported).sort()) === JSON.stringify(expectedRootKeys),
    'exportData() keys strictly match 4 canonical entities'
  );

  // Trigger a persistence write through a legitimate mutation (e.g. updating stock)
  await poisonedDb.updateProductStock('shop-yangon-01', 'prod-01', -1);

  // Inspect the file on disk: The poisoned keys MUST HAVE BEEN PURGED!
  const diskAfterMutation = JSON.parse(fs.readFileSync(poisonTestPath, 'utf-8'));
  const diskKeysAfter = Object.keys(diskAfterMutation).sort();

  assert(!('conversations' in diskAfterMutation), 'Poisoned "conversations" PURGED from disk on write');
  assert(!('messages' in diskAfterMutation), 'Poisoned "messages" PURGED from disk on write');
  assert(!('chat_logs' in diskAfterMutation), 'Poisoned "chat_logs" PURGED from disk on write');
  assert(!('malicious_extra_field' in diskAfterMutation), 'Poisoned extra field PURGED from disk on write');
  assert(
    JSON.stringify(diskKeysAfter) === JSON.stringify(expectedRootKeys),
    'Disk schema strictly restored to 4 canonical root arrays after mutation'
  );

  // Clean up poison test file
  if (fs.existsSync(poisonTestPath)) {
    fs.unlinkSync(poisonTestPath);
  }

  // ============================================================================
  // PROBE 4: Order Creation & Schema Independence from conversationId
  // ============================================================================
  console.log('\n--- PROBE 4: Order Creation & Schema Independence from conversationId ---');
  const isolatedTestDbPath = path.join(process.cwd(), 'data', 'adversarial_order_test.json');
  if (fs.existsSync(isolatedTestDbPath)) {
    fs.unlinkSync(isolatedTestDbPath);
  }

  const orderTestDb = new MultiTenantDB(isolatedTestDbPath);
  const createdOrder = await orderTestDb.createOrder('shop-yangon-01', {
    platform: 'facebook',
    customerPlatformId: 'fb_psid_adv_9999',
    customerName: 'Daw Ni Ni',
    customerPhone: '09798888888',
    township: 'Hlaing',
    fullAddress: 'Pyay Road, Hlaing Township, Yangon',
    items: [{ productId: 'prod-01', name: 'Serum', quantity: 1, priceMmk: 28000 }],
    subtotalMmk: 28000,
    deliveryFeeMmk: 2500,
    totalMmk: 30500,
    paymentMethod: 'kpay',
    status: 'pending_slip',
  });

  assert(createdOrder.id.startsWith('ord-'), 'Order created with valid id prefix');
  assert(createdOrder.shopId === 'shop-yangon-01', 'Order created with correct shopId');
  assert(createdOrder.platform === 'facebook', 'Order references social platform: facebook');
  assert(createdOrder.customerPlatformId === 'fb_psid_adv_9999', 'Order references customerPlatformId');
  assert((createdOrder as any).conversationId === undefined, 'Order object has NO conversationId');
  assert((createdOrder as any).conversation_id === undefined, 'Order object has NO conversation_id');

  // Verify order query does not require conversationId
  const retrievedOrders = await orderTestDb.getOrders('shop-yangon-01');
  const foundOrder = retrievedOrders.find((o) => o.id === createdOrder.id);
  assert(foundOrder !== undefined, 'Order retrieved successfully by shopId without conversationId');
  assert((foundOrder as any)?.conversationId === undefined, 'Retrieved order has NO conversationId');

  // Clean up order test file
  if (fs.existsSync(isolatedTestDbPath)) {
    fs.unlinkSync(isolatedTestDbPath);
  }

  // ============================================================================
  // PROBE 5: Static Analysis of src/types/index.ts
  // ============================================================================
  console.log('\n--- PROBE 5: Static Analysis of src/types/index.ts ---');
  const typesPath = path.join(process.cwd(), 'src', 'types', 'index.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf-8');

  // Extract Order interface definition
  const orderInterfaceMatch = typesContent.match(/export interface Order\s*\{([\s\S]*?)\}/);
  assert(orderInterfaceMatch !== null, 'Found "export interface Order" in src/types/index.ts');

  if (orderInterfaceMatch) {
    const orderBody = orderInterfaceMatch[1];
    assert(
      !orderBody.includes('conversationId'),
      'src/types/index.ts: interface Order DOES NOT contain "conversationId"'
    );
    assert(
      !orderBody.includes('conversation_id'),
      'src/types/index.ts: interface Order DOES NOT contain "conversation_id"'
    );
    assert(
      orderBody.includes('platform: PlatformType;'),
      'src/types/index.ts: interface Order contains "platform: PlatformType;"'
    );
    assert(
      orderBody.includes('customerPlatformId: string;'),
      'src/types/index.ts: interface Order contains "customerPlatformId: string;"'
    );
  }

  // Verify JSDoc comment for Ephemeral types
  assert(
    typesContent.includes('EPHEMERAL CHANNEL TYPES (Zero-Chat Storage Architecture)'),
    'src/types/index.ts explicitly documents Ephemeral Channel Types'
  );
  assert(
    typesContent.includes('STRICT INVARIANT: These are NOT database entities and must NEVER be persisted in the DB.'),
    'src/types/index.ts documents zero-chat persistence invariant'
  );

  // ============================================================================
  // PROBE 6: Static Analysis of supabase/migrations/001_multi_tenant_schema.sql
  // ============================================================================
  console.log('\n--- PROBE 6: Static Analysis of supabase/migrations/001_multi_tenant_schema.sql ---');
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '001_multi_tenant_schema.sql');
  assert(fs.existsSync(sqlPath), 'Migration file exists: supabase/migrations/001_multi_tenant_schema.sql');

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  // Match all CREATE TABLE statements
  const createTableMatches = Array.from(
    sqlContent.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_]+)\s*\(/gi)
  ).map((m) => m[1].toLowerCase());

  const expectedTables = ['shops', 'channel_connections', 'products', 'orders'].sort();
  const actualTables = [...createTableMatches].sort();

  assert(
    JSON.stringify(actualTables) === JSON.stringify(expectedTables),
    `SQL migration contains strictly 4 tables: ${JSON.stringify(expectedTables)}`,
    `Found tables: ${JSON.stringify(actualTables)}`
  );

  // Ensure NO chat tables created
  const forbiddenTables = ['conversations', 'messages', 'chat_logs', 'chat_history', 'chats', 'threads'];
  for (const table of forbiddenTables) {
    assert(!actualTables.includes(table), `SQL migration does NOT create table "${table}"`);
  }

  // Inspect orders table definition in SQL
  const ordersTableMatch = sqlContent.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?orders\s*\(([\s\S]*?)\);/i);
  assert(ordersTableMatch !== null, 'SQL migration defines table "orders"');

  if (ordersTableMatch) {
    const ordersSql = ordersTableMatch[1];
    assert(!ordersSql.includes('conversation_id'), 'SQL orders table does NOT have "conversation_id" column');
    assert(!ordersSql.includes('conversationId'), 'SQL orders table does NOT have "conversationId" column');
    assert(!ordersSql.includes('REFERENCES conversations'), 'SQL orders table has NO foreign key to conversations');
    assert(ordersSql.includes('customer_platform_id TEXT NOT NULL'), 'SQL orders table has "customer_platform_id" column');
    assert(ordersSql.includes('platform TEXT NOT NULL'), 'SQL orders table has "platform" column');
  }

  // Verify RLS is enabled for all 4 tables
  for (const table of ['shops', 'channel_connections', 'products', 'orders']) {
    assert(
      new RegExp(`ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i').test(sqlContent),
      `Row Level Security explicitly enabled on "${table}"`
    );
  }

  // Verify Zero-Chat Runtime Assertion block in SQL
  assert(
    sqlContent.includes('ZERO CHAT STORAGE VIOLATION: Forbidden chat tables detected in public schema!'),
    'SQL migration contains runtime assertion block rejecting chat tables'
  );

  // ============================================================================
  // PROBE 7: Static Analysis of src/lib/db.ts
  // ============================================================================
  console.log('\n--- PROBE 7: Static Analysis of src/lib/db.ts ---');
  const dbTsPath = path.join(process.cwd(), 'src', 'lib', 'db.ts');
  const dbTsContent = fs.readFileSync(dbTsPath, 'utf-8');

  // Check imports: must not import Conversation or Message
  const importMatch = dbTsContent.match(/import\s*\{([^}]+)\}\s*from\s*['"]@\/types['"]/);
  if (importMatch) {
    const importedTypes = importMatch[1].split(',').map((t) => t.trim());
    assert(!importedTypes.includes('Conversation'), 'src/lib/db.ts DOES NOT import Conversation');
    assert(!importedTypes.includes('Message'), 'src/lib/db.ts DOES NOT import Message');
  }

  // Check StoredDatabase interface
  const storedDbMatch = dbTsContent.match(/export interface StoredDatabase\s*\{([\s\S]*?)\}/);
  assert(storedDbMatch !== null, 'src/lib/db.ts defines StoredDatabase interface');
  if (storedDbMatch) {
    const storedDbBody = storedDbMatch[1];
    assert(storedDbBody.includes('shops: Shop[];'), 'StoredDatabase includes shops');
    assert(storedDbBody.includes('products: Product[];'), 'StoredDatabase includes products');
    assert(storedDbBody.includes('channels: ChannelConnection[];'), 'StoredDatabase includes channels');
    assert(storedDbBody.includes('orders: Order[];'), 'StoredDatabase includes orders');
    assert(!storedDbBody.includes('conversation'), 'StoredDatabase has NO conversation field');
    assert(!storedDbBody.includes('message'), 'StoredDatabase has NO message field');
  }

  // ============================================================================
  // SUMMARY RESULTS
  // ============================================================================
  console.log('\n================================================================');
  console.log(`TOTAL PROBES: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('================================================================');

  if (failedTests > 0) {
    console.error(`\n❌ ADVERSARIAL VERDICT: REJECT (${failedTests} failures)`);
    process.exit(1);
  } else {
    console.log(`\n✅ ADVERSARIAL VERDICT: APPROVE (${passedTests}/${totalTests} probes passed cleanly)`);
    process.exit(0);
  }
}

runAdversarialProbes().catch((err) => {
  console.error('Fatal probe execution error:', err);
  process.exit(1);
});
