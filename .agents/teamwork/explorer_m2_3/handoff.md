# Handoff Report — Milestone 2: Burmese NLP, Digit Normalization & Logistics Matrix Integration Analysis

**Agent**: `explorer_m2_3` (teamwork_preview_explorer)  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  
**Mission**: Analyze integration of the NLP and Logistics tier with downstream modules (M3, M4) and tests; verify contract signatures against `PROJECT.md`; design comprehensive automated test suite; ensure Next.js build compatibility.  
**Date**: 2026-10-04  

---

## 1. Observation

### 1.1 Interface Contract Definition in `PROJECT.md`
In `PROJECT.md` lines 94–102 (§ Interface Contracts § M2 <-> M3, M4):
```markdown
### M2 ↔ M3, M4 (Burmese NLP & Logistics)
- `normalizeBurmese(text: string): string` (auto-detects Zawgyi and converts to Unicode)
- `isZawgyi(text: string): boolean`
- `convertBurmeseDigits(text: string): string` (converts ၀-၉, ๐, ဝ in numbers to 0-9)
- `normalizeMyanmarPhone(raw: string): string` (returns 09XXXXXXXXX)
- `lookupTownshipDelivery(query: string): TownshipDeliveryInfo | null`
  - Returns { townshipEn, townshipMm, region, feeMmk, estimatedDays, isCodAvailable, notes? }
- `isRegionalPrepaidOnly(townshipQuery: string): boolean`
```

### 1.2 Inspection of Existing Codebase State

#### A. `src/lib/burmese-converter.ts` (lines 1–91)
- **Line 19**: `export function isZawgyi(text: string): boolean`
  - Current implementation checks only 4 regular expression patterns (`/\u1031[\u1000-\u1021]/`, `/[\u1000-\u1021]\u103b/`, `/\u1039[\u1000-\u1021]/`, `/\u1064|\u108a|\u108b|\u108c|\u108d/`).
- **Line 40**: `const ZAWGYI_TO_UNICODE_MAP: [RegExp, string][]`
  - Contains only 8 replacement patterns. Missing tall AA (`\u102b`), stacked consonants, Kinzi variants (`\u1004\u103a\u1039`), Great Sa (`\u103f`), and complex medials combinations (`\u103c\u103d\u103e`).
- **Line 59**: `export function normalizeBurmese(input: string): string`
  - Performs basic Zawgyi-to-Unicode conversion if `isZawgyi` passes, but lacks canonical diacritic reordering.
- **Line 77**: `export function normalizeMyanmarPhone(phone: string): string`
  - Implementation:
    ```typescript
    export function normalizeMyanmarPhone(phone: string): string {
      if (!phone) return '';
      const cleaned = phone.replace(/[^0-9+]/g, '');
      if (cleaned.startsWith('+959')) return '09' + cleaned.slice(4);
      if (cleaned.startsWith('959')) return '09' + cleaned.slice(3);
      if (cleaned.startsWith('9') && cleaned.length === 9) return '0' + cleaned;
      return cleaned;
    }
    ```
  - **Critical Flaw**: Cleans using `/[^0-9+]/g`. If the raw input contains Burmese digits (`၀-၉`), Thai zero (`๐`), or letter Wa typo (`ဝ`), the regex completely strips them out, returning an empty or corrupt string!
- **Missing Function**: `convertBurmeseDigits` is **completely missing** from `src/lib/burmese-converter.ts`.

#### B. `src/lib/myanmar-townships.ts` (lines 1–80)
- **Lines 6–13 & `src/types/index.ts` lines 111–119**:
  ```typescript
  export interface TownshipDeliveryInfo {
    nameMm: string;
    nameEn: string;
    region: 'Yangon' | 'Mandalay' | 'Naypyitaw' | 'State/Region';
    standardFeeMmk: number;
    codAvailable: boolean;
    estDays: string;
    notes?: string;
  }
  ```
