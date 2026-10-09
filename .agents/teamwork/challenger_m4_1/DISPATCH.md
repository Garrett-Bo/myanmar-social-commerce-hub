# DISPATCH — challenger_m4_1

## Task Assignment
- Agent: challenger_m4_1
- Archetype: teamwork_preview_challenger
- Role: Conversational NLP & Checkout Adversarial Challenger
- Scope: Adversarially challenge Burmese intent classification, Burglish slang fuzzing, out-of-order checkout attributes, and missing field prompting

## Context & Inputs
- Authoritative User Request: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Scope & Architecture: `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
- Worker Handoff Report: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\worker_m4_rep\handoff.md`

## Challenge Mission
1. Create and execute an empirical adversarial challenge test harness against `src/lib/gemini-agent.ts`:
   - Stress test intent classification across complex, ambiguous, colloquial, and noisy messages (mixed Burmese Unicode, Zawgyi, and Burglish slang).
   - Test out-of-order attribute delivery (e.g. phone first, then township, then product).
   - Test edge-case phone number inputs (mixed digits with spaces, dashes, Burmese numbers, international `+959...`).
   - Test missing field prompting: verify courteous Burmese prompts request ONLY the missing attributes.
   - Test regional prepaid policy: verify that requesting COD for regional cities (e.g. Taunggyi, Mawlamyine) or highway bus gates (Aung Mingalar) is strictly rejected and prompted for KPay/WavePay.
2. Run independent verification commands using .cmd wrappers:
   - `npx.cmd tsx scripts/verify_m4_sales_closing.ts`
   - Your custom challenge harness
3. Document empirical results and issue an explicit verdict: APPROVE or REJECT in your handoff report:
   `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\challenger_m4_1\handoff.md`
4. Send a message to parent (Recipient: `6b3e572e-862e-4f21-b794-2d675500d1e9`) with verdict and path.
## 2026-10-09T03:19:51Z
You are challenger_m4_1, a teamwork_preview_challenger agent.
Your working directory is:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\challenger_m4_1
Your parent is orchestrator_1 (conversation ID: 6b3e572e-862e-4f21-b794-2d675500d1e9).

MANDATORY FIRST STEPS:
1. Read the authoritative user requirements at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the project scope and architecture at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md
3. Read the worker handoff report at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\worker_m4_rep\handoff.md
4. Read your dispatch instructions at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\challenger_m4_1\DISPATCH.md

Your mission for Milestone 4 Adversarial Challenge:
1. Empirically challenge Burmese NLP, intent classification, and conversational checkout in `src/lib/gemini-agent.ts`:
   - Create a challenge script that stress tests:
     * Intent classification on complex, mixed, noisy Burmese Unicode, Zawgyi, and Burglish slang messages.
     * Out-of-order attribute delivery during checkout.
     * Phone number edge cases (messy formats, spaces, dashes, Burmese digits, +959...).
     * Missing field prompts: verify polite prompts request only the missing fields.
     * Regional prepaid policy: verify COD is strictly rejected for regional cities (Taunggyi, Mawlamyine) and highway bus gates (Aung Mingalar).
2. Execute your challenge script and `npx.cmd tsx scripts/verify_m4_sales_closing.ts`.
3. Document empirical results and issue an explicit verdict: APPROVE or REJECT in your handoff report:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\challenger_m4_1\handoff.md
4. Send a message to parent (Recipient: 6b3e572e-862e-4f21-b794-2d675500d1e9) with verdict and path.
