# DISPATCH — spec_miner_e2e

## Task Assignment
- Agent: spec_miner_e2e
- Archetype: teamwork_preview_spec_miner
- Role: E2E Test Suite Specification Miner & Architect
- Scope: E2E Testing Track (Tiers 1-4 across all 36 features in `PROJECT.md § Feature Inventory`)

## Objective
Proactively design the complete opaque-box E2E Test Infrastructure document (`TEST_INFRA.md`) and the comprehensive specification for test suites (Tiers 1-4) covering all 36 features in `PROJECT.md § Feature Inventory` and user requirements R1-R4 in `ORIGINAL_REQUEST.md`.

## Context & Inputs
- Authoritative User Request: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Scope & Feature Inventory: `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
- Package Config: `package.json` (check test scripts and vitest setup)

## Key Analysis Requirements
1. **Opaque-Box Requirement-Driven Test Philosophy**:
   - The test suite must exercise the system as an end user / external client would:
     * Multi-tenant DB isolation via public API / interface contracts.
     * Burmese text normalization across diverse Unicode/Zawgyi/Burglish inputs.
     * Township delivery fee and COD vs prepaid policy lookups.
     * Webhook simulations for Facebook Messenger and TikTok Open API.
     * Full conversational sales closing, checkout collection, order voucher drafting, stock decrement, and zero-chat invariant.
2. **4-Tier Test Architecture**:
   - **Tier 1 - Feature Coverage (>=5 tests per feature)**:
     * Unit tests verifying individual features in isolation (offline, deterministic).
   - **Tier 2 - Boundary & Corner Cases (>=5 tests per feature where boundaries exist)**:
     * Edge cases: empty inputs, zero stock, negative stock attempts, malformed phone numbers, unknown townships, token timeouts, unhandled encodings.
   - **Tier 3 - Cross-Feature Combinations (Pairwise coverage)**:
     * Multi-tenant webhook -> Burmese normalization -> product search -> township fee -> order voucher -> stock decrement -> zero-chat DB probe.
   - **Tier 4 - Real-World Workload Scenarios (>=5 realistic application workloads)**:
     * Realistic customer journeys (e.g., customer from Taunggyi ordering 2 shirts via TikTok with KPay; customer from Kamayut ordering 1 dress via Facebook Messenger with COD; customer asking prices in Zawgyi, changing mind, then closing order).
3. **Vitest Test Runner & Project Integration (`npm.cmd test`)**:
   - Check `package.json` to verify test script (`npm.cmd test`).
   - Define exact test file locations and runner commands.
4. **Draft `TEST_INFRA.md`**:
   - Draft the complete `TEST_INFRA.md` conforming to the project pattern template.

## Output Requirements
Produce a comprehensive specification and handoff report at:
`c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\spec_miner_e2e\handoff.md`
Include the complete draft of `TEST_INFRA.md` in your report.
Send completion message to parent orchestrator (`6b3e572e-862e-4f21-b794-2d675500d1e9`).


## 2026-10-08T08:10:42Z
You are spec_miner_e2e, a teamwork_preview_spec_miner agent.
Your working directory is:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\spec_miner_e2e
Your parent is orchestrator_1 (conversation ID: 6b3e572e-862e-4f21-b794-2d675500d1e9).

MANDATORY FIRST STEPS:
1. Read the authoritative user requirements at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the project scope, feature inventory (all 36 features), and architecture at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md
3. Read your dispatch instructions at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\spec_miner_e2e\DISPATCH.md
4. Inspect `package.json` to verify test script configuration (`npm.cmd test`).

Your mission for the Dual-Track E2E Testing Track:
1. Architect the complete opaque-box E2E Test Infrastructure document (`TEST_INFRA.md`) at project root.
2. Define the test suites across 4 Tiers:
   - Tier 1: Feature Coverage (>=5 tests per feature across all 36 features)
   - Tier 2: Boundary & Corner Cases (>=5 tests per feature where boundaries exist)
   - Tier 3: Cross-Feature Interactions (pairwise combinations)
   - Tier 4: Real-World Workload Scenarios (realistic customer journeys)
3. Ensure the test suites are executable via `npm.cmd test` (Vitest).

Produce a detailed handoff report in:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\spec_miner_e2e\handoff.md
Include the complete draft of `TEST_INFRA.md` in your report.
Send completion message to parent (Recipient: 6b3e572e-862e-4f21-b794-2d675500d1e9) with findings and path.

CONSTRAINTS:
- Do NOT write or modify application source code.
- Only write state/metadata files in your own working directory.
