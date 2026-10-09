# Milestone 2 Iteration 2 Exploration Report: Naypyitaw Substring Collision Remediation Blueprint

**Agent**: `explorer_m2_it2_2` (`teamwork_preview_explorer`)  
**Mission**: Analyze `src/lib/myanmar-townships.ts` and formulate the exact remediation blueprint for the substring collision bug between `နေပြည်တော်` and `Pyay` (`ပြည်`).  
**Working Directory**: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m2_it2_2`  
**Parent**: `orchestrator_1` (Conversation ID: `6b3e572e-862e-4f21-b794-2d675500d1e9`)  
**Timestamp**: 2026-10-07T07:10:00Z  

---

## 1. Observation

### 1.1 Direct Reproduction Command & Output
Executing the adversarial challenge harness directly on the codebase:
```powershell
npx.cmd tsx tests/challenge_m2_townships.ts
```
**Exit Code**: 1  
**Verbatim Output Snippet**:
```
  [PASS] [Policy-Metro] Metro indicator "Yangon" returns isRegionalPrepaidOnly === false
  [PASS] [Policy-Metro] Metro indicator "Mandalay" returns isRegionalPrepaidOnly === false
  [PASS] [Policy-Metro] Metro indicator "Naypyitaw" returns isRegionalPrepaidOnly === false
  [PASS] [Policy-Metro] Metro indicator "ရန်ကုန်" returns isRegionalPrepaidOnly === false
  [PASS] [Policy-Metro] Metro indicator "မန္တလေး" returns isRegionalPrepaidOnly === false
  [FAIL] [Policy-Metro] Metro indicator "နေပြည်တော်" returns isRegionalPrepaidOnly === false -> Condition evaluated to false

--- CATEGORY 6: Dual-Aliased Contract Conformance ---
  [PASS] [Contract] All 61 matrix items expose 100% valid dual-aliased properties (PROJECT.md contract)

--- CATEGORY 7: Adversarial Boundary & Negative Input Tests ---
  [PASS] [Negative] Empty string returns null
  [PASS] [Negative] Whitespace string returns null
  [PASS] [Negative] Null / undefined cast returns null
  [PASS] [Negative] Number input cast returns null
  [PASS] [Negative] Object input cast returns null
  [PASS] [Negative] Foreign city "Tokyo" returns null
  [PASS] [Negative] Foreign city "Bangkok" returns null
  [PASS] [Negative] Foreign city "Singapore" returns null
  [PASS] [Negative] Foreign city "New York" returns null
  [PASS] [Negative] Gibberish string returns null
  [FAIL] [Collision-Pyay] Query "နေပြည်တော်" does NOT collide with Pyay (ပြည်) -> CRITICAL BUG: "နေပြည်တော်" collided with "Pyay" (ပြည်, State/Region) because "ပြည်" is a substring of "နေပြည်တော်"
  [FAIL] [Collision-Pyay] Query "နေပြည်တော်မြို့" does NOT collide with Pyay (ပြည်) -> CRITICAL BUG: "နေပြည်တော်မြို့" collided with "Pyay"
  [PASS] [Negative] SQL injection string without township returns null
  [PASS] [Negative] HTML script injection returns null
  [PASS] [Negative] Query "မြို့နယ်" alone returns null
  [PASS] [Negative] Query "township" alone returns null
  [PASS] [Negative] Query "city" alone returns null

================================================================
CHALLENGE SUMMARY REPORT
================================================================
TOTAL CHALLENGE ASSERTIONS : 295
PASSED                     : 292
FAILED                     : 3
================================================================

