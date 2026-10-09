# Adversarial Challenge Handoff Report: Milestone 2

**Agent**: `challenger_m2_1`  
**Target**: `src/lib/burmese-converter.ts` (Burmese NLP & Digit Normalization)  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  
**Verdict**: **REJECT** (5 empirical failures in Zawgyi NLP conversion & detection)

---

## 1. Observation

Adversarial stress testing harness was implemented and executed at `tests/challenge_m2_adversarial.ts` containing 27 rigorous scenarios across 7 testing suites.

### Execution Command and Verbatim Result
Command executed:
```bash
npx.cmd tsx tests/challenge_m2_adversarial.ts
```

Verbatim terminal output:
```text
================================================================
CHALLENGER M2: BURMESE NLP & DIGIT NORMALIZATION ADVERSARIAL HARNESS
================================================================

--- SUITE 1: Zawgyi vs Unicode Detection & Conversion Fidelity ---
  [PASS] Hardcoded social commerce lexicon phrases convert cleanly (2ms)
  [PASS] Zawgyi subjoined consonants map to Unicode virama stacking (0ms)
  [FAIL] Zawgyi Great Sa (\u1086) detected and converted to Unicode Great Sa (\u103f) (0ms): Assertion failed: Expected "ပြဿနာ", got "ပြႆနာ"
  [FAIL] Zawgyi Kinzi general case ordering and non-consonant followers (0ms): Assertion failed: Expected "အင်္ဂါ", got "အဂၤါ"
  [FAIL] Visual E-vowel with medials converts to canonical Unicode order (0ms): Assertion failed: Expected "ပြော" (\u1015\u103c\u1031\u102c), got "ပေြာ"
  [FAIL] Zawgyi Asat (\u1039) converts to Unicode Asat (\u103a) in unspaced compound words (0ms): Assertion failed: Expected "တင်မယ်", got "တင္မယ်"
  [FAIL] Common customer inquiry phrases in Zawgyi are detected and converted (0ms): Assertion failed: ေရာက္ပီလား must be detected as Zawgyi
  [PASS] Idempotency: Normalizing already converted text produces identical output (0ms)

--- SUITE 2: False Positive Prevention on Standard Unicode Texts ---
  [PASS] Standard Unicode vocabulary is NEVER detected as Zawgyi (0ms)
  [PASS] Pali stacked subjoined consonants in Unicode never misdetected (1ms)
  [PASS] Single-syllable E-vowel Unicode words never misdetected (0ms)
  [PASS] English, numbers, emojis, and Burglish never misdetected (0ms)

--- SUITE 3: Burmese, Shan & Thai Digit Normalization ---
  [PASS] Burmese standard digits (၀-၉) translate to ASCII 0-9 (0ms)
  [PASS] Shan digits (႐-႙) translate to ASCII 0-9 (0ms)
  [PASS] Thai zero (๐) translates to ASCII 0 (0ms)
  [PASS] Mixed script digits in single string normalize seamlessly (0ms)

--- SUITE 4: Contextual Letter Wa (ဝ) vs Digit Zero (၀) ---
  [PASS] Phone prefixes with letter Wa convert to 09... (0ms)
  [PASS] Embedded Wa adjacent to numbers converts to 0 (0ms)
  [PASS] Real Burmese vocabulary containing letter Wa is STRICTLY PRESERVED (0ms)
  [PASS] Complex sentence with BOTH Wa vocabulary AND Wa numeric typos handles both correctly (0ms)

--- SUITE 5: Messy Myanmar Phone Formats Normalization ---
  [PASS] All valid formats normalize strictly to 09XXXXXXXXX (0ms)
  [PASS] Invalid and non-phone inputs return empty string (1ms)

--- SUITE 6: Diacritic Reordering & Duplicate Elimination ---
  [PASS] Deduplication removes duplicate tone marks and vowels (0ms)
  [PASS] Inverted tone marks reorder into Unicode canonical sequence (0ms)

--- SUITE 7: Adversarial Stress & Performance Fuzzing ---
    Throughput: 10,000 iterations processed in 99ms (101010 ops/sec)
  [PASS] 10,000 randomized operations complete in under 500ms (99ms)
    Large payload processed in 6ms
  [PASS] Large text payload (100KB) processed without heap exhaustion (6ms)
  [PASS] Graceful handling of null, undefined, and non-string inputs (0ms)

================================================================
CHALLENGE EXECUTION SUMMARY
================================================================
Total Scenarios Tested : 27
Passed                 : 22
Failed                 : 5

❌ VERDICT: REJECT
Failures encountered:
  - [Zawgyi NLP] Zawgyi Great Sa (\u1086) detected and converted to Unicode Great Sa (\u103f): Assertion failed: Expected "ပြဿနာ", got "ပြႆနာ"
  - [Zawgyi NLP] Zawgyi Kinzi general case ordering and non-consonant followers: Assertion failed: Expected "အင်္ဂါ", got "အဂၤါ"
  - [Zawgyi NLP] Visual E-vowel with medials converts to canonical Unicode order: Assertion failed: Expected "ပြော" (\u1015\u103c\u1031\u102c), got "ပေြာ"
  - [Zawgyi NLP] Zawgyi Asat (\u1039) converts to Unicode Asat (\u103a) in unspaced compound words: Assertion failed: Expected "တင်မယ်", got "တင္မယ်"
  - [Zawgyi NLP] Common customer inquiry phrases in Zawgyi are detected and converted: Assertion failed: ေရာက္ပီလား must be detected as Zawgyi
```

