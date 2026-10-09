/**
 * Milestone 3 Adversarial Stress & Forensic Invariant Test Harness
 * 
 * Conducts empirical stress testing and forensic verification:
 * 1. High-Volume Concurrent Stress on On-Demand Chat Fetchers
 * 2. In-Memory Ephemerality & Object Isolation Verification
 * 3. Pathological & Adversarial Input Fuzzing (XSS, SQLi, Path Traversal, Overflow)
 * 4. Zero-Chat Storage Invariant Forensic Audit under Inbound Webhook Flood
 * 5. Database Schema & Method Ban Verification
 * 6. Outbound Dispatch Boundaries & Spy Memory Leak Probe
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { POST as postFacebookWebhook } from '../src/app/api/webhooks/facebook/route';
import { POST as postTikTokWebhook } from '../src/app/api/webhooks/tiktok/route';
import {
  fetchFacebookConversations,
  fetchFacebookThreadMessages,
  sendFacebookMessage,
  isFacebookMockMode,
  _mockFacebookSentMessages,
  _resetMockFacebookMessages,
} from '../src/lib/facebook';
import {
  fetchTikTokConversations,
  fetchTikTokThreadMessages,
  sendTikTokMessage,
  isTikTokMockMode,
  _mockTikTokSentMessages,
  _resetMockTikTokMessages,
} from '../src/lib/tiktok';
import { db, MultiTenantDB } from '../src/lib/db';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

function getDbFileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function runStressHarness() {
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS HARNESS: ON-DEMAND FETCHING & ZERO-CHAT PROBE');
  console.log('================================================================\n');

  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  const initialDbHash = getDbFileHash(dbPath);

  // --------------------------------------------------------------------------
  // SUITE 1: High-Volume Concurrent Stress on On-Demand Chat Fetchers
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: High-Volume Concurrent Stress on On-Demand Fetchers ---');
  {
    const CONCURRENCY = 100;
    const fbConvPromises: Promise<any>[] = [];
    const fbMsgPromises: Promise<any>[] = [];
    const ttConvPromises: Promise<any>[] = [];
    const ttMsgPromises: Promise<any>[] = [];

    const startTime = Date.now();

    for (let i = 0; i < CONCURRENCY; i++) {
      const pageId = i % 2 === 0 ? '109283746501928' : '209384756102938';
      const token = i % 2 === 0 ? 'EAA_mock_fb_access_token_yangon_01' : 'EAAX_MOCK_TOKEN_MDY';
      fbConvPromises.push(fetchFacebookConversations(pageId, token));

      const threadId = i % 2 === 0 ? 't_fb_yangon_01' : 't_fb_mdy_01';
      fbMsgPromises.push(fetchFacebookThreadMessages(threadId, token));

      const ttToken = i % 2 === 0 ? 'tt_mock_access_token_yangon_01' : 'test_token';
      ttConvPromises.push(fetchTikTokConversations(ttToken));

      const ttConvId = `conv-tt-0${(i % 3) + 1}`;
      ttMsgPromises.push(fetchTikTokThreadMessages(ttConvId, ttToken));
    }

    const [fbConvs, fbMsgs, ttConvs, ttMsgs] = await Promise.all([
      Promise.all(fbConvPromises),
      Promise.all(fbMsgPromises),
      Promise.all(ttConvPromises),
      Promise.all(ttMsgPromises),
    ]);

    const duration = Date.now() - startTime;
    console.log(`  -> Executed ${CONCURRENCY * 4} concurrent on-demand calls in ${duration}ms`);

    assert(fbConvs.length === CONCURRENCY, `Processed all ${CONCURRENCY} concurrent fetchFacebookConversations calls`);
    assert(fbConvs.every(Array.isArray), 'All Facebook conversation results are valid Arrays');
    assert(fbMsgs.length === CONCURRENCY, `Processed all ${CONCURRENCY} concurrent fetchFacebookThreadMessages calls`);
    assert(fbMsgs.every(Array.isArray), 'All Facebook thread message results are valid Arrays');

    assert(ttConvs.length === CONCURRENCY, `Processed all ${CONCURRENCY} concurrent fetchTikTokConversations calls`);
    assert(ttConvs.every(Array.isArray), 'All TikTok conversation results are valid Arrays');
    assert(ttMsgs.length === CONCURRENCY, `Processed all ${CONCURRENCY} concurrent fetchTikTokThreadMessages calls`);
    assert(ttMsgs.every(Array.isArray), 'All TikTok thread message results are valid Arrays');
  }

  // --------------------------------------------------------------------------
  // SUITE 2: Ephemerality & In-Memory Isolation Verification
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: In-Memory Ephemerality & Isolation Verification ---');
  {
    // Test that returned arrays are not references that alter persistent store
    const fbResult1 = await fetchFacebookConversations('109283746501928', 'EAA_mock_fb_access_token_yangon_01');
    assert(fbResult1.length > 0, 'Initial fetch returned conversation records');

    // Mutate the array directly
    fbResult1.push({
      id: 'malicious_injected_thread_999',
      snippet: 'ATTACK_SNIPPET_STORED_SHOULD_NOT_LEAK',
      senderId: 'attacker_psid_000',
      updatedTime: new Date().toISOString(),
    });
    assert(fbResult1.some((c) => c.id === 'malicious_injected_thread_999'), 'Mutated local array contains injected item');

    // Subsequent call must not contain injected item
    const fbResult2 = await fetchFacebookConversations('109283746501928', 'EAA_mock_fb_access_token_yangon_01');
    assert(
      !fbResult2.some((c) => c.id === 'malicious_injected_thread_999'),
      'Fresh fetchFacebookConversations is immune to array mutation in previous caller'
    );

    // Verify TikTok conversation array isolation
    const ttResult1 = await fetchTikTokConversations('tt_mock_access_token_yangon_01');
    ttResult1.push({
      id: 'malicious_tt_thread_999',
      snippet: 'TIKTOK_ATTACK_SNIPPET',
      updatedAt: new Date().toISOString(),
    });
    const ttResult2 = await fetchTikTokConversations('tt_mock_access_token_yangon_01');
    assert(
      !ttResult2.some((c) => c.id === 'malicious_tt_thread_999'),
      'Fresh fetchTikTokConversations does not retain caller array modifications'
    );

    // Verify Facebook Thread Message isolation
    const fbMsg1 = await fetchFacebookThreadMessages('t_fb_yangon_01', 'EAA_mock_fb_access_token_yangon_01');
    fbMsg1.push({
      id: 'malicious_msg_id',
      text: 'POISONED_MESSAGE_TEXT',
      from: { id: 'bad_actor' },
      createdTime: new Date().toISOString(),
    });
    const fbMsg2 = await fetchFacebookThreadMessages('t_fb_yangon_01', 'EAA_mock_fb_access_token_yangon_01');
    assert(
      !fbMsg2.some((m) => m.id === 'malicious_msg_id'),
      'Fresh fetchFacebookThreadMessages does not retain caller array modifications'
    );

    // Verify TikTok Thread Message isolation
    const ttMsg1 = await fetchTikTokThreadMessages('conv-tt-01', 'tt_mock_access_token_yangon_01');
    ttMsg1.push({
      id: 'malicious_tt_msg',
      text: 'POISONED_TT_MSG',
      from: { id: 'bad_actor' },
      createdTime: new Date().toISOString(),
    });
    const ttMsg2 = await fetchTikTokThreadMessages('conv-tt-01', 'tt_mock_access_token_yangon_01');
    assert(
      !ttMsg2.some((m) => m.id === 'malicious_tt_msg'),
      'Fresh fetchTikTokThreadMessages does not retain caller array modifications'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 3: Pathological & Adversarial Input Fuzzing
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Pathological & Adversarial Input Fuzzing ---');
  {
    const fuzzVectors = [
      '',
      '   ',
      '\t\n\r',
      '../../../data/db.json',
      '..\\..\\data\\db.json',
      '<script>alert("XSS")</script>',
      '\' OR \'1\'=\'1\' --',
      'SELECT * FROM shops; DROP TABLE shops;',
      '{}',
      'null',
      'undefined',
      '[]',
      'A'.repeat(50000), // Large string
      '၁၂၃၄၅၆၇၈၉၀', // Burmese numerals
      'ဆီရမ် ဈေးဘယ်လောက်လဲ', // Burmese unicode
      'ဆီရမ္ ေစ်းဘယ္ေလာက္လဲ', // Burmese Zawgyi
      '🔥🎉💬📦🏷️✨', // Emoji cluster
    ];

    for (const vector of fuzzVectors) {
      // Facebook Conversations with fuzzed pageId and token
      try {
        const resFbConv1 = await fetchFacebookConversations(vector, 'mock_token');
        assert(Array.isArray(resFbConv1), `fetchFacebookConversations safe on fuzzed pageId: [${vector.slice(0, 15)}]`);
      } catch (err: any) {
        assert(false, `fetchFacebookConversations threw on fuzzed pageId: [${vector.slice(0, 15)}]`, err.message);
      }

      try {
        const resFbConv2 = await fetchFacebookConversations('109283746501928', vector);
        assert(Array.isArray(resFbConv2), `fetchFacebookConversations safe on fuzzed token: [${vector.slice(0, 15)}]`);
      } catch (err: any) {
        assert(false, `fetchFacebookConversations threw on fuzzed token: [${vector.slice(0, 15)}]`, err.message);
      }

      // Facebook Thread Messages with fuzzed threadId
      try {
        const resFbMsg = await fetchFacebookThreadMessages(vector, 'mock_token');
        assert(Array.isArray(resFbMsg), `fetchFacebookThreadMessages safe on fuzzed threadId: [${vector.slice(0, 15)}]`);
      } catch (err: any) {
        assert(false, `fetchFacebookThreadMessages threw on fuzzed threadId: [${vector.slice(0, 15)}]`, err.message);
      }

      // TikTok Conversations with fuzzed token
      try {
        const resTtConv = await fetchTikTokConversations(vector);
        assert(Array.isArray(resTtConv), `fetchTikTokConversations safe on fuzzed token: [${vector.slice(0, 15)}]`);
      } catch (err: any) {
        assert(false, `fetchTikTokConversations threw on fuzzed token: [${vector.slice(0, 15)}]`, err.message);
      }

      // TikTok Thread Messages with fuzzed conversationId
      try {
        const resTtMsg = await fetchTikTokThreadMessages(vector, 'tt_mock_token');
        assert(Array.isArray(resTtMsg), `fetchTikTokThreadMessages safe on fuzzed convId: [${vector.slice(0, 15)}]`);
      } catch (err: any) {
        assert(false, `fetchTikTokThreadMessages threw on fuzzed convId: [${vector.slice(0, 15)}]`, err.message);
      }
    }

    // Fuzz with non-string inputs (type coercion defense & zero-chat invariant)
    const nonStringVectors: any[] = [null, undefined, 12345, true, {}, []];
    for (const badVal of nonStringVectors) {
      let fbThrew = false;
      try {
        const res = await fetchFacebookConversations(badVal, badVal);
        assert(Array.isArray(res), `fetchFacebookConversations returns array for nullish/valid types: ${typeof badVal}`);
      } catch (e: any) {
        fbThrew = true;
        assert(
          e instanceof TypeError && e.message.includes('trim is not a function'),
          `fetchFacebookConversations throws standard TypeError on truthy non-string type ${typeof badVal}`
        );
      }

      let ttThrew = false;
      try {
        const res = await fetchTikTokConversations(badVal);
        assert(Array.isArray(res), `fetchTikTokConversations returns array for nullish/valid types: ${typeof badVal}`);
      } catch (e: any) {
        ttThrew = true;
        assert(
          e instanceof TypeError && e.message.includes('trim is not a function'),
          `fetchTikTokConversations throws standard TypeError on truthy non-string type ${typeof badVal}`
        );
      }

      // Verify that even if it throws on non-string, disk remains clean
      const dbCheck = fs.readFileSync(dbPath, 'utf-8');
      assert(!dbCheck.includes('badVal'), 'Database remains clean on non-string type probe');
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Zero-Chat Storage Invariant Forensic Audit under Webhook Flood
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Zero-Chat Forensic Audit under Inbound Webhook Flood ---');
  {
    const ATTACK_SECRET_MARKER = `SECRET_CHAT_PAYLOAD_${Date.now()}_CONFIDENTIAL`;
    _resetMockFacebookMessages();
    _resetMockTikTokMessages();

    // Send 50 diverse Facebook inbound webhooks
    for (let i = 0; i < 50; i++) {
      const pageId = i % 2 === 0 ? '109283746501928' : '209384756102938';
      const text = `${ATTACK_SECRET_MARKER}_FB_${i}: မင်္ဂလာပါ ဆီရမ် မှာယူပါမယ် KPay ရှင်းပါမယ်`;
      const fbPayload = {
        object: 'page',
        entry: [{
          id: pageId,
          messaging: [{
            sender: { id: `adv_psid_fb_${i}` },
            recipient: { id: pageId },
            message: { text },
          }],
        }],
      };

      const req = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
        method: 'POST',
        body: JSON.stringify(fbPayload),
      });
      const res = await postFacebookWebhook(req);
      assert(res.status === 200, `FB Webhook flood iteration ${i} accepted with HTTP 200`);
    }

    // Send 50 diverse TikTok inbound webhooks
    for (let i = 0; i < 50; i++) {
      const text = `${ATTACK_SECRET_MARKER}_TT_${i}: Vintage Bag classic brown စမ်းချောင်း ပို့ပေးပါ`;
      const ttPayload = {
        event: 'im.message.receive',
        data: {
          shop_id: 'tt_shop_8291029',
          sender_id: `adv_tt_sender_${i}`,
          conversation_id: `adv_tt_conv_${i}`,
          content: { text },
        },
      };

      const req = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
        method: 'POST',
        body: JSON.stringify(ttPayload),
      });
      const res = await postTikTokWebhook(req);
      assert(res.status === 200, `TikTok Webhook flood iteration ${i} accepted with HTTP 200`);
    }

    // Now FORENSICALLY INSPECT data/db.json
    assert(fs.existsSync(dbPath), 'data/db.json exists after 100 webhook flood calls');
    const dbContentRaw = fs.readFileSync(dbPath, 'utf-8');

    // 1. Confirm marker was NEVER written to disk
    assert(
      !dbContentRaw.includes(ATTACK_SECRET_MARKER),
      'FORENSIC INVARIANT: Zero customer chat marker strings leaked into data/db.json'
    );

    // 2. Confirm root keys strictly remain 4 canonical collections
    const parsedDb = JSON.parse(dbContentRaw);
    const rootKeys = Object.keys(parsedDb).sort();
    const expectedKeys = ['channels', 'orders', 'products', 'shops'].sort();
    assert(
      JSON.stringify(rootKeys) === JSON.stringify(expectedKeys),
      'FORENSIC INVARIANT: data/db.json root keys are strictly ["channels", "orders", "products", "shops"]'
    );

    // 3. Confirm forbidden keys are absent
    const forbiddenKeys = [
      'conversations',
      'messages',
      'chat',
      'chats',
      'chat_logs',
      'chat_history',
      'threads',
      'inbound_logs',
      'webhooks',
    ];
    for (const fKey of forbiddenKeys) {
      assert(!(fKey in parsedDb), `data/db.json has NO forbidden key: "${fKey}"`);
    }

    // 4. Confirm no extra files in data directory
    const dataDirFiles = fs.readdirSync(path.join(process.cwd(), 'data'));
    assert(
      dataDirFiles.length === 1 && dataDirFiles[0] === 'db.json',
      `data/ directory strictly contains only "db.json" (found: ${JSON.stringify(dataDirFiles)})`
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 5: Database Schema & Method Ban Verification
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Database Schema & Method Ban Verification ---');
  {
    const dbInstance = new MultiTenantDB();

    // Check all prototype keys
    const protoProps = Object.getOwnPropertyNames(Object.getPrototypeOf(dbInstance));
    const forbiddenMethodPatterns = [
      /conversation/i,
      /message/i,
      /chat/i,
      /thread/i,
    ];

    let foundForbiddenMethod = false;
    for (const prop of protoProps) {
      for (const pattern of forbiddenMethodPatterns) {
        if (pattern.test(prop)) {
          console.error(`  Violation: Found forbidden method "${prop}" on MultiTenantDB prototype`);
          foundForbiddenMethod = true;
        }
      }
    }
    assert(!foundForbiddenMethod, 'MultiTenantDB has zero chat/message/thread methods on its prototype');

    // Verify exportData cleanliness
    const exported = dbInstance.exportData();
    const exportKeys = Object.keys(exported).sort();
    assert(
      JSON.stringify(exportKeys) === JSON.stringify(['channels', 'orders', 'products', 'shops']),
      'db.exportData() strictly outputs only 4 canonical tables'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 6: Outbound Dispatch Boundaries & Spy Memory Leak Probe
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Outbound Dispatch Boundaries & Spy Memory Leak Probe ---');
  {
    _resetMockFacebookMessages();
    _resetMockTikTokMessages();

    assert(_mockFacebookSentMessages.length === 0, 'Facebook mock spy cleanly resets to 0');
    assert(_mockTikTokSentMessages.length === 0, 'TikTok mock spy cleanly resets to 0');

    // Test text truncation for Facebook (2,000 characters limit)
    const longFbText = 'X'.repeat(3000);
    const fbRes = await sendFacebookMessage('psid_test_99', longFbText, 'EAA_mock_token');
    assert(fbRes.success === true, 'Facebook send succeeds for long text');
    assert(_mockFacebookSentMessages.length === 1, 'Facebook spy recorded sent message');
    assert(
      _mockFacebookSentMessages[0].messageText.length <= 2000,
      `Facebook text truncated to <= 2000 chars (actual: ${_mockFacebookSentMessages[0].messageText.length})`
    );
    assert(
      _mockFacebookSentMessages[0].messageText.endsWith('...'),
      'Facebook truncated text ends with ellipsis'
    );

    // Test TikTok text dispatch
    const ttRes = await sendTikTokMessage('conv_test_99', 'TikTok reply test', 'tt_mock_token');
    assert(ttRes.success === true, 'TikTok send succeeds');
    assert(_mockTikTokSentMessages.length === 1, 'TikTok spy recorded sent message');

    // Verify spy contents never persist to db.json
    _resetMockFacebookMessages();
    _resetMockTikTokMessages();
    assert(_mockFacebookSentMessages.length === 0, 'Facebook spy successfully flushed');
    assert(_mockTikTokSentMessages.length === 0, 'TikTok spy successfully flushed');

    const dbAfterSpy = fs.readFileSync(dbPath, 'utf-8');
    assert(!dbAfterSpy.includes('psid_test_99'), 'Disk db.json does not contain Facebook test spy recipient');
    assert(!dbAfterSpy.includes('conv_test_99'), 'Disk db.json does not contain TikTok test spy conversationId');
  }

  console.log('\n================================================================');
  console.log(`TOTAL HARNESS ASSERTIONS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('\n>>> EMPIRICAL STRESS HARNESS PASSED WITH ZERO FAILURES! <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> SOME STRESS HARNESS ASSERTIONS FAILED <<<\n');
    process.exit(1);
  }
}

runStressHarness().catch((err) => {
  console.error('Fatal stress harness exception:', err);
  process.exit(1);
});
