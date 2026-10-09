# Dispatch Assignment: Worker M2 (Milestone 2 Iteration 2)

**Timestamp**: 2026-10-07T07:22:00Z  
**Role**: `teamwork_preview_worker`  
**Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\worker_m2_it2`  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  

---

## Mandatory First Steps
1. Read the authoritative user requirements:
   `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Read the project scope and architecture:
   `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
3. Read the Milestone 2 Iteration 2 Explorer reports:
   - `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m2_it2_1\handoff.md` (Burmese converter blueprint & complete code)
   - `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m2_it2_2\handoff.md` (Naypyitaw collision blueprint & patch)
   - `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m2_it2_3\handoff.md` (Holistic synthesis guide & execution order)

---

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

---

## File Write Ownership
You exclusively own and may modify:
- `src/lib/burmese-converter.ts`
- `src/lib/myanmar-townships.ts`

---

## Implementation Tasks
1. **Apply Burmese NLP & Converter Remediation (`src/lib/burmese-converter.ts`)**:
   - Add `\u1086` to `ZAWGYI_DEFINITIVE_PATTERNS` and map `[\u1086\u108f] -> \u103f` (`ပြဿနာ`).
   - Reorder Zawgyi Kinzi: match `([\u1000-\u1021])\u1064` -> `\u1004\u103a\u1039$1` so Kinzi prefixes the base consonant (`အင်္ဂါ`, `အင်္ဂလန်`).
   - Ensure medials precede E-vowel (`\u1031`) in both `canonicalizeUnicodeDiacritics` and `normalizeBurmese` step 6 so `ပြော` is `\u1015\u103c\u1031\u102c`, not `\u1015\u1031\u103c\u102c`.
   - In unspaced compound words, convert Asat `\u1004\u1039 -> \u1004\u103a`, `\u101a\u1039 -> \u101a\u103a`, and non-Pali stacking consonant pairs `C\u1039 -> C\u103a` so words like `တင္မယ္` convert to `တင်မယ်`.
   - Refine `isZawgyi` scoring: replace broad consonant stacking with `UNICODE_VALID_PALI_STACK` and detect unspaced Zawgyi markers (`ေရာ`, `ျဖ`, `\u1004\u1039C`, `\u1000\u1039C`, `\u1015\u1039C`), eliminating false negatives on customer phrases like `ေရာက္ပီလား`, `လိပ္စာ`.

2. **Apply Township Collision & Delivery Policy Remediation (`src/lib/myanmar-townships.ts`)**:
   - In `TOWNSHIP_ALIASES['Zabuthiri']`, add `'နေပြည်တော်'`, `'နေပြည်တော်မြို့'`, `'naypyitaw'`, `'nay pyi taw'`, `'naypyitaw city'`.
   - Decouple Tier 2 suffix and prefix stripping: strip common suffixes first (`မြို့နယ်`, `မြို့`, etc.); then strip metro prefixes. If prefix stripping reduces query to empty string, resolve directly via `metroToken` if it matches an alias, or return `null` immediately to prevent falling through to Tier 3 substring search.
   - In `isRegionalPrepaidOnly`, ensure pure metro indicators (`'yangon'`, `'mandalay'`, `'naypyitaw'`, `'ရန်ကုန်'`, `'မန္တလေး'`, `'နေပြည်တော်'`) unconditionally return `false` (COD supported), while regional bus gate indicators return `true`.

---

## Verification Execution Order
Execute the following verification commands using `.cmd` wrappers:
1. `npx.cmd tsx tests/challenge_m2_adversarial.ts` (must pass 27/27 scenarios)
2. `npx.cmd tsx tests/challenge_m2_townships.ts` (must pass 295/295 assertions)
3. `npx.cmd tsx scripts/verify_m2_nlp_logistics.ts` (must pass 127/127 assertions)
4. `npm.cmd run build` (must pass with exit code 0, 12/12 routes)
5. `npx.cmd tsx scripts/verify_m1_persistence.ts` and `npx.cmd tsx scripts/adversarial_zero_chat_probe.ts` (0 regressions)

---

## Output Requirements
1. Write your comprehensive 5-component handoff report to:
   `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\worker_m2_it2\handoff.md`
2. Send a message to parent (`6b3e572e-862e-4f21-b794-2d675500d1e9`) with your results, verification output, and handoff path.
