# Milestone 2 Adversarial Challenge Report — Myanmar Townships & Logistics Matrix

**Agent**: `challenger_m2_2` (`teamwork_preview_challenger`)  
**Target Module**: `src/lib/myanmar-townships.ts`  
**Interface Contracts**: `PROJECT.md`, `.agents/teamwork/ORIGINAL_REQUEST.md`  
**Adversarial Harness**: `tests/challenge_m2_townships.ts`  
**Timestamp**: 2026-10-07T06:56:00Z  
**Verdict**: **REJECT** (Empirically verified failure in substring collision and prepaid policy enforcement)

---

## 1. Observation

### 1.1 Test Harness Execution
Command executed:
```powershell
npx.cmd tsx tests/challenge_m2_townships.ts
```
Result summary:
```
TOTAL CHALLENGE ASSERTIONS : 295
PASSED                     : 292
FAILED                     : 3
❌ ADVERSARIAL VERDICT: REJECT (3 assertions failed)
```

### 1.2 Verbatim Test Failures
Direct quotes from test output:
```
[FAIL] [Policy-Metro] Metro indicator "နေပြည်တော်" returns isRegionalPrepaidOnly === false -> Condition evaluated to false

[FAIL] [Collision-Pyay] Query "နေပြည်တော်" does NOT collide with Pyay (ပြည်) -> CRITICAL BUG: "နေပြည်တော်" collided with "Pyay" (ပြည်, State/Region) because "ပြည်" is a substring of "နေပြည်တော်"

[FAIL] [Collision-Pyay] Query "နေပြည်တော်မြို့" does NOT collide with Pyay (ပြည်) -> CRITICAL BUG: "နေပြည်တော်မြို့" collided with "Pyay"
```

### 1.3 Exact Code Paths in `src/lib/myanmar-townships.ts`
1. **Lines 482–489**:
   ```typescript
   {
     nameMm: 'ပြည်',
     nameEn: 'Pyay',
     region: 'State/Region',
     standardFeeMmk: 4500,
     codAvailable: false,
     estDays: '2-3 Days (Prepaid Only)',
     notes: 'Bago Region West; 100% Prepaid via KPay/WavePay; highway bus gate drop-off',
   }
   ```
2. **Lines 649**:
   ```typescript
   Pyay: ['Prome', 'ပြည်', 'ျပည္', 'ပြည်မြို့'],
   ```
3. **Lines 747–758 (Tier 2 Prefix/Suffix Stripping)**:
   ```typescript
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
   ```
   When `query = 'နေပြည်တော်'`, `stripped` is `""`. Since `stripped` is an empty string, Tier 2 fails to match any township.
4. **Lines 760–769 (Tier 3 Substring Pattern Matching)**:
   ```typescript
   for (const entry of SEARCH_INDEX) {
     if (entry.pattern.length >= 3) {
       if (queryLower.includes(entry.pattern) || rawTrimmed.includes(entry.pattern)) {
         return enrichDeliveryInfo(entry.item);
       }
     }
   }
   ```
   The pattern for Pyay is `'ပြည်'` (length 4). The string `'နေပြည်တော်'` contains the substring `'ပြည်'` (`နေ` + `ပြည်` + `တော်`). Tier 3 matches and returns `Pyay`.
5. **Lines 778–785 (`isRegionalPrepaidOnly`)**:
   ```typescript
   export function isRegionalPrepaidOnly(query: string): boolean {
     if (!query || typeof query !== 'string') return false;

     const matched = lookupTownshipDelivery(query);
     if (matched) {
       return !matched.codAvailable;
     }
   ```
   Because `lookupTownshipDelivery('နေပြည်တော်')` resolves to `Pyay` (where `codAvailable === false`), `!matched.codAvailable` returns `true`.

---

## 2. Logic Chain

1. **Contract Requirement**: In `PROJECT.md` line 17 and `myanmar-townships.ts` lines 775–776, Yangon, Mandalay, and Naypyitaw are COD-supported regions where `isRegionalPrepaidOnly` MUST return `false`. The dispatch mission explicitly specifies:
   *"Strict prepaid policy enforcement: Yangon/Mandalay/Naypyitaw return isRegionalPrepaidOnly === false, Regional/Gates return true."*