❌ ADVERSARIAL VERDICT: REJECT (3 assertions failed)
```

Direct inspection via one-liner probe:
```powershell
npx.cmd tsx -e "import { lookupTownshipDelivery, isRegionalPrepaidOnly } from './src/lib/myanmar-townships'; ['Yangon', 'Mandalay', 'Naypyitaw', 'ရန်ကုန်', 'မန္တလေး', 'နေပြည်တော်', 'နေပြည်တော်မြို့'].forEach(q => console.log(q, '-> lookup:', lookupTownshipDelivery(q)?.nameEn, 'prepaidOnly:', isRegionalPrepaidOnly(q)));"
```
**Output**:
```
Yangon -> lookup: undefined prepaidOnly: false
Mandalay -> lookup: undefined prepaidOnly: false
Naypyitaw -> lookup: undefined prepaidOnly: false
ရန်ကုန် -> lookup: undefined prepaidOnly: false
မန္တလေး -> lookup: undefined prepaidOnly: false
နေပြည်တော် -> lookup: Pyay prepaidOnly: true
နေပြည်တော်မြို့ -> lookup: Pyay prepaidOnly: true
```

### 1.2 Exact Code Locations in `src/lib/myanmar-townships.ts`

1. **`TOWNSHIP_ALIASES['Zabuthiri']` (Lines 638)**:
   ```typescript
   638: Zabuthiri: ['Zabu Thiri', 'ဇမ္ဗူသီရိ', 'ဇမၺဴသီရိ', 'ဇမ္ဗူသီရိမြို့နယ်', 'နေပြည်တော် ဇမ္ဗူသီရိ'],
   ```
   *Observation*: Standalone capital queries `'နေပြည်တော်'`, `'နေပြည်တော်မြို့'`, and `'naypyitaw'` are missing from `Zabuthiri` (the central municipal township of the capital union territory).

2. **Tier 2 Prefix/Suffix Stripping (Lines 746–758)**:
   ```typescript
   746:   // Tier 2: Strip common prefixes and suffixes
   747:   const stripped = queryLower
   748:     .replace(/^(မန္တလေး|နေပြည်တော်|ရန်ကုန်|yangon|mandalay|naypyitaw)\s*/gi, '')
   749:     .replace(/\s*(မြို့နယ်|မြို့|township|tsp|city|ကားဂိတ်|ဂိတ်|bus gate|gate)$/gi, '')
   750:     .trim();
   751: 
   752:   if (stripped && stripped !== queryLower) {
   753:     for (const entry of SEARCH_INDEX) {
   754:       if (stripped === entry.pattern) {
   755:         return enrichDeliveryInfo(entry.item);
   756:       }
   757:     }
   758:   }
   ```
   *Observation*: When `query = 'နေပြည်တော်'` or `'နေပြည်တော်မြို့'`, regex lines 748–749 strip `'နေပြည်တော်'` and `'မြို့'`, reducing `stripped` to `""`. Because `stripped` is empty, condition line 752 evaluates to `false`, and the search drops into Tier 3.

3. **Tier 3 Substring Pattern Matching (Lines 760–769)**:
   ```typescript
   760:   // Tier 3: Substring pattern matching (longest pattern first)
   761:   for (const entry of SEARCH_INDEX) {
   762:     // Only match patterns of length >= 3 to prevent accidental single-char/noise matches
   763:     if (entry.pattern.length >= 3) {
   764:       if (queryLower.includes(entry.pattern) || rawTrimmed.includes(entry.pattern)) {
   765:         return enrichDeliveryInfo(entry.item);
   766:       }
   767:     }
   768:   }
   ```
   *Observation*: In `SEARCH_INDEX`, `Pyay` has pattern `'ပြည်'` (4 UTF-16 code units: `ပ` + `ျ` + `ည` + `်`). Since `'နေပြည်တော်'` (`နေ` + `ပြည်` + `တော်`) contains `'ပြည်'`, `queryLower.includes('ပြည်')` evaluates to `true`. Pyay is returned with `standardFeeMmk: 4500`, `region: 'State/Region'`, and `codAvailable: false`.

4. **`isRegionalPrepaidOnly` (Lines 778–803)**:
   ```typescript
   778: export function isRegionalPrepaidOnly(query: string): boolean {
   779:   if (!query || typeof query !== 'string') return false;
   780: 
   781:   const matched = lookupTownshipDelivery(query);
   782:   if (matched) {
   783:     return !matched.codAvailable;
   784:   }
   785: 
   786:   // Fallback heuristic: check for explicit highway bus gate or regional cargo indicators
   ...
   ```
   *Observation*: For `query = 'နေပြည်တော်'`, `lookupTownshipDelivery` returns hijacked `Pyay` where `codAvailable === false`. Line 783 computes `!false`, returning `true`. This violates the contract that Naypyitaw must have `isRegionalPrepaidOnly === false`.

---

## 2. Logic Chain

1. **User Requirement & Contract Invariants**:
   - `PROJECT.md` line 17 & 99–101: Naypyitaw is a COD-supported metro zone alongside Yangon and Mandalay.
   - `isRegionalPrepaidOnly(query)` MUST return `false` for Yangon, Mandalay, and Naypyitaw metro queries, while Regional cities and Highway Express Bus gates MUST return `true`.
   - `lookupTownshipDelivery('နေပြည်တော်')` and `lookupTownshipDelivery('နေပြည်တော်မြို့')` MUST NOT collide with Pyay (`ပြည်`, Bago Region).
2. **Causal Path of the Defect**:
   - Query `'နေပြည်တော်'` arrives.
   - Tier 1: No match because `TOWNSHIP_ALIASES['Zabuthiri']` only had `'နေပြည်တော် ဇမ္ဗူသီရိ'`, not standalone `'နေပြည်တော်'`.
   - Tier 2: The regex strips prefix `နေပြည်တော်`, leaving `""`. Because `stripped === ""`, Tier 2 exits without matching.
   - Tier 3: Substring search iterates through `SEARCH_INDEX`. Because Pyay's Burmese name is `'ပြည်'` and `'နေပြည်တော်'` contains `'ပြည်'`, `'နေပြည်တော်'.includes('ပြည်')` matches.
   - Result: `lookupTownshipDelivery('နေပြည်တော်')` returns `Pyay` (4,500 MMK, Bago Region, COD: false).
   - In `isRegionalPrepaidOnly('နေပြည်တော်')`, `!matched.codAvailable` returns `!false = true`, wrongly classifying the national capital as regional prepaid-only.
3. **Remediation Rationale**:
   - **Step 1 (`Zabuthiri` Aliases)**: Adding `'နေပြည်တော်'`, `'နေပြည်တော်မြို့'`, and `'naypyitaw'` to `TOWNSHIP_ALIASES['Zabuthiri']` ensures standalone queries resolve in Tier 1 directly to Zabuthiri (Naypyitaw central township, 4,000 MMK, COD: true).
   - **Step 2 (Tier 2 Suffix & Prefix Decoupling)**: 
     - First strip suffixes (e.g. `မြို့နယ်`, `မြို့`, `city`, `township`). If `suffixStripped` matches an alias (like `နေပြည်တော်`), return it.
     - Next strip prefixes (e.g. `Yangon`, `Mandalay`, `နေပြည်တော်`).
     - If prefix stripping collapses the query to `""` (e.g. standalone `Yangon`, `မန္တလေး`, `နေပြည်တော်`), check if the metro token itself matches a township (e.g. Naypyitaw -> Zabuthiri) or return `null` immediately. This completely prevents standalone metro queries from falling through to Tier 3 substring search.
   - **Step 3 (`isRegionalPrepaidOnly` Policy Hardening)**:
     - Check `regionalIndicators` first (ensuring gates like `'မန္တလေး အဝေးပြေးကားဂိတ်'` remain `true`).
     - Check `metroIndicators` second (ensuring `'yangon'`, `'mandalay'`, `'naypyitaw'`, `'ရန်ကုန်'`, `'မန္တလေး'`, `'နေပြည်တော်'` unconditionally return `false` even if unmapped to a specific township).
     - Default to `false`.

---

## 3. Caveats

- **Scope Boundary**: 
  - `Yangon` and `Mandalay` contain 34 and 7 distinct municipal townships respectively. Standalone queries for `"Yangon"` or `"Mandalay"` return `null` from `lookupTownshipDelivery` because customers must select a specific township for delivery fee calculation (ranging from 2,500 to 5,000 MMK). However, for payment policy, `isRegionalPrepaidOnly("Yangon")` and `isRegionalPrepaidOnly("Mandalay")` return `false` (COD supported).
  - Standalone `"Naypyitaw"` / `"နေပြည်တော်"` resolves to `Zabuthiri` (the administrative and commercial heart of Naypyitaw, flat standard fee 4,000 MMK, COD: true).
- **No Side-Effects on Other Townships**:
  - `Pyay` (`ပြည်`, `Pyay`, `ပြည်မြို့`, `Prome`): 100% preserved. In Tier 1, exact query `'ပြည်'` matches Pyay.
  - `Pyinmana` (`ပျဉ်းမနား`, `Pyinmana`): 100% preserved.
  - `Pyigyidagun` (`ပြည်ကြီးတံခွန်`, `Pyigyidagun`): 100% preserved.
  - `Dagon` cluster, `Pathein`/`Patheingyi`, `Hlaing`/`Hlaingthaya`: 100% preserved.
  - All 3 Bus Gates (`Aung Mingalar`, `Dagon Ayeyar`, `Saw Bwar Gyi Gone`): 100% preserved.

---

## 4. Conclusion & Actionable Blueprint

### 4.1 Target File: `src/lib/myanmar-townships.ts`

#### Change 1: Update `TOWNSHIP_ALIASES['Zabuthiri']` (Around Line 638)
```typescript
<<<< CURRENT CODE:
  // Naypyitaw
  Zabuthiri: ['Zabu Thiri', 'ဇမ္ဗူသီရိ', 'ဇမၺဴသီရိ', 'ဇမ္ဗူသီရိမြို့နယ်', 'နေပြည်တော် ဇမ္ဗူသီရိ'],

==== PROPOSED CODE:
  // Naypyitaw
  Zabuthiri: [
    'Zabu Thiri',
    'ဇမ္ဗူသီရိ',
    'ဇမၺဴသီရိ',
    'ဇမ္ဗူသီရိမြို့နယ်',
    'နေပြည်တော် ဇမ္ဗူသီရိ',
    'နေပြည်တော်',
    'နေပြည်တော်မြို့',
    'naypyitaw',
  ],
>>>>
```

#### Change 2: Refactor Tier 2 in `lookupTownshipDelivery` (Around Lines 746–758)
```typescript
<<<< CURRENT CODE:
  // Tier 2: Strip common prefixes and suffixes
  const stripped = queryLower
    .replace(/^(မန္တလေး|နေပြည်တော်|ရန်ကုန်|yangon|mandalay|naypyitaw)\s*/gi, '')
    .replace(/\s*(မြို့နယ်|မြို့|township|tsp|city|ကားဂိတ်|ဂိတ်|bus gate|gate)$/gi, '')
    .trim();

  if (stripped && stripped !== queryLower) {
    for (const entry of SEARCH_INDEX) {
      if (stripped === entry.pattern) {
        return enrichDeliveryInfo(entry.item);
      }
    }
  }

==== PROPOSED CODE:
  // Tier 2: Strip common prefixes and suffixes
  // First, strip common suffixes (e.g. "စမ်းချောင်းမြို့နယ်", "မော်လမြိုင်မြို့", "နေပြည်တော်မြို့")
  const suffixStripped = queryLower
    .replace(/\s*(မြို့နယ်|မြို့|township|tsp|city|ကားဂိတ်|ဂိတ်|bus gate|gate)$/gi, '')
    .trim();

  if (suffixStripped && suffixStripped !== queryLower) {
    for (const entry of SEARCH_INDEX) {
      if (suffixStripped === entry.pattern) {
        return enrichDeliveryInfo(entry.item);
      }
    }
  }

  // Next, strip metro prefixes (e.g. "Yangon Sanchaung", "ရန်ကုန် စမ်းချောင်း")
  const targetForPrefix = suffixStripped || queryLower;
  const prefixStripped = targetForPrefix
    .replace(/^(မန္တလေး|နေပြည်တော်|ရန်ကုန်|yangon|mandalay|naypyitaw)\s*/gi, '')
    .trim();

  if (prefixStripped) {
    if (prefixStripped !== queryLower) {
      for (const entry of SEARCH_INDEX) {
        if (prefixStripped === entry.pattern) {
          return enrichDeliveryInfo(entry.item);
        }
      }
    }
  } else {
    // Prefix stripping collapsed the query to "" (i.e. query was purely a metro name like "Yangon", "မန္တလေး", "နေပြည်တော်")
    // If it's a known metro that maps to a township (e.g. Naypyitaw -> Zabuthiri), try matching the metro token itself.
    // Otherwise, it's a generic metro query (Yangon/Mandalay) without a township, so return null immediately
    // rather than falling through to Tier 3 substring search.
    const metroToken = queryLower.match(/^(မန္တလေး|နေပြည်တော်|ရန်ကုန်|yangon|mandalay|naypyitaw)/i)?.[0];
    if (metroToken) {
      for (const entry of SEARCH_INDEX) {
        if (metroToken === entry.pattern) {
          return enrichDeliveryInfo(entry.item);
        }
      }
      return null;
    }
  }
>>>>
```

#### Change 3: Harden `isRegionalPrepaidOnly` (Around Lines 778–803)
```typescript
<<<< CURRENT CODE:
export function isRegionalPrepaidOnly(query: string): boolean {
  if (!query || typeof query !== 'string') return false;

  const matched = lookupTownshipDelivery(query);
  if (matched) {
    return !matched.codAvailable;
  }

  // Fallback heuristic: check for explicit highway bus gate or regional cargo indicators
  const normalized = query.trim().toLowerCase();
  const regionalIndicators = [
    'ကားဂိတ်',
    'အဝေးပြေး',
    'ဂိတ်ချ',
    'တန်ဆာခ',
    'နယ်ဝေး',
    'နယ်စုံ',
    'highway',
    'express gate',
    'bus gate',
    'bus terminal',
    'prepaid only',
  ];

  return regionalIndicators.some((k) => normalized.includes(k));
}

==== PROPOSED CODE:
export function isRegionalPrepaidOnly(query: string): boolean {
  if (!query || typeof query !== 'string') return false;

  const matched = lookupTownshipDelivery(query);
  if (matched) {
    return !matched.codAvailable;
  }

  const normalized = query.trim().toLowerCase();

  // Highway bus gate or regional cargo indicators ALWAYS require prepaid
  const regionalIndicators = [
    'ကားဂိတ်',
    'အဝေးပြေး',
    'ဂိတ်ချ',
    'တန်ဆာခ',
    'နယ်ဝေး',
    'နယ်စုံ',
    'highway',
    'express gate',
    'bus gate',
    'bus terminal',
    'prepaid only',
  ];

  if (regionalIndicators.some((k) => normalized.includes(k))) {
    return true;
  }

  // Pure metro region indicators (Yangon, Mandalay, Naypyitaw) support COD -> return false
  const metroIndicators = ['yangon', 'mandalay', 'naypyitaw', 'ရန်ကုန်', 'မန္တလေး', 'နေပြည်တော်'];
  if (metroIndicators.some((k) => normalized.includes(k))) {
    return false;
  }

  return false;
}
>>>>
```

### 4.2 Machine-Applicable Diff Patch File
A full unified diff patch has been generated and saved to:
`c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m2_it2_2\remediation.patch`

---

## 5. Verification Method

### 5.1 Sandbox Verification
The complete proposed implementation was verified in the explorer sandbox against all 296 assertions:
```powershell
npx.cmd tsx .agents/teamwork/explorer_m2_it2_2/test_full_harness.ts
```
**Empirical Result**:
```
TOTAL HARNESS ASSERTIONS: 296
PASSED: 296
FAILED: 0
✅ ALL 100% PROPOSED HARNESS ASSERTIONS PASSED CLEANLY!
```

### 5.2 Implementer Post-Change Verification Instructions
Once the implementer (`worker_m2`) applies the changes to `src/lib/myanmar-townships.ts`:

1. **Run the adversarial challenge suite**:
   ```powershell
   npx.cmd tsx tests/challenge_m2_townships.ts
   ```
   *Expected outcome*: Exits with code 0. Reports:
   ```
   TOTAL CHALLENGE ASSERTIONS : 295
   PASSED                     : 295
   FAILED                     : 0
   ✅ ADVERSARIAL VERDICT: APPROVE (295/295 assertions passed cleanly)
   ```

2. **Run the baseline Vitest test suite**:
   ```powershell
   npm.cmd test
   ```
   *Expected outcome*: All unit, integration, and forensic tests pass cleanly (127/127 passing assertions in `m2_burmese_logistics.test.ts` and 106/106 probes in `challenge_m1_adversarial.ts`).

3. **Verify isolated queries via quick probe**:
   ```powershell
   npx.cmd tsx -e "import { lookupTownshipDelivery, isRegionalPrepaidOnly } from './src/lib/myanmar-townships'; console.log('နေပြည်တော်:', lookupTownshipDelivery('နေပြည်တော်')?.nameEn, 'prepaid:', isRegionalPrepaidOnly('နေပြည်တော်')); console.log('ပြည်:', lookupTownshipDelivery('ပြည်')?.nameEn, 'prepaid:', isRegionalPrepaidOnly('ပြည်'));"
   ```
   *Expected output*:
   - `နေပြည်တော်: Zabuthiri prepaid: false`
   - `ပြည်: Pyay prepaid: true`

4. **Invalidation Conditions**:
   - If `lookupTownshipDelivery('နေပြည်တော်')` returns `Pyay` or `null`.
   - If `isRegionalPrepaidOnly('နေပြည်တော်')` returns `true`.
   - If `isRegionalPrepaidOnly('မန္တလေး အဝေးပြေးကားဂိတ်')` returns `false`.
   - If any of the existing 61 locations in `MYANMAR_DELIVERY_MATRIX` fail lookup.