- **Matrix Size**: `MYANMAR_DELIVERY_MATRIX` contains only **38 locations** (24 Yangon, 6 Mandalay, 3 Naypyitaw, 5 Regional/Gates). It is missing 20+ locations required to reach the mandated 58 verified townships + 3 highway express gates.
- **Line 66**: `export function lookupTownshipDelivery(query: string): TownshipDeliveryInfo | null`
  - Uses simple substring matching; lacks aliases (e.g. `မြောက်ဒဂုံ` for `North Dagon`), case normalization, or bus gate recognition.
- **Property Name Divergence**: Returns `{ nameEn, nameMm, standardFeeMmk, codAvailable, estDays }` instead of the `PROJECT.md` interface signature `{ townshipEn, townshipMm, feeMmk, isCodAvailable, estimatedDays }`.
- **Missing Function**: `isRegionalPrepaidOnly(townshipQuery: string): boolean` is **completely missing**.

#### C. `src/lib/gemini-agent.ts` (lines 1–186)
- **Line 1–2**:
  ```typescript
  import { normalizeBurmese } from './burmese-converter';
  import { lookupTownshipDelivery, MYANMAR_DELIVERY_MATRIX } from './myanmar-townships';
  ```
- **Integration Disconnect 1 (Delivery Lookup)** (lines 32–38):
  `gemini-agent.ts` imports `lookupTownshipDelivery`, but **never calls it**! Instead, it performs its own ad-hoc loop:
  ```typescript
  let matchedDelivery = null;
  for (const t of MYANMAR_DELIVERY_MATRIX) {
    if (inputLower.includes(t.nameEn.toLowerCase()) || normalizedInput.includes(t.nameMm)) {
      matchedDelivery = t;
      break;
    }
  }
  ```
- **Integration Disconnect 2 (Phone Extraction)** (lines 71–72):
  ```typescript
  const phoneMatch = normalizedInput.match(/(09\d{7,9}|\+959\d{7,9}|959\d{7,9})/);
  const customerPhone = phoneMatch ? phoneMatch[0] : undefined;
  ```
  It does **not** call `convertBurmeseDigits` or `normalizeMyanmarPhone`. When customers submit Burmese numerals (e.g. `၀၉၇၉၈၇၆၅၄၃၂`) or numbers starting with letter Wa (`ဝ၉၄၅၀၀၁၁၂၂၃`), `phoneMatch` is `null`.
- **Integration Disconnect 3 (Regional COD Enforcement)**:
  Does not import or call `isRegionalPrepaidOnly`. While it sets COD notice in text (line 165), it does not enforce prepaid requirement in order intent validation.

#### D. `src/app/api/webhooks/facebook/route.ts` (lines 1–89)
- **Line 2**: `import { normalizeBurmese } from '@/lib/burmese-converter';`
- **Line 52**: `const normalized = normalizeBurmese(rawMessageText);`
- **Line 56**: Passes `normalized` to `processCustomerMessage(normalized, { ... })`.
- **Status**: The webhook route cleanly passes inbound customer text through `normalizeBurmese` before feeding the agent. It relies entirely on `normalizeBurmese` and `gemini-agent.ts` to correctly handle encodings, numerals, and logistics.

#### E. Next.js Build Compatibility Check
- Executed: `cmd /c "npm run build"`
- Result: **Exit Code 0**, completed in 2.0s, all 12 static/dynamic routes compiled cleanly without errors.

---

## 2. Logic Chain

### 2.1 Contract Signatures Verification (`PROJECT.md` vs Codebase)

