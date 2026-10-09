# DISPATCH — explorer_m4_1

## Task Assignment
- Agent: explorer_m4_1
- Archetype: teamwork_preview_explorer
- Role: Burmese Intent Classification & Slang Explorer
- Scope: `src/lib/gemini-agent.ts` Conversational NLP & Intent Engine

## Objective
Analyze requirements and design the implementation blueprint for Burmese & Burglish intent classification and product catalog lookup in `src/lib/gemini-agent.ts`.

## Context & Inputs
- Authoritative User Request: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Architecture & Feature Inventory: `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
- Burmese NLP Engine: `src/lib/burmese-converter.ts`
- Database & Types: `src/lib/db.ts`, `src/types/index.ts`
- Social Channels: `src/lib/facebook.ts`, `src/lib/tiktok.ts`

## Key Analysis Requirements
1. **Burmese & Burglish Intent Classification**:
   - Classify customer messages into intents:
     * `greeting` (e.g. မင်္ဂလာပါ, hi, hello, နေကောင်းလား)
     * `price_inquiry` / `product_inquiry` (e.g. ဈေးဘယ်လောက်လဲ, ဘယ်လောက်လဲ, price plx, instock ရှိလား, ပစ္စည်းရှိလား)
     * `stock_inquiry` (e.g. ပစ္စည်းရှိသေးလား, stock ကျန်လား, out of stock လား)
     * `delivery_inquiry` (e.g. ပို့ခဘယ်လောက်လဲ, delivery charges, မြို့နယ်ပို့ပေးလား)
     * `payment_inquiry` (e.g. kpay ရလား, wave ရလား, cod ရလား, ဘယ်လိုရှင်းရမလဲ)
     * `order_intent` (e.g. ဝယ်မယ်, အော်ဒါတင်မယ်, ယူမယ်, တစ်ထည်ယူမယ်)
     * `checkout_info` (customer providing phone, address, township, name)
     * `general_inquiry` / `fallback`
   - Handle colloquial slang, Burglish ("instock shi lr", "kpay ya lr", "dali charge"), and both Zawgyi & Unicode (via `normalizeBurmese`).
2. **Product Matching & Catalog Integration**:
   - Match query to `products` by name, description, category, or keyword.
   - Format prices cleanly with MMK currency (e.g. `25,000 MMK`).
3. **Dual Execution Mode (Gemini API + Offline Deterministic Rule-Based Fallback)**:
   - When `GEMINI_API_KEY` is present, support Gemini multimodal / LLM conversational closing.
   - When `GEMINI_API_KEY` is missing or in test environment, MUST seamlessly fall back to deterministic Burmese rule-based intent matching so all automated tests and offline CI runs pass cleanly.
4. **Zero-Chat Invariant**:
   - Ensure `processCustomerMessage` is completely stateless with respect to chat logs; zero chat storage in database.

## Output Requirements
Produce a comprehensive handoff report at:
`c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1\handoff.md`
Report must include: Observation, Logic Chain, Implementation Blueprint, Proposed Code / Signatures, and Verification Strategy.
Send completion message to parent orchestrator (`6b3e572e-862e-4f21-b794-2d675500d1e9`).


## 2026-10-08T08:10:42Z
You are explorer_m4_1, a teamwork_preview_explorer agent.
Your working directory is:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1
Your parent is orchestrator_1 (conversation ID: 6b3e572e-862e-4f21-b794-2d675500d1e9).

MANDATORY FIRST STEPS:
1. Read the authoritative user requirements at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the project scope, feature inventory, and architecture at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md
3. Read your dispatch instructions at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1\DISPATCH.md

Your mission for Milestone 4 (Burmese AI Sales Closing Engine & Intent Classification):
Analyze requirements and design the implementation blueprint for Burmese & Burglish intent classification and product catalog lookup in `src/lib/gemini-agent.ts`:
1. Burmese & Burglish intent classification (greeting, price_inquiry, stock_inquiry, delivery_inquiry, payment_inquiry, order_intent, checkout_info, general_inquiry).
2. Support colloquialisms, slang, and Burglish phrases alongside Zawgyi & Unicode normalization.
3. Real-time product search matching against shop catalog and MMK price formatting.
4. Deterministic offline rule-based fallback mechanism when GEMINI_API_KEY is not set so tests execute cleanly offline.
5. Zero-chat invariant: purely ephemeral in-memory processing, no DB chat logs.

Produce a detailed handoff report in:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_1\handoff.md
Send completion message to parent (Recipient: 6b3e572e-862e-4f21-b794-2d675500d1e9) with findings and path.

CONSTRAINTS:
- Do NOT write or modify application source code.
- Only write state/metadata files in your own working directory.