### Specific Code Inspection Observations in `src/lib/burmese-converter.ts`

1. **Definitive Pattern Missing Zawgyi Great Sa `\u1086`**:
   - Lines 18 & 214:
     ```ts
     18: /[\u1085\u108a\u108b\u108c\u108d\u108e\u108f]/g, // Zawgyi private medials / Great Sa
     ...
     214: .replace(/\u108f/g, '\u103f')          // Great Sa
     ```
     `\u1086` (`ႆ`) is the standard Zawgyi Great Sa glyph. `\u1086` is omitted from line 18, and line 214 replaces `\u108f` (`ႏ`, Zawgyi Na) with `\u103f`. Actual `\u1086` remains unmapped (`ပြႆနာ`).

2. **Kinzi Regex Scope and Placement**:
   - Line 207:
     ```ts
     207: text = text.replace(/\u1064([\u1000-\u1021])/g, '\u1004\u103a\u1039$1');
     ```
     Zawgyi Kinzi (`\u1064`) visually follows the syllable's base consonant and any attached upper vowels. When followed by a vowel or punctuation (e.g. `အဂၤါ` -> `\u1021\u1002\u1064\u102b`), regex fails to match because `\u102b` is not in `[\u1000-\u1021]`.
     Furthermore, when followed by the next consonant (e.g. `အဂၤလန္`), it prefixes Kinzi onto the next consonant (`အဂင်္လန်`), instead of the intended base consonant (`အင်္ဂလန်`).

3. **Visual E-Vowel Reordering with Medials**:
   - Lines 226 & 229:
     ```ts
     226: text = text.replace(/([\u107e-\u1084\u103b])([\u1000-\u1021])/g, '$2\u103c');
     229: text = text.replace(/(\u1031)([\u1000-\u1021])((?:\u1039[\u1000-\u1021])*)/g, '$2$3$1');
     ```
     Line 226 converts `\u1031\u107e\u1015\u102c` into `\u1031\u1015\u103c\u102c`. Line 229 matches `(\u1031)(\u1015)` and reorders it to `\u1015\u1031\u103c\u102c` (`ပေြာ`).
     In Unicode 5.1+, medials must precede the E-vowel (`Consonant + Medial + E-vowel`), so `ပြော` must be `\u1015\u103c\u1031\u102c`. `ပေြာ` is an invalid encoding with rendering dotted circles.

4. **Negative Lookahead on Zawgyi Asat Conversion**:
   - Lines 231-236:
     ```ts
     231: text = text.replace(/\u1039(?![\u1000-\u1021])/g, '\u103a');
     232: text = text.replace(/\u1004\u1039([^\u1000-\u1021]|$)/g, '\u1004\u103a$1');
     ```
     Because Burmese text is written without inter-word spacing, compound words like `တင္မယ္` have `\u1004\u1039` followed directly by consonant `မ` (`\u1019`). The negative lookahead / non-consonant filter causes line 232 to fail, leaving `\u1004\u1039` intact as virama, corrupting `တင်မယ်` into `တင္မယ်`.

