# Dispatch Assignment: Explorer M3 1 (Facebook Graph API & On-Demand Messaging)

**Timestamp**: 2026-10-08T07:36:00Z  
**Role**: `teamwork_preview_explorer`  
**Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m3_1`  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  

## Mandatory First Steps
1. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`

## Mission
Analyze requirements for Facebook Messenger integration in `src/lib/facebook.ts`:
1. Design `sendFacebookMessage(recipientId: string, messageText: string, pageAccessToken: string)` conforming to Meta Graph API v21.0 `POST /me/messages`.
2. Design on-demand chat fetching functions per user requirement:
   - `fetchFacebookConversations(pageId: string, pageAccessToken: string)`: fetches conversation summaries (`GET /{page-id}/conversations`) on demand without storing in database.
   - `fetchFacebookThreadMessages(threadId: string, pageAccessToken: string)`: fetches thread message history (`GET /{thread-id}/messages`) on demand without storing in database.
3. Design mock/test mode fallback so automated tests can run without live Meta credentials when testing or in offline environments.
4. Error handling, token validation, rate limits, and response types.
5. Write handoff report to `.agents/teamwork/explorer_m3_1/handoff.md` and message parent.