2. **Naypyitaw Matrix Coverage**: The matrix covers 6 Naypyitaw townships (`Zabuthiri`, `Ottarathiri`, `Dekkhinathiri`, `Pobbathiri`, `Pyinmana`, `Tatkone`), but neither the matrix nor `TOWNSHIP_ALIASES` defines standalone `'နေပြည်တော်'` as an alias for Naypyitaw or its central township `Zabuthiri`.
3. **Substring Collision**: When a customer queries `'နေပြည်တော်'` or `'နေပြည်တော်မြို့'`, Tier 2 strips the prefix `'နေပြည်တော်'`, reducing the query to `""`. It then falls through to Tier 3.
4. **False Positive Hijacking**: In Tier 3, `SEARCH_INDEX` iterates over patterns. The entry for `Pyay` has `nameMm: 'ပြည်'`. Because Burmese `နေပြည်တော်` contains `ပြည်` (`နေ` + `ပြည်` + `တော်`), `'နေပြည်တော်'.includes('ပြည်')` evaluates to `true`.
5. **Policy Inversion**: `lookupTownshipDelivery('နေပြည်တော်')` returns `{ nameEn: 'Pyay', nameMm: 'ပြည်', region: 'State/Region', standardFeeMmk: 4500, codAvailable: false }`.
6. **Customer Impact**: When `isRegionalPrepaidOnly('နေပြည်တော်')` runs, it inspects the matched delivery info for `Pyay` and returns `true`. A customer in the national capital / union territory Naypyitaw is misclassified as being in Pyay (Bago Region, ~280 km away), quoted 4,500 MMK instead of 4,000 MMK, and denied COD payment.
7. **Adversarial Assertion Failure**: 3 distinct empirical assertions failed in `tests/challenge_m2_townships.ts`.

---

## 3. Caveats

- **Robust Components (292/295 Passed)**:
  - Substring collision prevention between `Dagon` vs `North Dagon` vs `South Dagon` vs `East Dagon` vs `Dagon Seikkan` vs `Dagon Ayeyar Highway Bus Terminal` passed cleanly.
  - Substring collision prevention between `Pathein` vs `Patheingyi` passed cleanly.
  - Substring collision prevention between `Hlaing` vs `Hlaingthaya` passed cleanly.
  - Substring collision prevention between `Pyay` vs `Pyigyidagun` vs `Pyinmana` passed cleanly.
  - All 3 Highway Express Bus Gates (`Aung Mingalar`, `Dagon Ayeyar`, `Saw Bwar Gyi Gone`) passed all fee (3,500 MMK), prepaid status (`codAvailable: false`), and notes assertions.
  - 100% of the 61 matrix items expose required dual-aliased properties (`townshipEn`, `townshipMm`, `feeMmk`, `isCodAvailable`, `estimatedDays`).
  - Yangon and Mandalay metro lookups and policy checks passed cleanly.
- The failure is isolated specifically to the interaction between Burmese `နေပြည်တော်` and `Pyay` (`ပြည်`).

---

## 4. Conclusion

**Verdict: REJECT**

Milestone 2 cannot be approved in its current state due to a reproducible substring collision where `နေပြည်တော်` (Naypyitaw) is hijacked by `ပြည်` (Pyay), causing Naypyitaw users to be misrouted to Bago Region with incorrect delivery pricing (4,500 MMK vs 4,000 MMK) and incorrect 100% prepaid-only enforcement (`isRegionalPrepaidOnly('နေပြည်တော်') === true`).

### Actionable Remediation:
1. In `src/lib/myanmar-townships.ts`, add `'နေပြည်တော်'`, `'နေပြည်တော်မြို့'`, `'naypyitaw'` to `TOWNSHIP_ALIASES['Zabuthiri']` (Naypyitaw central administrative township) so that standalone Naypyitaw queries resolve to Naypyitaw with COD: true.
2. In Tier 2 prefix stripping, if `queryLower` is exactly equal to one of the metro city names (`'နေပြည်တော်'`, `'မန္တလေး'`, `'ရန်ကုန်'`, `'naypyitaw'`, `'mandalay'`, `'yangon'`), do not let it collapse to an empty string and fall through to Tier 3 substring search.
3. In `isRegionalPrepaidOnly`, ensure metro indicators (`'yangon'`, `'mandalay'`, `'naypyitaw'`, `'ရန်ကုန်'`, `'မန္တလေး'`, `'နေပြည်တော်'`) unconditionally return `false` unless a regional bus gate indicator is also present.

---

## 5. Verification Method

To independently reproduce the failure:
```powershell
npx.cmd tsx tests/challenge_m2_townships.ts
```
Expected output: Exits with code 1 and reports 3 failed assertions in `Policy-Metro` and `Collision-Pyay`.

To inspect the isolated bug in a one-liner:
```powershell
npx.cmd tsx -e "import { lookupTownshipDelivery, isRegionalPrepaidOnly } from './src/lib/myanmar-townships'; console.log('lookup:', lookupTownshipDelivery('နေပြည်တော်')); console.log('prepaidOnly:', isRegionalPrepaidOnly('နေပြည်တော်'));"
```
Observed output:
- `lookup`: Returns Pyay (`{ nameMm: 'ပြည်', nameEn: 'Pyay', region: 'State/Region', codAvailable: false }`)
- `prepaidOnly`: Returns `true`