| Contract Signature | Specified in `PROJECT.md` | Existing Codebase State | Discrepancy & Action Required |
|---|---|---|---|
| `normalizeBurmese(text: string): string` | Line 95 | Present in `burmese-converter.ts:59` | Needs expanded Zawgyi mappings and canonical diacritic reordering. Must handle non-string / empty inputs safely. |
| `isZawgyi(text: string): boolean` | Line 96 | Present in `burmese-converter.ts:19` | Existing heuristics too narrow (only 4 patterns). Needs comprehensive Zawgyi-specific pattern matching. |
| `convertBurmeseDigits(text: string): string` | Line 97 | **MISSING** | Implement function converting `၀-၉` (U+1040–U+1049), `๐` (U+0E50), and `ဝ` (U+101D) in numbers to `0-9`. |
| `normalizeMyanmarPhone(raw: string): string` | Line 98 | Present in `burmese-converter.ts:77` (broken) | Currently strips Burmese digits. Must pipe input through `convertBurmeseDigits`, strip delimiters, and return `09XXXXXXXXX`. |
| `lookupTownshipDelivery(query: string): TownshipDeliveryInfo \| null` | Line 99–100 | Present in `myanmar-townships.ts:66` (38 entries) | Matrix must expand from 38 to 61 (58 townships + 3 gates). Returned object must support both canonical and alias fields. |
| `isRegionalPrepaidOnly(townshipQuery: string): boolean` | Line 101 | **MISSING** | Implement function returning `true` for `State/Region` and highway gates where `codAvailable === false`. |

### 2.2 Reconciling Property Names in `TownshipDeliveryInfo`
- `PROJECT.md` specifies:
  `{ townshipEn, townshipMm, region, feeMmk, estimatedDays, isCodAvailable, notes? }`
- `src/types/index.ts` and `src/lib/myanmar-townships.ts` define:
  `{ nameMm, nameEn, region, standardFeeMmk, codAvailable, estDays, notes? }`
- Existing callers (e.g. `gemini-agent.ts:137,138,161–165`) expect `.nameEn`, `.nameMm`, `.standardFeeMmk`, `.codAvailable`, `.estDays`.
- **Solution (Dual-Aliased Interface)**:
  `TownshipDeliveryInfo` should define BOTH sets of properties:
  ```typescript
  export interface TownshipDeliveryInfo {
    // Canonical / Existing properties
    nameMm: string;
    nameEn: string;
    region: 'Yangon' | 'Mandalay' | 'Naypyitaw' | 'State/Region';
    standardFeeMmk: number;
    codAvailable: boolean;
    estDays: string;
    notes?: string;
    // Contract alias properties (M2 <-> M3, M4)
    townshipMm?: string;
    townshipEn?: string;
    feeMmk?: number;
    estimatedDays?: string;
    isCodAvailable?: boolean;
    aliases?: string[];
  }
  ```
  And `lookupTownshipDelivery` will populate both sets (e.g. `townshipEn: item.nameEn`, `feeMmk: item.standardFeeMmk`, `isCodAvailable: item.codAvailable`, `estimatedDays: item.estDays`). This prevents breaking existing code while strictly satisfying `PROJECT.md`.

### 2.3 Contextual Wa (`ဝ`) vs Zero (`၀`) Correction Logic
- Myanmar consonant letter Wa `ဝ` (`\u101D`) and Myanmar digit zero `၀` (`\u1040`) look identical.
- In phone numbers and quantities, mobile users frequently type `ဝ` instead of `၀` (e.g. `ဝ၉၇၉၈...` or `09-4ဝဝ...`).
- **Critical Risk**: Blindly replacing `ဝ` (`\u101D`) with `0` globally across arbitrary text would corrupt real Burmese vocabulary words!
  - `ဝယ်မယ်` (wal ml = "will buy") would become `0ယ်မယ်`
  - `ဝတ်စုံ` (dress) would become `0တ်စုံ`
  - `အဝေးပြေးဂိတ်` (highway gate) would become `အ0ေးပြေးဂိတ်`
- **Solution**:
  1. `[၀-၉]` (Burmese digits), `๐` (Thai zero), and `႐-႙` (Shan digits) are unconditionally translated to `0-9`.
  2. Letter Wa `ဝ` is contextually translated to `0` ONLY when:
     - Directly preceded or followed by a digit / numeric punctuation: `/(?<=[0-9၀-၉])ဝ|ဝ(?=[0-9၀-၉])/g`
     - Or at the start of a phone number candidate: `/^ဝ(?=[9၉])/` or `/\bဝ(?=[9၉])/`
     - Or within `normalizeMyanmarPhone`, where the entire candidate string is treated as a phone number.

### 2.4 Integration Chain with `gemini-agent.ts` and `facebook/route.ts`

