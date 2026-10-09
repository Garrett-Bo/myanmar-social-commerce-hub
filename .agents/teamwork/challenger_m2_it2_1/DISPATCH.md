# Dispatch Assignment: Challenger M2 Iteration 2 (NLP)

**Timestamp**: 2026-10-07T07:35:00Z  
**Role**: `teamwork_preview_challenger`  
**Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\challenger_m2_it2_1`  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  

## Mandatory First Steps
1. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
3. Read `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\worker_m2_it2\handoff.md`

## Mission
Adversarially challenge `src/lib/burmese-converter.ts`:
- Run `npx.cmd tsx tests/challenge_m2_adversarial.ts`
- Empirically verify all 27 scenarios pass
- Verify edge cases: Great Sa, Kinzi, medials, unspaced customer phrases, phone numbers
- Document empirical findings and issue explicit verdict: APPROVE or REJECT in `handoff.md`.


## 2026-10-07T07:24:10Z
[Message] sender=6b3e572e-862e-4f21-b794-2d675500d1e9 priority=MESSAGE_PRIORITY_HIGH
Adversarial challenge assignment for Milestone 2 Iteration 2:
Empirically verify Burmese NLP and Digit Normalization in src/lib/burmese-converter.ts:
- Run adversarial challenge suite: npx.cmd tsx tests/challenge_m2_adversarial.ts
- Empirically verify all 27 scenarios pass with 0 failures:
  * Suite 1: Zawgyi vs Unicode Detection & Conversion (Great Sa ပြဿနာ, Kinzi အင်္ဂါ/အင်္ဂလန်, medials ပြော, unspaced တင်မယ်, ေရာက္ပီလား, လိပ္စာ)
  * Suite 2: False Positive Prevention on Standard Unicode Texts
  * Suite 3: Burmese, Shan & Thai Digit Normalization
  * Suite 4: Contextual Letter Wa vs Digit Zero (words like ဝယ်မယ်, ဝတ်စုံ preserved)
  * Suite 5: Messy Myanmar Phone Formats normalized to 09XXXXXXXXX
  * Suite 6: Diacritic Reordering & Duplicate Elimination
  * Suite 7: Performance and fuzzing
- Issue explicit verdict: APPROVE or REJECT in handoff.md
- Send message to parent (6b3e572e-862e-4f21-b794-2d675500d1e9)
