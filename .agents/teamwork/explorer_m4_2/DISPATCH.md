# DISPATCH — explorer_m4_2

## Task Assignment
- Agent: explorer_m4_2
- Archetype: teamwork_preview_explorer
- Role: Conversational Checkout & Voucher Engine Explorer
- Scope: `src/lib/gemini-agent.ts` 5-Attribute Checkout Collection & Voucher Drafting

## Objective
Analyze requirements and design the implementation blueprint for 5-attribute conversational checkout collection, delivery fee calculation, prepaid policy enforcement, and order voucher generation in `src/lib/gemini-agent.ts`.

## Context & Inputs
- Authoritative User Request: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Architecture & Feature Inventory: `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
- Burmese NLP Engine: `src/lib/burmese-converter.ts` (digit conversion, phone normalization `normalizeMyanmarPhone`)
- Logistics Engine: `src/lib/myanmar-townships.ts` (`lookupTownshipDelivery`, `isRegionalPrepaidOnly`)
- Database & Types: `src/lib/db.ts`, `src/types/index.ts`

## Key Analysis Requirements
1. **5-Attribute Conversational Checkout Extraction**:
   - Attribute 1: **Product Selection & Quantity**:
     * Extract product ID / name and quantity.
     * Default quantity to 1 if customer does not specify quantity.
     * Support Burmese numerals (`၁, ၂, ၃...`) and Shan/Thai digits via `convertBurmeseDigits`.
     * Verify stock availability (`product.stock >= quantity`). If insufficient, prompt customer politely in Burmese.
   - Attribute 2: **Customer Name**:
     * Extract customer name from message or fall back to social sender platform ID / name.
   - Attribute 3: **Phone Number**:
     * Extract Myanmar phone number using regex, digit normalization, and `normalizeMyanmarPhone`.
     * Must normalize to valid `09XXXXXXXXX` format.
   - Attribute 4: **Township & Delivery Address**:
     * Extract township from message using `lookupTownshipDelivery`.
     * Calculate `deliveryFee` (in MMK) and `estimatedDays`.
     * Retain specific street/ward address if provided.
   - Attribute 5: **Payment Method**:
     * Support `KBZPay`, `WavePay`, `COD`.
     * Strict policy: check `isRegionalPrepaidOnly(township)`. If regional city or highway bus gate, strictly enforce prepaid-only (reject COD, require KBZPay/WavePay).
2. **Missing Attribute Prompting**:
   - If one or more attributes are missing during checkout, generate targeted, courteous Burmese prompts asking specifically for the missing fields.
3. **Order Voucher Formatting (`ဘောက်ချာ`)**:
   - Design standard Burmese order voucher string:
     * Header with shop name
     * Customer name, phone (`09XXXXXXXXX`), delivery address & township
     * Itemized product(s), quantity, unit price, item subtotal
     * Delivery fee (MMK) and estimated timeline (e.g. `1-2 days`, `2-4 days`)
     * Grand Total (Subtotal + Delivery Fee) in MMK
     * Selected payment method (and payment instructions/account if prepaid)
     * Professional closing message in polite Burmese (`ကျေးဇူးတင်ပါသည်`).
4. **Order Draft Object**:
   - Return structured `orderDraft?: Partial<Order>` within `AgentResponse`.

## Output Requirements
Produce a comprehensive handoff report at:
`c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_2\handoff.md`
Report must include: Observation, Logic Chain, Implementation Blueprint, Proposed Code / Signatures, and Verification Strategy.
Send completion message to parent orchestrator (`6b3e572e-862e-4f21-b794-2d675500d1e9`).


## 2026-10-08T08:10:42Z
[Message] timestamp=2026-10-08T08:10:42Z sender=6b3e572e-862e-4f21-b794-2d675500d1e9 priority=MESSAGE_PRIORITY_HIGH content=You are explorer_m4_2, a teamwork_preview_explorer agent.
Your working directory is:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_2
Your parent is orchestrator_1 (conversation ID: 6b3e572e-862e-4f21-b794-2d675500d1e9).

MANDATORY FIRST STEPS:
1. Read the authoritative user requirements at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the project scope, feature inventory, and architecture at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md
3. Read your dispatch instructions at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_2\DISPATCH.md

Your mission for Milestone 4 (Conversational Checkout & Voucher Engine):
Analyze requirements and design the implementation blueprint for 5-attribute conversational checkout collection, delivery fee calculation, prepaid policy enforcement, and order voucher generation in `src/lib/gemini-agent.ts`:
1. Extract 5 checkout attributes: Product & quantity (default 1, stock validation), Customer Name, Phone (normalized to 09XXXXXXXXX), Township & Address (via lookupTownshipDelivery), Payment Method (KBZPay, WavePay, COD; enforce prepaid-only for regional/bus gates).
2. Generate courteous Burmese prompts for any missing checkout fields.
3. Format standard Burmese order vouchers (ဘောက်ချာ) with shop name, customer info, itemized products, subtotal, delivery fee, grand total, and payment instructions.
4. Structured order draft object generation.

Produce a detailed handoff report in:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_2\handoff.md
Send completion message to parent (Recipient: 6b3e572e-862e-4f21-b794-2d675500d1e9) with findings and path.

CONSTRAINTS:
- Do NOT write or modify application source code.
- Only write state/metadata files in your own working directory.
