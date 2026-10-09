# Dispatch Assignment: Challenger M3 1 (Social Channel Webhook Concurrency & Stress)

**Timestamp**: 2026-10-08T07:56:00Z  
**Role**: `teamwork_preview_challenger`  
**Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\challenger_m3_1`  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  

## Mandatory First Steps
1. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
3. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\worker_m3\handoff.md`

## Mission
Adversarially challenge Facebook and TikTok webhook endpoints:
- Stress test with rapid bursts of concurrent requests to `/api/webhooks/facebook` and `/api/webhooks/tiktok`.
- Test multi-tenant isolation: verify unknown Page IDs and channel identifiers are strictly rejected/ignored and NEVER default to other tenant shops.
- Test malformed payloads: empty bodies, invalid JSON, missing sender/text, non-string texts.
- Test bot echo suppression: verify `is_echo === true` events produce no outbound dispatch and no error.
- Verify that `data/db.json` contains ZERO message or conversation records after all test runs.
- Issue explicit verdict: APPROVE or REJECT in `handoff.md`.
