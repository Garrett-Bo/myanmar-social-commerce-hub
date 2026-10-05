## 2026-10-04T11:34:16Z
**From**: 6b3e572e-862e-4f21-b794-2d675500d1e9 (orchestrator_1)
**Task**: Survey Phase (Step 0) - R2 & R4 Investigation
- Requirement R2: Bidirectional Social Channel Messaging
  * Facebook Messenger webhook verification (hub.mode, hub.verify_token, hub.challenge -> HTTP 200).
  * Meta Graph API outbound message sending using tenant Page Access Token (POST https://graph.facebook.com/v.../me/messages, recipient id, message text, < 3s SLA).
  * TikTok Open API inbound webhook processing and outbound direct messaging.
  * Multi-tenant routing: mapping page/account ID from webhook payload to the correct tenant/shop catalog.
- Requirement R4: Automated Testing & Verification Suite
  * Test framework setup (Jest, Vitest, ts-node, etc.).
  * Configuration of npm test and npm run build in package.json.
  * Requirements for mock webhook simulators (simulating Meta and TikTok payloads to test end-to-end inbound and outbound flow).
  * Plan for test tiers (Tiers 1-4: Unit, Integration, Webhook simulation, E2E).
**Constraints**:
- Read-only investigation (do NOT modify application source code).
- Write findings to handoff.md in explorer_survey_3 folder.
- Send completion message to parent via send_message.

## 2026-10-04T11:35:10Z
**From**: 6b3e572e-862e-4f21-b794-2d675500d1e9 (orchestrator_1)
**Content**:
Critical Architectural Update: Zero Chat Storage
- DO NOT store messages or chat history in the database.
- Pull conversations and message histories on-demand directly via Facebook Messenger Graph API (GET /{page_id}/conversations, GET /{conversation_id}/messages) and TikTok Open API.
- Inbound webhooks process messages ephemerally in-memory and dispatch replies back within 3 seconds.
- Action: Reflect this on-demand chat fetching and zero-chat-storage requirement in channel integration and test suite survey and handoff report.