5. **False Negative Zawgyi Detection on Unspaced Phrases**:
   - Lines 27 & 63-65:
     ```ts
     27: /(?:[\u1000-\u1003\u1005-\u1008\u100a-\u1019\u101c\u101e\u101f]\u1039[\u1000-\u1003\u1005-\u1008\u100a-\u1019\u101c\u101e\u101f])/g,
     ```
     In Zawgyi, `\u1039` was exclusively used as Asat (`်`). Whenever an Asat is adjacent to the next word's initial consonant (e.g. `ေရာက္ပီလား`, `ျဖစ္ပါတယ္`, `လိပ္စာ`), `C1 + \u1039 + C2` matches Unicode Pattern 2 (stacked consonants), giving +10 to Unicode score and 0 to Zawgyi score. This ties or beats the Zawgyi score, causing `isZawgyi` to return `false`.

---

## 2. Logic Chain

1. **Observation 1 & 2** demonstrate that Zawgyi text containing Great Sa (`\u1086`) or general Kinzi (`\u1064`) fails both detection and conversion. The lexicon dictionary in line 204 only masks the problem for the single hardcoded string `မဂၤလာပါ`.
2. **Observation 3** shows that when customers use common verbs containing medials (e.g. `ပြော` / `speak`, `ကြိုက်` / `like`), the converter outputs invalid Unicode sequences (`ပေြာ`) where vowel precedes medial. In downstream M4 AI sales matching, search queries for products or intent words will fail string equality and token matching.
3. **Observation 4 & 5** demonstrate that everyday social commerce phrases written without spaces (e.g. `ေရာက္ပီလား` / "has it arrived", `လိပ္စာ` / "address", `တင္မယ္` / "place order") are either falsely classified as Unicode due to virama over-matching or left with unconverted virama Asat.
4. Therefore, the implementation in `src/lib/burmese-converter.ts` fails to meet the core NLP requirement (PROJECT.md Feature 8 & ORIGINAL_REQUEST R3) of robustly normalizing incoming Zawgyi customer messages.

---

## 3. Caveats

- **Township Matrix & Delivery Fees**: All 61 townships and highway bus gates in `src/lib/myanmar-townships.ts` passed 100% of checks.
- **Digit Normalization & Contextual Wa**: Burmese digits (`၀-၉`), Shan digits (`႐-႙`), Thai zero (`๐`), contextual Wa vs zero in phone numbers vs regular Burmese vocabulary words (`ဝယ်မယ်`, `ဝတ်စုံ`, `အဝေးပြေးဂိတ်`) passed 100% with high performance (~100,000 ops/sec).
- **Phone Normalization**: Standardizing messy Myanmar formats to `09XXXXXXXXX` passed 100%.
- **Unicode Preservation**: Standard Unicode inputs (`မင်္ဂလာပါ`, `ပစ္စည်း`, `ကျေးဇူးတင်ပါတယ်`, Pali stacked consonants) are never falsely classified as Zawgyi.
- No caveats regarding test validity; all failure cases were empirically reproduced.

---

## 4. Conclusion

**VERDICT: REJECT**

The implementation in `src/lib/burmese-converter.ts` cannot be approved for Milestone 2 completion until the 5 Zawgyi NLP bugs are remediated by worker_m2:

### Remediation Blueprint for Worker M2:
1. **Add `\u1086` to Zawgyi patterns**:
   Include `\u1086` in `ZAWGYI_DEFINITIVE_PATTERNS` and map `\u1086` -> `\u103f` (`ဿ`) in `normalizeBurmese`.
2. **Fix Kinzi reordering**:
   Map `([\u1000-\u1021])\u1064` -> `\u1004\u103a\u1039$1` so Kinzi correctly prefixes the base consonant it belongs to.
3. **Fix Medials before E-vowel ordering**:
   Ensure `\u103c` and medials are positioned BEFORE `\u1031` (e.g. `\u1031([\u1000-\u1021])\u103c` -> `$1\u103c\u1031`, producing `ပြော` instead of `ပေြာ`).
4. **Fix Asat conversion in unspaced compound words**:
   Convert `\u1039` to `\u103a` when preceded by consonants, avoiding negative lookahead that traps unspaced words.
5. **Adjust heuristic scoring in `isZawgyi`**:
   Do not treat arbitrary `C1 + \u1039 + C2` as valid Unicode stacking without verifying valid Pali stacking pairs, or award Zawgyi score when `\u1039` is preceded by non-stackable combinations.

---

## 5. Verification Method

To verify resolution, run the empirical adversarial suite:
```bash
npx.cmd tsx tests/challenge_m2_adversarial.ts
```

**Passing Criteria**:
- All 27 scenarios pass with zero failures.
- Output ends with `>>> ALL EMPIRICAL ADVERSARIAL STRESS TESTS PASSED CLEANLY! <<<` and exit code 0.
