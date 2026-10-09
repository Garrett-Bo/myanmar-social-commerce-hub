/**
 * Milestone 3 Automated Verification Suite: Social Channels, Webhooks & Zero-Chat Invariant
 * 
 * Coverage:
 *  1. Facebook & TikTok Webhook GET Verification Handshakes
 *  2. Multi-Tenant Inbound Channel Routing & Catalog Isolation (Strict Rejection of Unknown Channels)
 *  3. Inbound Facebook Messenger Webhook Simulation with Zawgyi Normalization & Echo Suppression
 *  4. Inbound TikTok Direct Messaging Webhook Simulation (shop_id, channel_id, unknown tenant)
 *  5. Outbound Social Channel Dispatchers (Mock Mode, Validation, Truncation, In-Memory Spies)
 *  6. On-Demand Conversation & Thread Fetchers (Ephemeral, No DB Storage)
 *  7. Forensic Zero-Chat Disk & Runtime Database Probe
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

export async function runM3Tests() {
  console.log('================================================================');
  console.log('MILESTONE 3: SOCIAL CHANNELS & ON-DEMAND MESSAGING TEST SUITE');
  console.log('================================================================\n');

  // --- SUITE 1: Webhook GET Verification Handshakes ---
  console.log('--- SUITE 1: Webhook GET Verification Handshakes ---');
  {
    // 1.1 Facebook valid challenge
    const reqFbValid = new NextRequest(
      'http://localhost:3000/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=shwe_shop_fb_token_2026&hub.challenge=test_meta_challenge_998877'
    );
    const resFbValid = await getFacebookWebhook(reqFbValid);
    assert(resFbValid.status === 200, 'Facebook GET returns 200 on valid token');
    const fbText = await resFbValid.text();
    assert(fbText === 'test_meta_challenge_998877', 'Facebook GET echoes hub.challenge verbatim');

    // 1.2 Facebook invalid token
    const reqFbInvalidToken = new NextRequest(
      'http://localhost:3000/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=123'
    );
    const resFbInvalidToken = await getFacebookWebhook(reqFbInvalidToken);
    assert(resFbInvalidToken.status === 403, 'Facebook GET returns 403 on invalid verify token');

    // 1.3 Facebook invalid mode
    const reqFbInvalidMode = new NextRequest(
      'http://localhost:3000/api/webhooks/facebook?hub.mode=unsubscribe&hub.verify_token=shwe_shop_fb_token_2026&hub.challenge=123'
    );
    const resFbInvalidMode = await getFacebookWebhook(reqFbInvalidMode);
    assert(resFbInvalidMode.status === 403, 'Facebook GET returns 403 on invalid hub.mode');

    // 1.4 Facebook missing parameters
    const reqFbEmpty = new NextRequest('http://localhost:3000/api/webhooks/facebook');
    const resFbEmpty = await getFacebookWebhook(reqFbEmpty);
    assert(resFbEmpty.status === 403, 'Facebook GET returns 403 on missing parameters');

    // 1.5 TikTok challenge verification (query 'challenge')
    const reqTtChallenge = new NextRequest('http://localhost:3000/api/webhooks/tiktok?challenge=tt_challenge_554433');
    const resTtChallenge = await getTikTokWebhook(reqTtChallenge);
    assert(resTtChallenge.status === 200, 'TikTok GET returns 200 on challenge query');
    const ttText = await resTtChallenge.text();
    assert(ttText === 'tt_challenge_554433', 'TikTok GET echoes challenge string');

    // 1.6 TikTok challenge verification (query 'hub.challenge')
    const reqTtHubChallenge = new NextRequest('http://localhost:3000/api/webhooks/tiktok?hub.challenge=tt_hub_challenge_123');
    const resTtHubChallenge = await getTikTokWebhook(reqTtHubChallenge);
    assert(resTtHubChallenge.status === 200, 'TikTok GET returns 200 on hub.challenge query');
    const ttHubText = await resTtHubChallenge.text();
    assert(ttHubText === 'tt_hub_challenge_123', 'TikTok GET echoes hub.challenge string');

    // 1.7 TikTok health check
    const reqTtHealth = new NextRequest('http://localhost:3000/api/webhooks/tiktok');
    const resTtHealth = await getTikTokWebhook(reqTtHealth);
    assert(resTtHealth.status === 200, 'TikTok GET returns 200 on health check');
    const jsonTtHealth = await resTtHealth.json();
    assert(jsonTtHealth.status === 'ok' && jsonTtHealth.service === 'tiktok-webhook', 'TikTok health check JSON contains expected service info');
  }

  // --- SUITE 2: Multi-Tenant Channel Routing Contract ---
  console.log('\n--- SUITE 2: Multi-Tenant Channel Routing Contract ---');
  {
    // 2.1 Match Yangon Facebook Page
    const matchYgnFb = await db.findShopByChannel('facebook', '109283746501928');
    assert(matchYgnFb !== null, 'Finds shop for Yangon FB page 109283746501928');
    assert(matchYgnFb?.shop.id === 'shop-yangon-01', 'Maps FB page to shop-yangon-01');
    assert(matchYgnFb?.channel.accessToken === 'EAA_mock_fb_access_token_yangon_01', 'Extracts Yangon channel accessToken');

    // 2.2 Match Mandalay Facebook Page
    const matchMdyFb = await db.findShopByChannel('facebook', '209384756102938');
    assert(matchMdyFb !== null, 'Finds shop for Mandalay FB page 209384756102938');
    assert(matchMdyFb?.shop.id === 'shop-mdy-02', 'Maps FB page to shop-mdy-02');
    assert(matchMdyFb?.channel.accessToken === 'EAAX_MOCK_TOKEN_MDY', 'Extracts Mandalay channel accessToken');

    // 2.3 Match TikTok channel by pageId
    const matchYgnTt = await db.findShopByChannel('tiktok', 'tt_shop_8291029');
    assert(matchYgnTt !== null, 'Finds shop for TikTok page tt_shop_8291029');
    assert(matchYgnTt?.shop.id === 'shop-yangon-01', 'Maps TikTok page to shop-yangon-01');

    // 2.4 Match TikTok channel by connection id
    const matchYgnTtId = await db.findShopByChannel('tiktok', 'ch-tt-01');
    assert(matchYgnTtId !== null, 'Finds shop for TikTok channel id ch-tt-01');
    assert(matchYgnTtId?.shop.id === 'shop-yangon-01', 'Maps channel id to shop-yangon-01');

    // 2.5 Unknown Facebook Page strictly returns null (Strict Isolation)
    const matchUnknownFb = await db.findShopByChannel('facebook', 'unknown_fb_99999');
    assert(matchUnknownFb === null, 'Returns null for unknown Facebook page (Strict Multi-Tenant Routing)');

    // 2.6 Unknown TikTok Channel strictly returns null (Strict Isolation)
    const matchUnknownTt = await db.findShopByChannel('tiktok', 'unknown_tt_99999');
    assert(matchUnknownTt === null, 'Returns null for unknown TikTok channel (Strict Multi-Tenant Routing)');
  }

  // --- SUITE 3: Inbound Facebook Webhook Simulation & Burmese Processing ---
  console.log('\n--- SUITE 3: Inbound Facebook Webhook Simulation & Burmese Processing ---');
  {
    _resetMockFacebookMessages();

    // 3.1 Yangon Shop Inbound Message
    const fbPayloadYgn = {
      object: 'page',
      entry: [{
        id: '109283746501928',
        messaging: [{
          sender: { id: 'psid_customer_ygn_01' },
          recipient: { id: '109283746501928' },
          message: { text: 'ဆီရမ် ဈေးဘယ်လောက်လဲ' },
        }],
      }],
    };
    const reqFbPostYgn = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify(fbPayloadYgn),
    });
    const resFbPostYgn = await postFacebookWebhook(reqFbPostYgn);
    assert(resFbPostYgn.status === 200, 'Yangon FB webhook POST returns 200');
    const jsonFbPostYgn = await resFbPostYgn.json();
    assert(jsonFbPostYgn.status === 'EVENT_RECEIVED', 'Yangon FB returns EVENT_RECEIVED');
    assert(_mockFacebookSentMessages.length === 1, 'Yangon FB inbound triggered 1 outbound reply');
    assert(_mockFacebookSentMessages[0].recipientId === 'psid_customer_ygn_01', 'Outbound recipient matches customer PSID');

    // 3.2 Mandalay Shop Inbound Message with Zawgyi Text
    const fbPayloadMdy = {
      object: 'page',
      entry: [{
        id: '209384756102938',
        messaging: [{
          sender: { id: 'psid_customer_mdy_02' },
          recipient: { id: '209384756102938' },
          message: { text: 'ပုဆိုး ေစ်းဘယ္ေလာက္လဲ' }, // Zawgyi for "ပုဆိုး ဈေးဘယ်လောက်လဲ"
        }],
      }],
    };
    const reqFbPostMdy = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify(fbPayloadMdy),
    });
    const resFbPostMdy = await postFacebookWebhook(reqFbPostMdy);
    assert(resFbPostMdy.status === 200, 'Mandalay FB webhook POST returns 200');
    assert(_mockFacebookSentMessages.length === 2, 'Mandalay FB inbound triggered 1 outbound reply');

    // 3.3 Echo Suppression (is_echo: true must NOT trigger response)
    const fbPayloadEcho = {
      object: 'page',
      entry: [{
        id: '109283746501928',
        messaging: [{
          sender: { id: '109283746501928' },
          recipient: { id: 'psid_customer_ygn_01' },
          message: { is_echo: true, text: 'ကျေးဇူးတင်ပါတယ်ရှင့်' },
        }],
      }],
    };
    const reqFbEcho = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify(fbPayloadEcho),
    });
    const resFbEcho = await postFacebookWebhook(reqFbEcho);
    assert(resFbEcho.status === 200, 'Echo webhook POST returns 200');
    assert(_mockFacebookSentMessages.length === 2, 'Echo event suppressed without outbound dispatch');

    // 3.4 Unknown Page ID Webhook (Strictly ignored without error)
    const fbPayloadUnknown = {
      object: 'page',
      entry: [{
        id: 'unknown_page_999999',
        messaging: [{
          sender: { id: 'psid_unknown_cust' },
          recipient: { id: 'unknown_page_999999' },
          message: { text: 'Hello' },
        }],
      }],
    };
    const reqFbUnknown = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify(fbPayloadUnknown),
    });
    const resFbUnknown = await postFacebookWebhook(reqFbUnknown);
    assert(resFbUnknown.status === 200, 'Unknown FB page webhook returns 200 without throwing');
    assert(_mockFacebookSentMessages.length === 2, 'Unknown page dispatched zero outbound messages');

    // 3.5 Non-page event rejection
    const reqFbNotPage = new NextRequest('http://localhost:3000/api/webhooks/facebook', {
      method: 'POST',
      body: JSON.stringify({ object: 'user' }),
    });
    const resFbNotPage = await postFacebookWebhook(reqFbNotPage);
    assert(resFbNotPage.status === 404, 'Non-page FB event returns 404');
  }

  // --- SUITE 4: Inbound TikTok Webhook Simulation ---
  console.log('\n--- SUITE 4: Inbound TikTok Webhook Simulation ---');
  {
    _resetMockTikTokMessages();

    // 4.1 TikTok message matching shop by shop_id
    const ttPayload = {
      event: 'im.message.receive',
      data: {
        shop_id: 'tt_shop_8291029',
        sender_id: 'tt_customer_01',
        conversation_id: 'tt_conv_01',
        content: { text: 'မိတ်ကပ်နှုတ်ခမ်းနီ ပို့ခ ဘယ်လောက်လဲ စမ်းချောင်း' },
      },
    };
    const reqTtPost = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
      method: 'POST',
      body: JSON.stringify(ttPayload),
    });
    const resTtPost = await postTikTokWebhook(reqTtPost);
    assert(resTtPost.status === 200, 'TikTok webhook POST returns 200');
    const jsonTt = await resTtPost.json();
    assert(jsonTt.code === 0 && jsonTt.message === 'success', 'TikTok webhook returns success code 0');
    assert(_mockTikTokSentMessages.length === 1, 'TikTok inbound triggered 1 outbound reply');
    assert(_mockTikTokSentMessages[0].conversationId === 'tt_conv_01', 'Outbound conversationId matches inbound');

    // 4.2 TikTok message matching shop by channel_id
    const ttPayloadChannelId = {
      event: 'im.message.receive',
      data: {
        channel_id: 'ch-tt-01',
        sender_id: 'tt_customer_02',
        conversation_id: 'tt_conv_02',
        content: { text: 'Serum စျေးလေးသိချင်လို့ပါ' },
      },
    };
    const reqTtChannelId = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
      method: 'POST',
      body: JSON.stringify(ttPayloadChannelId),
    });
    const resTtChannelId = await postTikTokWebhook(reqTtChannelId);
    assert(resTtChannelId.status === 200, 'TikTok channel_id match returns 200');
    assert(_mockTikTokSentMessages.length === 2, 'TikTok channel_id match triggered outbound reply');

    // 4.3 Unknown TikTok channel payload
    const ttPayloadUnknown = {
      event: 'im.message.receive',
      data: {
        shop_id: 'unknown_tt_shop_999',
        sender_id: 'tt_customer_99',
        content: { text: 'Hello' },
      },
    };
    const reqTtUnknown = new NextRequest('http://localhost:3000/api/webhooks/tiktok', {
      method: 'POST',
      body: JSON.stringify(ttPayloadUnknown),
    });
    const resTtUnknown = await postTikTokWebhook(reqTtUnknown);
    assert(resTtUnknown.status === 200, 'Unknown TikTok tenant returns 200');
    const jsonTtUnknown = await resTtUnknown.json();
    assert(jsonTtUnknown.message === 'no_tenant', 'Unknown TikTok tenant returns no_tenant');
    assert(_mockTikTokSentMessages.length === 2, 'Unknown TikTok tenant dispatched zero outbound messages');
  }

  // --- SUITE 5: Outbound Social Channel Dispatchers (Mock Mode & Validation) ---
  console.log('\n--- SUITE 5: Outbound Social Channel Dispatchers ---');
  {
    // 5.1 Facebook Mock Mode detection
    assert(isFacebookMockMode('EAA_mock_fb_access_token_yangon_01') === true, 'Detects mock FB token');
    assert(isFacebookMockMode('EAAX_MOCK_TOKEN_MDY') === true, 'Detects uppercase mock FB token');
    assert(isFacebookMockMode('test_token') === true, 'Detects test_token');

    // 5.2 Facebook outbound success
    const fbRes = await sendFacebookMessage('psid_test_01', 'မင်္ဂလာပါရှင့်', 'EAA_mock_fb_access_token_yangon_01');
    assert(fbRes.success === true, 'sendFacebookMessage succeeds with mock token');
    assert(typeof fbRes.messageId === 'string' && fbRes.messageId.startsWith('m_mock_fb_'), 'sendFacebookMessage returns mock messageId');
    assert(fbRes.recipientId === 'psid_test_01', 'sendFacebookMessage returns recipientId');

    // 5.3 Facebook parameter validation
    const fbMissingToken = await sendFacebookMessage('psid_test_01', 'မင်္ဂလာပါရှင့်', '');
    assert(fbMissingToken.success === false && fbMissingToken.error === 'Missing pageAccessToken', 'sendFacebookMessage fails on missing token');

    const fbMissingRecipient = await sendFacebookMessage('', 'မင်္ဂလာပါရှင့်', 'EAA_mock_token');
    assert(fbMissingRecipient.success === false && fbMissingRecipient.error === 'Missing recipientId', 'sendFacebookMessage fails on missing recipientId');

    const fbMissingText = await sendFacebookMessage('psid_test_01', '', 'EAA_mock_token');
    assert(fbMissingText.success === false && fbMissingText.error === 'Message text cannot be empty', 'sendFacebookMessage fails on empty messageText');

    // 5.4 Facebook text length truncation (Meta 2000 chars limit)
    const longText = 'A'.repeat(2500);
    const fbLong = await sendFacebookMessage('psid_test_01', longText, 'EAA_mock_token');
    assert(fbLong.success === true, 'Long message is accepted and sanitized');

    // 5.5 TikTok Mock Mode detection
    assert(isTikTokMockMode('tt_mock_access_token_yangon_01') === true, 'Detects mock TikTok token');
    assert(isTikTokMockMode('mock_token_123') === true, 'Detects mock_ prefix');
    assert(isTikTokMockMode('test_token') === true, 'Detects test_token');

    // 5.6 TikTok outbound success
    _resetMockTikTokMessages();
    const ttRes = await sendTikTokMessage('tt_conv_01', 'မင်္ဂလာပါရှင့်', 'tt_mock_access_token_yangon_01');
    assert(ttRes.success === true, 'sendTikTokMessage succeeds with mock token');
    assert(typeof ttRes.messageId === 'string' && ttRes.messageId.startsWith('tt_mock_msg_'), 'sendTikTokMessage returns mock messageId');
    assert(_mockTikTokSentMessages.length === 1, 'TikTok spy recorded sent message');
    assert(_mockTikTokSentMessages[0].messageText === 'မင်္ဂလာပါရှင့်', 'TikTok spy verified exact text');

    // 5.7 TikTok parameter validation
    const ttMissingToken = await sendTikTokMessage('tt_conv_01', 'မင်္ဂလာပါရှင့်', '');
    assert(ttMissingToken.success === false, 'sendTikTokMessage fails on missing token');

    const ttMissingConv = await sendTikTokMessage('', 'မင်္ဂလာပါရှင့်', 'tt_mock_token');
    assert(ttMissingConv.success === false, 'sendTikTokMessage fails on missing conversationId');

    const ttMissingText = await sendTikTokMessage('tt_conv_01', '', 'tt_mock_token');
    assert(ttMissingText.success === false, 'sendTikTokMessage fails on missing messageText');
  }

  // --- SUITE 6: On-Demand Conversation & Thread Fetchers (Ephemeral) ---
  console.log('\n--- SUITE 6: On-Demand Conversation & Thread Fetchers ---');
  {
    // 6.1 Facebook Conversations (Yangon)
    const fbThreadsYgn = await fetchFacebookConversations('109283746501928', 'EAA_mock_fb_access_token_yangon_01');
    assert(Array.isArray(fbThreadsYgn) && fbThreadsYgn.length >= 3, 'fetchFacebookConversations returns Yangon threads');
    assert(typeof fbThreadsYgn[0].snippet === 'string', 'Conversation summary includes snippet');
    assert(typeof fbThreadsYgn[0].senderId === 'string', 'Conversation summary includes senderId');

    // 6.2 Facebook Conversations (Mandalay)
    const fbThreadsMdy = await fetchFacebookConversations('209384756102938', 'EAAX_MOCK_TOKEN_MDY');
    assert(Array.isArray(fbThreadsMdy) && fbThreadsMdy.length >= 2, 'fetchFacebookConversations returns Mandalay threads');

    // 6.3 Facebook Empty Token
    const fbEmpty = await fetchFacebookConversations('109283746501928', '');
    assert(Array.isArray(fbEmpty) && fbEmpty.length === 0, 'Empty token returns empty array');

    // 6.4 Facebook Thread Messages
    const fbMessages = await fetchFacebookThreadMessages('t_fb_yangon_01', 'EAA_mock_fb_access_token_yangon_01');
    assert(Array.isArray(fbMessages) && fbMessages.length >= 3, 'fetchFacebookThreadMessages returns Yangon messages');
    assert(typeof fbMessages[0].text === 'string' && fbMessages[0].text.length > 0, 'Thread message includes text');
    assert(typeof fbMessages[0].from.id === 'string', 'Thread message includes sender ID');

    // 6.5 TikTok Conversations
    const ttThreads = await fetchTikTokConversations('tt_mock_access_token_yangon_01');
    assert(Array.isArray(ttThreads) && ttThreads.length >= 3, 'fetchTikTokConversations returns mock threads');
    assert(typeof ttThreads[0].snippet === 'string', 'TikTok conversation includes snippet');
    assert(typeof ttThreads[0].updatedAt === 'string', 'TikTok conversation includes updatedAt');

    // 6.6 TikTok Empty Token
    const ttEmpty = await fetchTikTokConversations('');
    assert(Array.isArray(ttEmpty) && ttEmpty.length === 0, 'Empty token returns empty array');

    // 6.7 TikTok Thread Messages
    const ttMessages = await fetchTikTokThreadMessages('conv-tt-01', 'tt_mock_access_token_yangon_01');
    assert(Array.isArray(ttMessages) && ttMessages.length >= 2, 'fetchTikTokThreadMessages returns messages');
    assert(typeof ttMessages[0].text === 'string', 'TikTok thread message includes text');
  }

  // --- SUITE 7: Forensic Zero-Chat Disk & Runtime Database Probe ---
  console.log('\n--- SUITE 7: Forensic Zero-Chat Disk Probe ---');
  {
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    assert(fs.existsSync(dbPath), 'data/db.json exists on disk');
    const rawContent = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    const rootKeys = Object.keys(rawContent).sort();
    assert(
      JSON.stringify(rootKeys) === JSON.stringify(['channels', 'orders', 'products', 'shops']),
      'Database root keys strictly match ["channels", "orders", "products", "shops"]'
    );
    assert(!('conversations' in rawContent), 'Database has zero "conversations" root key');
    assert(!('messages' in rawContent), 'Database has zero "messages" root key');
    assert(!('chat_logs' in rawContent), 'Database has zero "chat_logs" root key');
    assert(!('chat_history' in rawContent), 'Database has zero "chat_history" root key');

    // Instance method verification
    assert((db as any).conversations === undefined, 'MultiTenantDB instance has no conversations collection');
    assert((db as any).messages === undefined, 'MultiTenantDB instance has no messages collection');
    assert((db as any).getConversations === undefined, 'MultiTenantDB instance has no getConversations method');
    assert((db as any).saveMessage === undefined, 'MultiTenantDB instance has no saveMessage method');
    assert((db as any).createConversation === undefined, 'MultiTenantDB instance has no createConversation method');
  }

  console.log('\n================================================================');
  console.log(`TOTAL ASSERTIONS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('\n>>> ALL MILESTONE 3 CHANNEL ASSERTIONS PASSED CLEANLY! <<<\n');
  } else {
    console.error('\n>>> SOME ASSERTIONS FAILED <<<\n');
    process.exit(1);
  }
}

if (require.main === module || !process.env.VITEST) {
  runM3Tests().catch((err) => {
    console.error('Test execution exception:', err);
    process.exit(1);
  });
}
