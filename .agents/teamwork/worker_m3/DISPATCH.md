# Dispatch Assignment: Worker M3 (Social Channels & Webhooks)

**Timestamp**: 2026-10-08T07:45:00Z  
**Role**: `teamwork_preview_worker`  
**Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\worker_m3`  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  

## Mandatory First Steps
1. Read the authoritative user requirements at:
   `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Read the project scope and architecture at:
   `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
3. Read the Milestone 3 Explorer handoff reports:
   - `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m3_1\handoff.md`
   - `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m3_2\handoff.md` (and `proposed_tiktok.ts`)
   - `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m3_3\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## File Write Ownership
You exclusively own and may modify:
- `src/lib/facebook.ts`
- `src/lib/tiktok.ts`
- `src/app/api/webhooks/facebook/route.ts`
- `src/app/api/webhooks/tiktok/route.ts`
- `scripts/verify_m3_channels.ts`

## Implementation Tasks
1. **`src/lib/facebook.ts`**:
   - Implement `sendFacebookMessage(recipientId, messageText, pageAccessToken)` with input validation, timeout protection, Meta Graph API v21.0 payload structure, and mock mode fallback when token contains `mock` or `MOCK_CHANNELS='true'`.
   - Implement `fetchFacebookConversations(pageId, pageAccessToken)` (fetches conversation summaries on-demand, returning ephemeral array without storing in database).
   - Implement `fetchFacebookThreadMessages(threadId, pageAccessToken)` (fetches thread messages on-demand, returning ephemeral array without storing in database).
   - Export in-memory mock sent messages tracker/reset helper if needed for tests.

2. **`src/lib/tiktok.ts`**:
   - Implement `sendTikTokMessage(conversationId, messageText, accessToken)` conforming to TikTok Open API, with mock mode fallback and `_mockTikTokSentMessages` spy.
   - Implement `fetchTikTokConversations(accessToken)` (fetches active customer conversation threads on-demand, returning ephemeral array without storing in database).
   - Implement `fetchTikTokThreadMessages(conversationId, accessToken)` helper.
   - Use proposed implementation from `.agents/teamwork/explorer_m3_2/proposed_tiktok.ts`.

3. **`src/app/api/webhooks/facebook/route.ts`**:
   - Multi-tenant routing: use `await db.findShopByChannel('facebook', pageId)` directly (skip if no shop registered).
   - Bot echo suppression: ensure `!webhookEvent.message.is_echo`.
   - Token extraction: prioritize `channel?.accessToken` over `process.env.FB_PAGE_ACCESS_TOKEN`.
   - Zero chat storage: message processing remains completely ephemeral in-memory, no chat writes to database.

4. **`src/app/api/webhooks/tiktok/route.ts`**:
   - Add `GET` webhook verification handshake handler supporting `challenge` or `hub.challenge`.
   - In `POST`, extract channel identifier from `shop_id`, `channel_id`, `page_id`, or `app_key`, and look up tenant via `await db.findShopByChannel('tiktok', channelIdentifier)`.
   - Dispatch reply via `sendTikTokMessage(conversationId, aiResponse.replyTextMm, channel.accessToken)`.
   - Zero chat storage: message processing remains completely ephemeral in-memory.

5. **`scripts/verify_m3_channels.ts`**:
   - Create comprehensive verification test script testing:
     1. Facebook outbound message dispatch and mock mode.
     2. Facebook on-demand conversation and thread message fetching (ephemeral).
     3. TikTok outbound message dispatch and mock mode.
     4. TikTok on-demand conversation fetching (ephemeral).
     5. Facebook webhook GET verification handshake and POST event processing with tenant lookup.
     6. TikTok webhook GET verification handshake and POST event processing with tenant lookup.
     7. Multi-tenant unknown channel rejection (returns null/ignores unknown page).
     8. Zero-Chat Storage Invariant verification (probes database to ensure 0 messages or conversations were persisted).

## Verification Order
Execute in this exact order using `.cmd` wrappers:
1. `npx.cmd tsx scripts/verify_m3_channels.ts` (all assertions pass)
2. `npm.cmd run build` (exit code 0, 12/12 routes generated)
3. `npm.cmd test` (all tests pass)
4. `npx.cmd tsx scripts/adversarial_zero_chat_probe.ts` (106/106 probes pass)

## Handoff Report
Write your 5-component handoff report to:
`c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\worker_m3\handoff.md`
Then send a completion message to parent (`6b3e572e-862e-4f21-b794-2d675500d1e9`).
