/**
 * Milestone 3 Adversarial Challenge Suite:
 * Stress-Testing Webhooks, Concurrency, Multi-Tenant Isolation, Echo Suppression & Zero-Chat Invariant
 * 
 * Coverage:
 *  1. High-Concurrency Burst Stress Testing (100 concurrent FB & 100 concurrent TikTok requests)
 *  2. Multi-Tenant Isolation & Identity Spoofing Stress Testing (Unknown pages, cross-platform injection)
 *  3. Malformed & Boundary Payloads (Invalid JSON, empty objects, missing senders/content, non-string types)
 *  4. Bot Echo Suppression (is_echo: true, alternating echo bursts)
 *  5. Outbound Dispatcher Boundaries (Giant strings, emojis, whitespace, invalid parameters)
 *  6. On-Demand Fetcher Stress & Ephemeral Verification
 *  7. Forensic Zero-Chat DB & Disk Invariant (Deep recursive inspection of data/db.json)
 */

import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { GET as getFacebookWebhook, POST as postFacebookWebhook } from '../src/app/api/webhooks/facebook/route';
import { GET as getTikTokWebhook, POST as postTikTokWebhook } from '../src/app/api/webhooks/tiktok/route';
import {
  sendFacebookMessage,
  fetchFacebookConversations,
  fetchFacebookThreadMessages,
  isFacebookMockMode,
  _mockFacebookSentMessages,
  _resetMockFacebookMessages,
} from '../src/lib/facebook';
import {
  sendTikTokMessage,
  fetchTikTokConversations,
  fetchTikTokThreadMessages,
  isTikTokMockMode,
  _mockTikTokSentMessages,
  _resetMockTikTokMessages,
} from '../src/lib/tiktok';
import { db } from '../src/lib/db';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedAssertions++;
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