```
[Inbound FB Messenger / TikTok Webhook]
                 │ (rawMessageText)
                 ▼
  normalizeBurmese(rawMessageText)  ───► Converts Zawgyi -> Unicode; normalizes diacritics
                 │
                 ▼
  processCustomerMessage(normalized, context)
                 │
                 ├──► lookupTownshipDelivery(normalizedInput)
                 │      ├── Matches against 58 townships + 3 gates + colloquial aliases
                 │      ├── Returns rate, timeline, COD availability
                 │      └── Evaluates isRegionalPrepaidOnly(township)
                 │
                 ├──► convertBurmeseDigits(normalizedInput)
                 │      ├── Translates ၀-၉, ๐, context-aware ဝ to 0-9
                 │      └── Enables accurate phone & quantity matching
                 │
                 └──► normalizeMyanmarPhone(extractedPhone)
                        ├── Converts +959 / 959 / 09 / Burmese digits
                        └── Standardizes to 09XXXXXXXXX for Order draft
```

---

## 3. Caveats

1. **Prepaid Drop-off vs Intercity Bus Freight**:
   The fee returned by `lookupTownshipDelivery` for regional highway bus terminals (e.g. 3,500 MMK) represents the Yangon drop-off courier fee to deliver the parcel to Aung Mingalar or Dagon Ayeyar bus terminals. The intercity bus freight charge (တန်ဆာခ, 2,000–5,000 MMK) is paid by the recipient upon collecting the parcel at their local town's bus gate. The `notes` field in `TownshipDeliveryInfo` should document this distinction.
2. **Colloquial Township Names**:
   In conversational Myanmar, users frequently use shortened names (e.g. `မြောက်ဒဂုံ` for `ဒဂုံမြို့သစ်မြောက်ပိုင်း` / North Dagon, `တောင်ဒဂုံ` for South Dagon, `အရှေ့ဒဂုံ` for East Dagon). Including an `aliases` array in the matrix lookup ensures 100% natural conversational matching.
3. **No Direct Source Modification Constraint**:
   In strict adherence to dispatch constraints, no application files in `src/` were edited. All proposals, test suites, and schemas are fully specified in this report and ready for implementation.

---

## 4. Conclusion

1. **Contract Completeness**:
   Milestone 2 implementation must add `convertBurmeseDigits` and `isRegionalPrepaidOnly`, upgrade `isZawgyi` and `normalizeBurmese` with full Zawgyi mapping rules and canonical diacritic ordering, repair `normalizeMyanmarPhone` to handle Burmese digits and Wa typos, and expand `MYANMAR_DELIVERY_MATRIX` to 61 entries (58 townships + 3 highway gates).
2. **Downstream Integration**:
   - `src/lib/gemini-agent.ts` must replace its manual loop with `lookupTownshipDelivery`, integrate `convertBurmeseDigits` prior to phone regex matching, and sanitize phone numbers via `normalizeMyanmarPhone`.
   - `src/app/api/webhooks/facebook/route.ts` correctly integrates `normalizeBurmese` as its inbound sanitization gate.
3. **Dual-Aliasing Strategy**:
   `TownshipDeliveryInfo` must expose both `{ nameMm, nameEn, standardFeeMmk, codAvailable, estDays }` and `{ townshipMm, townshipEn, feeMmk, isCodAvailable, estimatedDays }` to maintain complete backward compatibility with existing code while satisfying `PROJECT.md`.
4. **Build Readiness**:
   Next.js production build (`cmd /c "npm run build"`) compiles with 0 errors.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Next.js Production Build**:
   ```powershell
   cmd /c "npm run build"
   ```
   *Expected*: Exit code 0, all routes compiled cleanly.
2. **Milestone 2 Automated Verification Runner**:
   ```powershell
   cmd /c "npx --yes tsx scripts/verify_m2_nlp_logistics.ts"
   ```
   *Expected*: All assertions pass cleanly (100% pass rate).

---

## Comprehensive Milestone 2 Automated Test Suite Design

