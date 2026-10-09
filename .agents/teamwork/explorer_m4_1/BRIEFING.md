# BRIEFING — 2026-10-08T08:16:00Z

## Mission
Analyze requirements and design the implementation blueprint for Burmese & Burglish intent classification and product catalog lookup in `src/lib/gemini-agent.ts`.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: Burmese Intent Classification & Slang Explorer, Read-only investigator
- Working directory: c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1
- Original parent: 6b3e572e-862e-4f21-b794-2d675500d1e9
- Milestone: Milestone 4 (Burmese AI Sales Closing Engine & Intent Classification)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement application source code
- Only write state/metadata files in your own working directory (.agents/teamwork/explorer_m4_1)
- Zero-chat invariant: purely ephemeral in-memory processing, no DB chat logs
- Deterministic offline rule-based fallback mechanism when GEMINI_API_KEY is not set

## Current Parent
- Conversation ID: 6b3e572e-862e-4f21-b794-2d675500d1e9
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`
  - `explorer_m4_1/DISPATCH.md`, `explorer_m4_2/DISPATCH.md`, `explorer_m4_3/DISPATCH.md`
  - `src/lib/gemini-agent.ts`, `src/types/index.ts`
  - `src/lib/burmese-converter.ts`, `src/lib/myanmar-townships.ts`, `src/lib/telegram.ts`, `src/lib/db.ts`
  - `src/app/api/webhooks/facebook/route.ts`, `src/app/api/webhooks/tiktok/route.ts`, `src/app/api/chat/route.ts`
  - `scripts/adversarial_m2_nlp_probe.ts`, `scripts/verify_m3_channels.ts`, `tests/challenge_m3_adversarial.ts`
- **Key findings**:
  - `src/lib/gemini-agent.ts` currently provides basic township detection, keyword product matching, simple order intent check, Gemini 2.5 Flash invocation, and fallback rule engine.
  - To fulfill M4 requirements, it needs a dedicated, exportable `classifyBurmeseIntent` engine covering 10 distinct intents (`greeting`, `price_inquiry`, `stock_inquiry`, `delivery_inquiry`, `payment_inquiry`, `order_intent`, `checkout_info`, `discount_inquiry`, `slip_inquiry`, `human_takeover`, `general_inquiry`).
  - High-precision Burglish and Burmese slang dictionaries covering colloquial forms (e.g. `bl lout ll`, `instock shi lr`, `kpay ya lr`, `dali charge`, `order tin ml`).
  - Catalog lookup engine `matchCatalogProducts` with Burmese stem extraction, SKU matching, Burglish aliases, and MMK formatted output.
  - Dual execution mode: Gemini 2.5 Flash when `GEMINI_API_KEY` is present; deterministic instant rule-based fallback when missing or offline.
  - Full backward-compatibility: Exposes both `replyText` and `replyTextMm`, `intent`, `confidence`, `isOrderIntent`, `orderDraft`.
  - Zero-chat invariant: Pure ephemeral processing without database chat mutations.
- **Unexplored areas**: None. All requirements analyzed and synthesis complete.

## Key Decisions Made
- Design blueprint with standalone modular `classifyBurmeseIntent(rawInput: string)` and `matchCatalogProducts(query: string, products: Product[])`.
- Provide full TypeScript signatures and code snippets in handoff report.
- Coordinate contract alignment with `explorer_m4_2` (checkout collector) and `explorer_m4_3` (order persistence, telegram alerts & test harness).

## Artifact Index
- `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1\DISPATCH.md` — Dispatch instructions
- `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1\BRIEFING.md` — Persistent situational awareness
- `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1\progress.md` — Liveness heartbeat and progress tracking
- `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1\handoff.md` — Final 5-component handoff report