export async function runChallengeM3() {
  console.log('================================================================');
  console.log('CHALLENGER M3: ADVERSARIAL STRESS TEST & INTEGRITY PROBE');
  console.log('================================================================\n');

  const initialDbRaw = fs.readFileSync(path.join(process.cwd(), 'data', 'db.json'), 'utf-8');
  const initialDb = JSON.parse(initialDbRaw);

  // ============================================================================
  // SUITE 1: High-Concurrency Burst Stress Testing (Facebook & TikTok)
  // ============================================================================
  console.log('--- SUITE 1: High-Concurrency Burst Stress Testing ---');
  {
    _resetMockFacebookMessages();

    // 1.1 Burst of 100 concurrent requests to /api/webhooks/facebook
    // 40 Yangon, 40 Mandalay, 20 Unknown Page
    const fbBurstPromises: Promise<any>[] = [];

    for (let i = 0; i < 40; i++) {
      const payload = {
        object: 'page',
        entry: [{
          id: '109283746501928', // Yangon Shop
          messaging: [{
            sender: { id: `cust_fb_ygn_${i}` },
            recipient: { id: '109283746501928' },
            message: { text: `Serum စျေးဘယ်လောက်လဲ request_${i}` },
          }],
        }],
      };
      const req = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      fbBurstPromises.push(postFacebookWebhook(req));
    }

    for (let i = 0; i < 40; i++) {
      const payload = {
        object: 'page',
        entry: [{
          id: '209384756102938', // Mandalay Shop
          messaging: [{
            sender: { id: `cust_fb_mdy_${i}` },
            recipient: { id: '209384756102938' },
            message: { text: `ပုဆိုး ဈေးဘယ်လောက်လဲ request_${i}` },
          }],
        }],
      };
      const req = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      fbBurstPromises.push(postFacebookWebhook(req));
    }

    for (let i = 0; i < 20; i++) {
      const payload = {
        object: 'page',
        entry: [{
          id: `unknown_page_${i}_99999`,
          messaging: [{
            sender: { id: `cust_fb_unknown_${i}` },
            recipient: { id: `unknown_page_${i}_99999` },
            message: { text: `Hello from unknown page ${i}` },
          }],
        }],
      };
      const req = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      fbBurstPromises.push(postFacebookWebhook(req));
    }

    const fbResponses = await Promise.all(fbBurstPromises);

    assert(fbResponses.length === 100, 'Processed 100 concurrent Facebook webhook requests');
    assert(
      fbResponses.every((r) => r.status === 200),
      'All 100 concurrent Facebook webhook requests returned HTTP 200'
    );

    // Verify outbound count: exactly 80 messages (40 Yangon + 40 Mandalay, 0 Unknown)
    assert(
      _mockFacebookSentMessages.length === 80,
      `Exactly 80 outbound messages dispatched (actual: ${_mockFacebookSentMessages.length})`
    );

    // Verify tenant cross-contamination: Yangon vs Mandalay isolation under concurrency
    let yangonMentionsMandalay = false;
    let mandalayMentionsYangon = false;
    let unknownReceivedReply = false;

    for (const msg of _mockFacebookSentMessages) {
      if (msg.recipientId.startsWith('cust_fb_ygn_')) {
        if (msg.messageText.includes('ပုဆိုး') || msg.messageText.includes('မန္တလေး')) {
          yangonMentionsMandalay = true;
        }
      } else if (msg.recipientId.startsWith('cust_fb_mdy_')) {
        if (msg.messageText.includes('Niacinamide') || msg.messageText.includes('Serum')) {
          mandalayMentionsYangon = true;
        }
      } else if (msg.recipientId.startsWith('cust_fb_unknown_')) {
        unknownReceivedReply = true;
      }
    }

    assert(!yangonMentionsMandalay, 'Yangon recipients never received Mandalay product replies under concurrency');
    assert(!mandalayMentionsYangon, 'Mandalay recipients never received Yangon product replies under concurrency');
    assert(!unknownReceivedReply, 'Unknown page recipients received zero outbound replies');

    // 1.2 Burst of 100 concurrent requests to /api/webhooks/tiktok
    _resetMockTikTokMessages();
    const ttBurstPromises: Promise<any>[] = [];

    // 40 Yangon via shop_id
    for (let i = 0; i < 40; i++) {
      const payload = {
        event: 'im.message.receive',
        data: {
          shop_id: 'tt_shop_8291029',
          sender_id: `cust_tt_ygn_shop_${i}`,
          conversation_id: `conv_tt_ygn_shop_${i}`,
          content: { text: `Serum စျေးဘယ်လောက်လဲ tt_${i}` },
        },
      };
      const req = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      ttBurstPromises.push(postTikTokWebhook(req));
    }

    // 30 Yangon via channel_id
    for (let i = 0; i < 30; i++) {
      const payload = {
        event: 'im.message.receive',
        data: {
          channel_id: 'ch-tt-01',
          sender_id: `cust_tt_ygn_chan_${i}`,
          conversation_id: `conv_tt_ygn_chan_${i}`,
          content: { text: `Lip tint စျေးဘယ်လောက်လဲ tt_${i}` },
        },
      };
      const req = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      ttBurstPromises.push(postTikTokWebhook(req));
    }

    // 30 Unknown TikTok shop
    for (let i = 0; i < 30; i++) {
      const payload = {
        event: 'im.message.receive',
        data: {
          shop_id: `unknown_tt_shop_${i}_888`,
          sender_id: `cust_tt_unknown_${i}`,
          conversation_id: `conv_tt_unknown_${i}`,
          content: { text: `Hello from unknown tt shop ${i}` },
        },
      };
      const req = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      ttBurstPromises.push(postTikTokWebhook(req));
    }

    const ttResponses = await Promise.all(ttBurstPromises);
    assert(ttResponses.length === 100, 'Processed 100 concurrent TikTok webhook requests');
    assert(
      ttResponses.every((r) => r.status === 200),
      'All 100 concurrent TikTok webhook requests returned HTTP 200'
    );

    // Verify outbound count: exactly 70 messages (40 + 30, 0 Unknown)
    assert(
      _mockTikTokSentMessages.length === 70,
      `Exactly 70 outbound messages dispatched for TikTok (actual: ${_mockTikTokSentMessages.length})`
    );

    const unknownTtReply = _mockTikTokSentMessages.some((m) => m.conversationId.includes('unknown'));
    assert(!unknownTtReply, 'Unknown TikTok shops dispatched zero outbound messages');
  }

  // ============================================================================
  // SUITE 2: Multi-Tenant Isolation & Identity Spoofing Stress Testing
  // ============================================================================
  console.log('\n--- SUITE 2: Multi-Tenant Isolation & Identity Spoofing Stress Testing ---');
  {
    _resetMockFacebookMessages();
    _resetMockTikTokMessages();

    // 2.1 Adversarial Page IDs that could trigger fallback or SQL/prototype injection
    const adversarialPageIds = [
      '',
      '0',
      'null',
      'undefined',
      '__proto__',
      'constructor',
      'toString',
      'NaN',
      'admin',
      'shop-yangon-01', // Passing shopId instead of pageId
      'shop-mdy-02',
      "109283746501928' OR '1'='1",
      '../escape_tenant',
      '<script>alert(1)</script>',
    ];

    for (const badPageId of adversarialPageIds) {
      // Direct DB check
      const match = await db.findShopByChannel('facebook', badPageId);
      assert(match === null, `db.findShopByChannel('facebook', "${badPageId}") strictly returns null`);

      // Webhook route check
      const payload = {
        object: 'page',
        entry: [{
          id: badPageId,
          messaging: [{
            sender: { id: 'cust_spoof_01' },
            recipient: { id: badPageId },
            message: { text: 'Testing spoofing' },
          }],
        }],
      };
      const req = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const res = await postFacebookWebhook(req);
      assert(res.status === 200, `Webhook handles bad page ID "${badPageId}" with 200 OK`);
    }

    assert(
      _mockFacebookSentMessages.length === 0,
      'Zero outbound messages sent across all 14 adversarial page ID injection attempts'
    );

    // 2.2 Cross-Platform Channel Injection
    // Inject Facebook Page ID into TikTok Webhook
    const crossPlatformFbToTt = {
      event: 'im.message.receive',
      data: {
        shop_id: '109283746501928', // Valid FB page ID passed to TikTok
        sender_id: 'attacker_01',
        conversation_id: 'conv_cross_01',
        content: { text: 'Cross-platform injection attack' },
      },
    };
    const reqCross1 = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
      method: 'POST',
      body: JSON.stringify(crossPlatformFbToTt),
    });
    const resCross1 = await postTikTokWebhook(reqCross1);
    const jsonCross1 = await resCross1.json();
    assert(jsonCross1.message === 'no_tenant', 'Cross-platform FB Page ID rejected by TikTok webhook as no_tenant');

    // Inject TikTok Shop ID into Facebook Webhook
    const crossPlatformTtToFb = {
      object: 'page',
      entry: [{
        id: 'tt_shop_8291029', // Valid TikTok page ID passed to FB
        messaging: [{
          sender: { id: 'attacker_02' },
          recipient: { id: 'tt_shop_8291029' },
          message: { text: 'Cross-platform injection attack' },
        }],
      }],
    };
    const reqCross2 = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify(crossPlatformTtToFb),
    });
    const resCross2 = await postFacebookWebhook(reqCross2);
    assert(resCross2.status === 200, 'Cross-platform TikTok ID handled by FB webhook with 200 OK');
    assert(_mockFacebookSentMessages.length === 0, 'Cross-platform TikTok ID sent zero outbound messages from FB route');
  }

  // ============================================================================
  // SUITE 3: Malformed & Boundary Payloads Stress Testing
  // ============================================================================
  console.log('\n--- SUITE 3: Malformed & Boundary Payloads Stress Testing ---');
  {
    _resetMockFacebookMessages();
    _resetMockTikTokMessages();

    // 3.1 Facebook: Invalid JSON Body
    const reqInvalidJson = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: '{{malformed json content:::',
      headers: { 'content-type': 'application/json' },
    });
    const resInvalidJson = await postFacebookWebhook(reqInvalidJson);
    assert(resInvalidJson.status === 500, 'Invalid JSON body returns HTTP 500 cleanly without crashing process');

    // 3.2 Facebook: Non-page object
    const reqNotPage = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify({ object: 'instagram', entry: [] }),
    });
    const resNotPage = await postFacebookWebhook(reqNotPage);
    assert(resNotPage.status === 404, 'Object !== "page" returns HTTP 404');

    // 3.3 Facebook: Missing entry array
    const reqMissingEntry = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify({ object: 'page' }), // missing entry
    });
    const resMissingEntry = await postFacebookWebhook(reqMissingEntry);
    assert(resMissingEntry.status === 500, 'Missing entry property returns HTTP 500 handled error');

    // 3.4 Facebook: Empty entry array
    const reqEmptyEntry = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify({ object: 'page', entry: [] }),
    });
    const resEmptyEntry = await postFacebookWebhook(reqEmptyEntry);
    assert(resEmptyEntry.status === 200, 'Empty entry array returns 200 EVENT_RECEIVED');

    // 3.5 Facebook: Missing messaging array
    const reqMissingMessaging = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify({
        object: 'page',
        entry: [{ id: '109283746501928' }],
      }),
    });
    const resMissingMessaging = await postFacebookWebhook(reqMissingMessaging);
    assert(resMissingMessaging.status === 200, 'Missing messaging array returns 200 without throwing');

    // 3.6 Facebook: Missing message object
    const reqMissingMessage = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify({
        object: 'page',
        entry: [{
          id: '109283746501928',
          messaging: [{ sender: { id: 'cust_01' }, recipient: { id: '109283746501928' } }],
        }],
      }),
    });
    const resMissingMessage = await postFacebookWebhook(reqMissingMessage);
    assert(resMissingMessage.status === 200, 'Missing message object returns 200 without throwing');

    // 3.7 Facebook: Empty text string
    const reqEmptyText = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify({
        object: 'page',
        entry: [{
          id: '109283746501928',
          messaging: [{
            sender: { id: 'cust_01' },
            recipient: { id: '109283746501928' },
            message: { text: '' },
          }],
        }],
      }),
    });
    const resEmptyText = await postFacebookWebhook(reqEmptyText);
    assert(resEmptyText.status === 200, 'Empty text string returns 200 without dispatching outbound reply');

    // 3.8 TikTok: Invalid JSON Body
    const reqTtInvalidJson = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
      method: 'POST',
      body: '<<unparseable json>>',
      headers: { 'content-type': 'application/json' },
    });
    const resTtInvalidJson = await postTikTokWebhook(reqTtInvalidJson);
    assert(resTtInvalidJson.status === 500, 'TikTok invalid JSON returns HTTP 500 cleanly');

    // 3.9 TikTok: Missing event / unknown event
    const reqTtUnknownEvent = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
      method: 'POST',
      body: JSON.stringify({ event: 'user.follow', data: {} }),
    });
    const resTtUnknownEvent = await postTikTokWebhook(reqTtUnknownEvent);
    const jsonTtUnknownEvent = await resTtUnknownEvent.json();
    assert(resTtUnknownEvent.status === 200, 'TikTok unknown event returns 200');
    assert(jsonTtUnknownEvent.message === 'received', 'TikTok unknown event returns message: received');

    // 3.10 TikTok: Missing content & text
    const reqTtEmptyContent = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
      method: 'POST',
      body: JSON.stringify({
        event: 'im.message.receive',
        data: { shop_id: 'tt_shop_8291029', sender_id: 'tt_cust_01' },
      }),
    });
    const resTtEmptyContent = await postTikTokWebhook(reqTtEmptyContent);
    const jsonTtEmptyContent = await resTtEmptyContent.json();
    assert(jsonTtEmptyContent.message === 'success', 'TikTok missing text returns message: success without dispatching');

    assert(_mockFacebookSentMessages.length === 0, 'Zero Facebook outbound messages for malformed payloads');
    assert(_mockTikTokSentMessages.length === 0, 'Zero TikTok outbound messages for malformed payloads');
  }

  // ============================================================================
  // SUITE 4: Bot Echo & Self-Loop Suppression
  // ============================================================================
  console.log('\n--- SUITE 4: Bot Echo & Self-Loop Suppression ---');
  {
    _resetMockFacebookMessages();

    // 4.1 Page-to-Customer Echo (is_echo: true)
    const echoPayload = {
      object: 'page',
      entry: [{
        id: '109283746501928',
        messaging: [{
          sender: { id: '109283746501928' },
          recipient: { id: 'cust_psid_999' },
          message: {
            is_echo: true,
            mid: 'mid.mock_echo_123',
            text: 'မင်မင်တို့ဆိုင်မှ ကြိုဆိုပါတယ်ရှင့်',
          },
        }],
      }],
    };
    const reqEcho = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify(echoPayload),
    });
    const resEcho = await postFacebookWebhook(reqEcho);
    assert(resEcho.status === 200, 'Echo payload returns 200 OK');
    assert(_mockFacebookSentMessages.length === 0, 'Bot echo is suppressed (zero outbound messages)');

    // 4.2 Alternating burst of 20 messages (10 regular, 10 echo)
    const alternatingPromises: Promise<any>[] = [];
    for (let i = 0; i < 20; i++) {
      const isEcho = i % 2 === 1;
      const payload = {
        object: 'page',
        entry: [{
          id: '109283746501928',
          messaging: [{
            sender: { id: `cust_alt_${i}` },
            recipient: { id: '109283746501928' },
            message: {
              is_echo: isEcho,
              text: `Message ${i}`,
            },
          }],
        }],
      };
      const req = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alternatingPromises.push(postFacebookWebhook(req));
    }

    await Promise.all(alternatingPromises);
    assert(
      _mockFacebookSentMessages.length === 10,
      `Alternating burst of 20 (10 regular, 10 echo) yielded exactly 10 outbound messages (actual: ${_mockFacebookSentMessages.length})`
    );
  }

  // ============================================================================
  // SUITE 5: Outbound Dispatchers & Parameter Boundary Stress
  // ============================================================================
  console.log('\n--- SUITE 5: Outbound Dispatchers & Parameter Boundary Stress ---');
  {
    _resetMockFacebookMessages();
    _resetMockTikTokMessages();

    // 5.1 Giant payload (10,000 chars) to Facebook
    const giantText = 'မြန်မာ'.repeat(1666); // ~10,000 chars
    const fbGiantRes = await sendFacebookMessage('psid_giant', giantText, 'EAA_mock_token');
    assert(fbGiantRes.success === true, 'Facebook outbound handles 10,000 char message');
    assert(
      _mockFacebookSentMessages[0].messageText.length <= 2000,
      'Facebook outbound message text is truncated to <= 2000 chars'
    );
    assert(
      _mockFacebookSentMessages[0].messageText.endsWith('...'),
      'Truncated Facebook message ends with ellipsis "..."'
    );

    // 5.2 Giant payload (10,000 chars) to TikTok
    const ttGiantRes = await sendTikTokMessage('conv_giant', giantText, 'tt_mock_token');
    assert(ttGiantRes.success === true, 'TikTok outbound handles 10,000 char message');
    assert(
      _mockTikTokSentMessages.length === 1 && _mockTikTokSentMessages[0].conversationId === 'conv_giant',
      'TikTok mock spy recorded sent giant message'
    );

    // 5.3 Complex Myanmar Unicode, Zawgyi, Emojis, Symbols
    const complexText = 'မင်္ဂလာပါရှင် 🌸\n💰 စျေးနှုန်း - 28,000 Ks\n📍 စမ်းချောင်း (Sanchaung)\nFamily: 👨‍👩‍👧‍👦\nSymbols: © ® ™ § & < > " \'';
    const fbComplex = await sendFacebookMessage('psid_complex', complexText, 'EAA_mock_token');
    assert(fbComplex.success === true, 'Facebook outbound handles multi-line emojis and Burmese script');
    assert(
      _mockFacebookSentMessages[1].messageText === complexText,
      'Facebook outbound preserves Burmese script and multi-byte emojis'
    );

    // 5.4 Whitespace and invalid parameter validations
    const whitespaceCases = ['', '   ', '\t\n\r'];
    for (const ws of whitespaceCases) {
      const fbBadRecip = await sendFacebookMessage(ws, 'text', 'EAA_mock_token');
      assert(!fbBadRecip.success, `sendFacebookMessage rejects whitespace recipientId ("${ws.replace(/\s/g, '\\s')}")`);

      const fbBadText = await sendFacebookMessage('psid_01', ws, 'EAA_mock_token');
      assert(!fbBadText.success, `sendFacebookMessage rejects whitespace messageText ("${ws.replace(/\s/g, '\\s')}")`);

      const fbBadToken = await sendFacebookMessage('psid_01', 'text', ws);
      assert(!fbBadToken.success, `sendFacebookMessage rejects whitespace pageAccessToken ("${ws.replace(/\s/g, '\\s')}")`);

      const ttBadConv = await sendTikTokMessage(ws, 'text', 'tt_mock_token');
      assert(!ttBadConv.success, `sendTikTokMessage rejects whitespace conversationId ("${ws.replace(/\s/g, '\\s')}")`);

      const ttBadText = await sendTikTokMessage('conv_01', ws, 'tt_mock_token');
      assert(!ttBadText.success, `sendTikTokMessage rejects whitespace messageText ("${ws.replace(/\s/g, '\\s')}")`);

      const ttBadToken = await sendTikTokMessage('conv_01', 'text', ws);
      assert(!ttBadToken.success, `sendTikTokMessage rejects whitespace accessToken ("${ws.replace(/\s/g, '\\s')}")`);
    }
  }

  // ============================================================================
  // SUITE 6: On-Demand Fetcher Concurrency & Ephemeral Integrity
  // ============================================================================
  console.log('\n--- SUITE 6: On-Demand Fetcher Concurrency & Ephemeral Integrity ---');
  {
    // Burst of concurrent calls to on-demand fetchers
    const fetchPromises = [
      fetchFacebookConversations('109283746501928', 'EAA_mock_token'),
      fetchFacebookConversations('209384756102938', 'EAAX_MOCK_TOKEN_MDY'),
      fetchFacebookThreadMessages('t_fb_yangon_01', 'EAA_mock_token'),
      fetchFacebookThreadMessages('t_fb_mdy_01', 'EAAX_MOCK_TOKEN_MDY'),
      fetchTikTokConversations('tt_mock_token'),
      fetchTikTokThreadMessages('conv-tt-01', 'tt_mock_token'),
      fetchFacebookConversations('unknown_page', 'EAA_mock_token'),
      fetchTikTokConversations(''),
    ];

    const fetchResults = await Promise.all(fetchPromises);
    assert(fetchResults.length === 8, '8 concurrent on-demand fetch operations completed');
    assert(Array.isArray(fetchResults[0]) && fetchResults[0].length > 0, 'Yangon FB conversations returned array');
    assert(Array.isArray(fetchResults[1]) && fetchResults[1].length > 0, 'Mandalay FB conversations returned array');
    assert(Array.isArray(fetchResults[2]) && fetchResults[2].length > 0, 'Yangon FB thread messages returned array');
    assert(Array.isArray(fetchResults[3]) && fetchResults[3].length > 0, 'Mandalay FB thread messages returned array');
    assert(Array.isArray(fetchResults[4]) && fetchResults[4].length > 0, 'TikTok conversations returned array');
    assert(Array.isArray(fetchResults[5]) && fetchResults[5].length > 0, 'TikTok thread messages returned array');
    assert(Array.isArray(fetchResults[7]) && fetchResults[7].length === 0, 'Empty token returns empty array');
  }

  // ============================================================================
  // SUITE 7: Forensic Zero-Chat DB & Disk Invariant
  // ============================================================================
  console.log('\n--- SUITE 7: Forensic Zero-Chat DB & Disk Invariant ---');
  {
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    const currentDbRaw = fs.readFileSync(dbPath, 'utf-8');
    const currentDb = JSON.parse(currentDbRaw);

    // Root key check
    const rootKeys = Object.keys(currentDb).sort();
    assert(
      JSON.stringify(rootKeys) === JSON.stringify(['channels', 'orders', 'products', 'shops']),
      'Database root keys strictly remain ["channels", "orders", "products", "shops"]'
    );

    // Forbid any chat keys
    const forbiddenKeys = [
      'conversations',
      'messages',
      'chat',
      'chats',
      'chat_logs',
      'chat_history',
      'inbox',
      'threads',
      'webhook_events',
      'raw_events',
    ];
    for (const key of forbiddenKeys) {
      assert(!(key in currentDb), `Database does NOT contain forbidden key "${key}"`);
    }

    // Deep recursive scan: ensure no nested object has chat history or message arrays
    let hasChatKey = false;
    let chatKeyFound = '';

    function recursiveCheck(obj: any, pathName = '') {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        const fullPath = pathName ? `${pathName}.${k}` : k;
        if (forbiddenKeys.includes(k.toLowerCase())) {
          hasChatKey = true;
          chatKeyFound = fullPath;
        }
        if (typeof v === 'object') {
          recursiveCheck(v, fullPath);
        }
      }
    }

    recursiveCheck(currentDb);
    assert(!hasChatKey, `Deep recursive scan found zero chat-related keys (violating path: ${chatKeyFound || 'none'})`);

    // Verify order count unchanged (no bogus orders written during chat simulation)
    assert(
      currentDb.orders.length === initialDb.orders.length,
      `Order count is strictly preserved (${currentDb.orders.length} orders)`
    );

    // Verify shops and products unchanged
    assert(
      currentDb.shops.length === initialDb.shops.length,
      `Shop count is strictly preserved (${currentDb.shops.length} shops)`
    );
    assert(
      currentDb.products.length === initialDb.products.length,
      `Product count is strictly preserved (${currentDb.products.length} products)`
    );

    // Verify db class interface
    assert(typeof (db as any).getShop === 'function', 'db.getShop exists');
    assert(typeof (db as any).findShopByChannel === 'function', 'db.findShopByChannel exists');
    assert((db as any).conversations === undefined, 'MultiTenantDB has no conversations property');
    assert((db as any).messages === undefined, 'MultiTenantDB has no messages property');
    assert((db as any).saveMessage === undefined, 'MultiTenantDB has no saveMessage method');
    assert((db as any).getConversations === undefined, 'MultiTenantDB has no getConversations method');
  }

  console.log('\n================================================================');
  console.log(`TOTAL ADVERSARIAL ASSERTIONS: ${totalAssertions}`);
  console.log(`PASSED: ${passedAssertions}`);
  console.log(`FAILED: ${failedAssertions}`);
  console.log('================================================================');

  if (failedAssertions === 0) {
    console.log('\n>>> ADVERSARIAL VERDICT: APPROVE (ALL STRESS TESTS PASSED) <<<\n');
  } else {
    console.error('\n>>> ADVERSARIAL VERDICT: REJECT (FAILURES DETECTED) <<<\n');
    process.exit(1);
  }
}

if (require.main === module || !process.env.VITEST) {
  runChallengeM3().catch((err) => {
    console.error('Adversarial challenge execution exception:', err);
    process.exit(1);
  });
}
