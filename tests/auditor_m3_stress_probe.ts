import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { GET as getFb, POST as postFb } from '../src/app/api/webhooks/facebook/route';
import { GET as getTt, POST as postTt } from '../src/app/api/webhooks/tiktok/route';
import { sendFacebookMessage, fetchFacebookConversations, fetchFacebookThreadMessages, _mockFacebookSentMessages } from '../src/lib/facebook';
import { sendTikTokMessage, fetchTikTokConversations, fetchTikTokThreadMessages, _mockTikTokSentMessages } from '../src/lib/tiktok';
import { db } from '../src/lib/db';

let passed = 0;
let total = 0;

function assert(cond: boolean, name: string, detail?: string) {
  total++;
  if (cond) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${name} - ${detail || ''}`);
  }
}

async function runAuditorStressProbe() {
  console.log('=== AUDITOR M3 ADVERSARIAL STRESS PROBE ===\n');

  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  const initialDbRaw = fs.readFileSync(dbPath, 'utf-8');
  const initialHash = crypto.createHash('sha256').update(initialDbRaw).digest('hex');

  // 1. Edge Case: Facebook parameter validation
  const fbRes1 = await sendFacebookMessage('   ', 'hello', 'mock_token');
  assert(!fbRes1.success && fbRes1.error === 'Missing recipientId', 'FB rejects whitespace recipientId');

  const fbRes2 = await sendFacebookMessage('123', '   ', 'mock_token');
  assert(!fbRes2.success && fbRes2.error === 'Message text cannot be empty', 'FB rejects whitespace messageText');

  const fbRes3 = await sendFacebookMessage('123', 'hello', '   ');
  assert(!fbRes3.success && fbRes3.error === 'Missing pageAccessToken', 'FB rejects whitespace pageAccessToken');

  // 2. Edge Case: TikTok parameter validation
  const ttRes1 = await sendTikTokMessage('   ', 'hello', 'tt_mock_token');
  assert(!ttRes1.success && ttRes1.error === 'Missing or empty conversationId', 'TT rejects whitespace conversationId');

  const ttRes2 = await sendTikTokMessage('123', '   ', 'tt_mock_token');
  assert(!ttRes2.success && ttRes2.error === 'Missing or empty messageText', 'TT rejects whitespace messageText');

  const ttRes3 = await sendTikTokMessage('123', 'hello', '   ');
  assert(!ttRes3.success && ttRes3.error === 'Missing or empty accessToken', 'TT rejects whitespace accessToken');

  // 3. Edge Case: Facebook Webhook with unknown pageId
  const unknownFbPayload = {
    object: 'page',
    entry: [{
      id: 'completely_unknown_page_999999999',
      messaging: [{
        sender: { id: 'attacker_psid' },
        recipient: { id: 'completely_unknown_page_999999999' },
        message: { text: 'Injected message' },
      }],
    }],
  };
  const prevFbCount = _mockFacebookSentMessages.length;
  const unknownReq = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
    method: 'POST',
    body: JSON.stringify(unknownFbPayload),
  });
  const unknownRes = await postFb(unknownReq);
  assert(unknownRes.status === 200, 'Unknown page returns 200 (Meta requirement to avoid retries)');
  assert(_mockFacebookSentMessages.length === prevFbCount, 'No outbound message dispatched for unknown page');

  // 4. Edge Case: Facebook Webhook Echo Suppression
  const echoPayload = {
    object: 'page',
    entry: [{
      id: '109283746501928',
      messaging: [{
        sender: { id: '109283746501928' },
        recipient: { id: 'psid_customer_01' },
        message: { is_echo: true, text: 'Self message echo' },
      }],
    }],
  };
  const echoReq = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
    method: 'POST',
    body: JSON.stringify(echoPayload),
  });
  await postFb(echoReq);
  assert(_mockFacebookSentMessages.length === prevFbCount, 'Echo message ignored without outbound reply');

  // 5. Edge Case: TikTok Webhook with unknown tenant
  const prevTtCount = _mockTikTokSentMessages.length;
  const unknownTtPayload = {
    event: 'im.message.receive',
    data: {
      shop_id: 'non_existent_shop_999',
      sender_id: 'attacker_tt',
      conversation_id: 'conv_999',
      content: { text: 'Malicious payload' },
    },
  };
  const unknownTtReq = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
    method: 'POST',
    body: JSON.stringify(unknownTtPayload),
  });
  const unknownTtRes = await postTt(unknownTtReq);
  assert(unknownTtRes.status === 200, 'Unknown TikTok tenant returns 200');
  const unknownTtJson = await unknownTtRes.json();
  assert(unknownTtJson.message === 'no_tenant', 'Unknown TikTok tenant returns no_tenant');
  assert(_mockTikTokSentMessages.length === prevTtCount, 'No outbound message dispatched for unknown TT tenant');

  // 6. Stress Test: Multiple Rapid Webhook Inbound Calls do NOT alter data/db.json
  for (let i = 0; i < 20; i++) {
    const rapidFbReq = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify({
        object: 'page',
        entry: [{
          id: '109283746501928',
          messaging: [{
            sender: { id: `rapid_psid_${i}` },
            recipient: { id: '109283746501928' },
            message: { text: `Stress message ${i}: ဈေးနှုန်းဘယ်လောက်လဲ` },
          }],
        }],
      }),
    });
    await postFb(rapidFbReq);
  }

  const postDbRaw = fs.readFileSync(dbPath, 'utf-8');
  const postHash = crypto.createHash('sha256').update(postDbRaw).digest('hex');
  assert(initialHash === postHash, 'data/db.json SHA-256 hash is 100% UNCHANGED after 20 inbound webhooks (Zero-Chat Storage)');

  const postParsed = JSON.parse(postDbRaw);
  assert(
    JSON.stringify(Object.keys(postParsed).sort()) === JSON.stringify(['channels', 'orders', 'products', 'shops']),
    'Database root keys remain strictly 4 entities after stress webhooks'
  );

  console.log(`\nAUDITOR STRESS PROBE RESULT: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runAuditorStressProbe().catch((err) => {
  console.error(err);
  process.exit(1);
});