Below is the complete architectural specification and implementation code for the Milestone 2 automated test suite, designed to be placed in `scripts/verify_m2_nlp_logistics.ts` (for immediate execution via `npx tsx`) and co-located in `tests/unit/m2_burmese_logistics.test.ts` (for Vitest):

```typescript
/**
 * Milestone 2 Automated Test Suite: Burmese NLP, Digit Normalization & Logistics Matrix
 * Coverage:
 *  1. Zawgyi vs Unicode Detection & Conversion Fidelity
 *  2. Burmese / Thai / Shan Digit Normalization & Contextual Wa vs Zero
 *  3. Myanmar Phone Number Normalization
 *  4. 58-Township Delivery Matrix, Fee Calculations & COD / Bus Gate Enforcement
 *  5. Downstream Interface Contract Compatibility (PROJECT.md)
 */

import {
  normalizeBurmese,
  isZawgyi,
  convertBurmeseDigits,
  normalizeMyanmarPhone,
} from '../src/lib/burmese-converter';
import {
  lookupTownshipDelivery,
  isRegionalPrepaidOnly,
  MYANMAR_DELIVERY_MATRIX,
} from '../src/lib/myanmar-townships';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

export async function runM2Tests() {
  console.log('================================================================');
  console.log('MILESTONE 2: BURMESE NLP & LOGISTICS AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  // ----------------------------------------------------------------------------
  // SUITE 1: Zawgyi vs Unicode Detection & Conversion Fidelity
  // ----------------------------------------------------------------------------
  console.log('--- SUITE 1: Zawgyi vs Unicode Detection & Conversion Fidelity ---');
  
  // Unicode samples should NOT be identified as Zawgyi
  assert(!isZawgyi('ဈေးဘယ်လောက်လဲ'), 'Unicode "ဈေးဘယ်လောက်လဲ" detected as Unicode');
  assert(!isZawgyi('စမ်းချောင်း မြို့နယ် ပို့ဆောင်ခ'), 'Unicode "စမ်းချောင်း" detected as Unicode');
  assert(!isZawgyi('မင်္ဂလာပါရှင်'), 'Unicode "မင်္ဂလာပါရှင်" detected as Unicode');
  assert(!isZawgyi('Hello, how much is this?'), 'English text detected as non-Zawgyi');
  assert(!isZawgyi(''), 'Empty string returns false');

  // Zawgyi samples MUST be detected as Zawgyi
  assert(isZawgyi('ေစ်းဘယ္ေလာက္လဲ'), 'Zawgyi "ေစ်းဘယ္ေလာက္လဲ" detected as Zawgyi');
  assert(isZawgyi('စမ္းေခ်ာင္း ပို့ခ'), 'Zawgyi "စမ္းေခ်ာင္း" detected as Zawgyi');
  assert(isZawgyi('ေရာင္းမည္'), 'Zawgyi "ေရာင္းမည္" detected as Zawgyi');
  assert(isZawgyi('မဂၤလာပါ'), 'Zawgyi Kinzi "မဂၤလာပါ" detected as Zawgyi');

  // Conversion fidelity
  assert(normalizeBurmese('ေစ်းဘယ္ေလာက္လဲ') === 'ဈေးဘယ်လောက်လဲ', 'Converts Zawgyi "ေစ်းဘယ္ေလာက္လဲ" to Unicode "ဈေးဘယ်လောက်လဲ"');
  assert(normalizeBurmese('စမ္းေခ်ာင္း ပို့ခ') === 'စမ်းချောင်း ပို့ခ', 'Converts Zawgyi "စမ္းေခ်ာင္း" to Unicode "စမ်းချောင်း"');
  assert(normalizeBurmese('ေရာင္းမည္') === 'ရောင်းမည်', 'Converts visual E-vowel order "ေရာင္းမည္" to "ရောင်းမည်"');
  assert(normalizeBurmese('မဂၤလာပါ') === 'မင်္ဂလာပါ', 'Converts Zawgyi Kinzi "မဂၤလာပါ" to Unicode "မင်္ဂလာပါ"');
  
  // Preservation of English and Mixed Burglish
  const burglish = 'Serum 1 bottle Sanchaung deli bl lout ll?';
  assert(normalizeBurmese(burglish) === burglish, 'Preserves mixed English and Burglish without corruption');

  // ----------------------------------------------------------------------------
  // SUITE 2: Burmese Numerals, Thai Zero & Wa vs Zero Corrections
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Burmese Numerals, Thai Zero & Wa vs Zero ---');

  // Burmese Digits conversion
  assert(convertBurmeseDigits('၀၁၂၃၄၅၆၇၈၉') === '0123456789', 'Converts all Burmese numerals ၀-၉ to 0-9');
  assert(convertBurmeseDigits('၂၈၀၀၀ ကျပ်') === '28000 ကျပ်', 'Converts price string "၂၈၀၀၀ ကျပ်" to "28000 ကျပ်"');
  assert(convertBurmeseDigits('အရေအတွက် ၃ ခု') === 'အရေအတွက် 3 ခု', 'Converts quantity "၃ ခု" to "3 ခု"');

  // Thai Zero conversion
  assert(convertBurmeseDigits('๐၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Converts Thai zero ๐ to 0');

  // Contextual Wa (ဝ) vs Zero (၀)
  assert(convertBurmeseDigits('ဝ၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Converts leading letter Wa in phone "ဝ၉..." to "09..."');
  assert(convertBurmeseDigits('09-4ဝဝ-11223') === '09-400-11223', 'Converts embedded letter Wa in numeric string "4ဝဝ" to "400"');
  
  // CRITICAL: Consonant Wa in Burmese vocabulary words MUST NOT be converted to 0
  assert(convertBurmeseDigits('ဝယ်မယ်') === 'ဝယ်မယ်', 'Preserves lexical word "ဝယ်မယ်" (does not corrupt to "0ယ်မယ်")');
  assert(convertBurmeseDigits('ဝတ်စုံ') === 'ဝတ်စုံ', 'Preserves lexical word "ဝတ်စုံ" (does not corrupt to "0တ်စုံ")');
  assert(convertBurmeseDigits('အဝေးပြေးဂိတ်') === 'အဝေးပြေးဂိတ်', 'Preserves lexical word "အဝေးပြေးဂိတ်" (does not corrupt to "အ0ေးပြေးဂိတ်")');

  // ----------------------------------------------------------------------------
  // SUITE 3: Myanmar Phone Number Normalization
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Myanmar Phone Number Normalization ---');

  // Standard domestic
  assert(normalizeMyanmarPhone('09798765432') === '09798765432', 'Normalizes standard "09798765432"');
  assert(normalizeMyanmarPhone('09 798 765 432') === '09798765432', 'Strips spaces from phone');
  assert(normalizeMyanmarPhone('09-798-765-432') === '09798765432', 'Strips hyphens from phone');
  assert(normalizeMyanmarPhone('09.798.765.432') === '09798765432', 'Strips dots from phone');

  // International formats
  assert(normalizeMyanmarPhone('+959798765432') === '09798765432', 'Normalizes "+959" prefix to "09"');
  assert(normalizeMyanmarPhone('+95 9 798 765 432') === '09798765432', 'Normalizes spaced "+95 9" to "09"');
  assert(normalizeMyanmarPhone('959798765432') === '09798765432', 'Normalizes "959" prefix to "09"');
  assert(normalizeMyanmarPhone('+9509798765432') === '09798765432', 'Normalizes "+9509" to "09"');

  // Burmese numerals in phone
  assert(normalizeMyanmarPhone('၀၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Normalizes Burmese digits "၀၉၇၉၈၇၆၅၄၃၂" to "09798765432"');
  assert(normalizeMyanmarPhone('+၉၅၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Normalizes international Burmese digits "+၉၅၉..." to "09..."');
  assert(normalizeMyanmarPhone('၀၉-၄၅၀၀-၁၁၂၂၃') === '09450011223', 'Normalizes hyphenated Burmese digits');

  // Typo corrections in phone
  assert(normalizeMyanmarPhone('ဝ၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Corrects letter Wa typo in phone "ဝ၉..."');
  assert(normalizeMyanmarPhone('ဝ၉-၄၅၀၀-၁၁၂၂၃') === '09450011223', 'Corrects letter Wa typo and Burmese digits combined');
  assert(normalizeMyanmarPhone('๐၉၂၅၀၀၉၉၈၈၇') === '09250099887', 'Corrects Thai zero in phone "๐၉..."');

  // ----------------------------------------------------------------------------
  // SUITE 4: 58-Township Delivery Matrix & COD / Bus Gate Enforcement
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 4: 58-Township Delivery Matrix & COD Enforcement ---');

  // Verify full matrix count (at least 58 townships + 3 highway gates = 61 entries)
  assert(MYANMAR_DELIVERY_MATRIX.length >= 58, `Delivery matrix contains ${MYANMAR_DELIVERY_MATRIX.length} verified locations (>= 58 required)`);

  // Yangon Downtown (2,500 MMK, COD: true)
  const sanchaung = lookupTownshipDelivery('Sanchaung');
  assert(sanchaung !== null && sanchaung.standardFeeMmk === 2500, 'Sanchaung delivery fee is 2,500 MMK');
  assert(sanchaung?.codAvailable === true, 'Sanchaung supports COD');
  assert(sanchaung?.region === 'Yangon', 'Sanchaung belongs to Yangon region');
  assert(isRegionalPrepaidOnly('Sanchaung') === false, 'Sanchaung is not prepaid-only');

  const kyauktadaMm = lookupTownshipDelivery('ကျောက်တံတား');
  assert(kyauktadaMm !== null && kyauktadaMm.standardFeeMmk === 2500, 'Burmese query "ကျောက်တံတား" fee is 2,500 MMK');
  assert(kyauktadaMm?.codAvailable === true, 'Kyauktada supports COD');

  // Yangon Outer Suburbs (3,000 to 5,000 MMK, COD: true)
  const mayangone = lookupTownshipDelivery('Mayangone');
  assert(mayangone?.standardFeeMmk === 3000, 'Mayangone fee is 3,000 MMK');

  const northDagon = lookupTownshipDelivery('North Dagon');
  assert(northDagon?.standardFeeMmk === 3500 && northDagon?.codAvailable === true, 'North Dagon fee is 3,500 MMK with COD');

  const hlaingthaya = lookupTownshipDelivery('Hlaingthaya');
  assert(hlaingthaya?.standardFeeMmk === 4000 && hlaingthaya?.codAvailable === true, 'Hlaingthaya fee is 4,000 MMK with COD');

  const thanlyin = lookupTownshipDelivery('Thanlyin');
  assert(thanlyin?.standardFeeMmk === 4500 && thanlyin?.codAvailable === true, 'Thanlyin fee is 4,500 MMK with COD');

  // Mandalay Municipal (3,000 to 4,000 MMK, COD: true)
  const chanayethazan = lookupTownshipDelivery('Chanayethazan');
  assert(chanayethazan?.standardFeeMmk === 3000 && chanayethazan?.codAvailable === true, 'Chanayethazan fee is 3,000 MMK with COD');
  assert(chanayethazan?.region === 'Mandalay', 'Chanayethazan region is Mandalay');

  const amarapura = lookupTownshipDelivery('အမရပူရ');
  assert(amarapura?.standardFeeMmk === 4000 && amarapura?.codAvailable === true, 'Amarapura fee is 4,000 MMK with COD');

  // Naypyitaw (4,000 to 4,500 MMK, COD: true)
  const zabuthiri = lookupTownshipDelivery('ဇမ္ဗူသီရိ');
  assert(zabuthiri?.standardFeeMmk === 4000 && zabuthiri?.codAvailable === true, 'Zabuthiri fee is 4,000 MMK with COD');
  assert(zabuthiri?.region === 'Naypyitaw', 'Zabuthiri region is Naypyitaw');

  // Regional Cities (Prepaid Only, COD: false)
  const taunggyi = lookupTownshipDelivery('Taunggyi');
  assert(taunggyi?.standardFeeMmk === 5000, 'Taunggyi fee is 5,000 MMK');
  assert(taunggyi?.codAvailable === false, 'Taunggyi strictly enforces COD: false (Prepaid Only)');
  assert(isRegionalPrepaidOnly('Taunggyi') === true, 'isRegionalPrepaidOnly("Taunggyi") returns true');

  const mawlamyine = lookupTownshipDelivery('မော်လမြိုင်');
  assert(mawlamyine?.codAvailable === false, 'Mawlamyine strictly enforces COD: false (Prepaid Only)');
  assert(isRegionalPrepaidOnly('မော်လမြိုင်') === true, 'isRegionalPrepaidOnly("မော်လမြိုင်") returns true');

  const lashio = lookupTownshipDelivery('Lashio');
  assert(lashio?.standardFeeMmk === 5500 && lashio?.codAvailable === false, 'Lashio fee is 5,500 MMK with COD: false');

  // Highway Express Bus Terminals (3,500 MMK drop-off, COD: false)
  const aungMingalar = lookupTownshipDelivery('အောင်မင်္ဂလာ အဝေးပြေးဂိတ်');
  assert(aungMingalar?.standardFeeMmk === 3500 && aungMingalar?.codAvailable === false, 'Aung Mingalar Bus Terminal fee is 3,500 MMK with COD: false');
  assert(isRegionalPrepaidOnly('Aung Mingalar Highway Bus Terminal') === true, 'Aung Mingalar is regional prepaid-only');

  const dagonAyeyar = lookupTownshipDelivery('Dagon Ayeyar Highway Bus Terminal');
  assert(dagonAyeyar?.standardFeeMmk === 3500 && dagonAyeyar?.codAvailable === false, 'Dagon Ayeyar Bus Terminal fee is 3,500 MMK with COD: false');

  // Edge cases & unknown locations
  assert(lookupTownshipDelivery('Tokyo') === null, 'Unknown location returns null');
  assert(lookupTownshipDelivery('') === null, 'Empty string returns null');

  // Colloquial alias matching
  const aliasMatch = lookupTownshipDelivery('မြောက်ဒဂုံ');
  assert(aliasMatch !== null && aliasMatch.nameEn === 'North Dagon', 'Colloquial alias "မြောက်ဒဂုံ" resolves to "North Dagon"');

  // ----------------------------------------------------------------------------
  // SUITE 5: Downstream Contract Compatibility (Dual Aliases)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Downstream Contract Compatibility ---');

  const sampleInfo = lookupTownshipDelivery('Sanchaung');
  assert(sampleInfo?.nameEn === 'Sanchaung', 'Exposes canonical nameEn');
  assert(sampleInfo?.townshipEn === 'Sanchaung', 'Exposes PROJECT.md contract townshipEn');
  assert(sampleInfo?.nameMm === 'စမ်းချောင်း', 'Exposes canonical nameMm');
  assert(sampleInfo?.townshipMm === 'စမ်းချောင်း', 'Exposes PROJECT.md contract townshipMm');
  assert(sampleInfo?.standardFeeMmk === 2500, 'Exposes canonical standardFeeMmk');
  assert(sampleInfo?.feeMmk === 2500, 'Exposes PROJECT.md contract feeMmk');
  assert(sampleInfo?.codAvailable === true, 'Exposes canonical codAvailable');
  assert(sampleInfo?.isCodAvailable === true, 'Exposes PROJECT.md contract isCodAvailable');
  assert(typeof sampleInfo?.estDays === 'string', 'Exposes canonical estDays');
  assert(typeof sampleInfo?.estimatedDays === 'string', 'Exposes PROJECT.md contract estimatedDays');

  console.log('\n================================================================');
  console.log(`TOTAL ASSERTIONS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('\n>>> ALL MILESTONE 2 ASSERTIONS PASSED CLEANLY! <<<');
    process.exit(0);
  } else {
    console.error('\n>>> SOME ASSERTIONS FAILED! <<<');
    process.exit(1);
  }
}

runM2Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
```
