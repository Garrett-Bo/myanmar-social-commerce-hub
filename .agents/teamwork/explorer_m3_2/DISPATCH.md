# Dispatch Assignment: Explorer M3 2 (TikTok Open API & On-Demand Messaging)

**Timestamp**: 2026-10-08T07:36:00Z  
**Role**: `teamwork_preview_explorer`  
**Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m3_2`  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  

## Mandatory First Steps
1. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`

## Mission
Analyze requirements for TikTok Direct Messaging integration in `src/lib/tiktok.ts`:
1. Design `sendTikTokMessage(conversationId: string, messageText: string, accessToken: string)` conforming to TikTok Open API direct messaging endpoints.
2. Design on-demand chat fetching functions per user requirement:
   - `fetchTikTokConversations(accessToken: string)`: fetches active customer conversation threads on demand without storing in database.
3. Design mock/test mode fallback so automated tests can run reliably without live TikTok credentials.
4. Error handling, token validation, rate limits, and response types.
5. Write handoff report to `.agents/teamwork/explorer_m3_2/handoff.md` and message parent.
