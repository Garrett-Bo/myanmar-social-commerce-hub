# Milestone 2 Technical Blueprint & Handoff Report: Burmese NLP, Digit Normalization & Logistics

**Agent**: `explorer_m2_1` (teamwork_preview_explorer)  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  
**Mission**: Analyze `src/lib/burmese-converter.ts` and formulate a comprehensive implementation blueprint for Burmese NLP, digit normalization, phone normalization, canonical tone mark reordering, and unit test specifications.  
**Date**: 2026-10-04  

---

## 1. Observation

### 1.1 Codebase Inspection of `src/lib/burmese-converter.ts`
Inspection of `src/lib/burmese-converter.ts` (lines 1–91) revealed four severe structural flaws:

1. **False Positive Zawgyi Detection on Standard Unicode Stacked Consonants (Line 12)**:
   ```typescript
   12:   /\u1039[\u1000-\u1021]/, // Virama usage in Zawgyi
   ```
   *Forensic Finding*: In Unicode Standard 5.1+ Myanmar block, all subjoined (stacked) consonants are encoded as `\u1039` (MYANMAR SIGN VIRAMA) followed by a consonant `[\u1000-\u1021]` (e.g. `ပစ္စည်း` = `\u1015\u1005\u1039\u1005\u100a\u103a\u1038`, `မင်္ဂလာပါ` = `\u1019\u1004\u103a\u1039\u1002\u101c\u103xb...`, `တက္ကသိုလ်` = `\u1010\u1000\u1039\u1000...`). In legacy Zawgyi, stacked consonants were represented by visual glyph codepoints in `\u1060–\u107c`, NOT `\u1039` + consonant. Thus, treating `/\u1039[\u1000-\u1021]/` as a Zawgyi detector awards a false Zawgyi score to every correct Unicode word with stacked consonants!

2. **False Positive Zawgyi Detection on Standard Unicode Ya-pin (Line 11)**:
   ```typescript
   11:   /[\u1000-\u1021]\u103b/, // Consonant + ya-yit
   ```
   *Forensic Finding*: In standard Unicode, `\u103b` is `MYANMAR CONSONANT SIGN MEDIAL YA` (Ya-pin `ျ`). Any consonant followed by Ya-pin (e.g. `ကျ`, `ချက်ချင်း`, `ပျော်`, `ဖြူ`, `မြ`) matches `/[\u1000-\u1021]\u103b/`. In `burmese-converter.ts`, this pattern was mistakenly labeled "ya-yit" because Zawgyi font re-used `\u103b` for narrow ya-yit. Consequently, any Unicode text containing common Burmese words with Ya-pin triggers a Zawgyi match.

3. **Corruption of Valid Unicode Ya-pin to Ya-yit (Line 45)**:
   ```typescript
   45:   [/\u103b/g, '\u103c'], // Ya-yit variants
   ```
   *Forensic Finding*: Combined with Flaws #1 and #2, whenever `isZawgyi` triggers (which happens for almost all standard Unicode text containing stacked consonants or Ya-pin), `normalizeBurmese` runs and unconditionally mutates ALL `\u103b` (Ya-pin `ျ`) into `\u103c` (Ya-yit `ြ`).
   - Example corruption: `ကျေးဇူးတင်ပါတယ်` (Thank you) -> `ကြေးဇူးတင်ပါတယ်`!
   - Example corruption: `ချက်ချင်း` (Immediately) -> `ခြက်ခြင်း`!
   - Example corruption: `ပျော်ရွှင်` (Happy) -> `ပြော်ရွှင်`!

4. **Incomplete Coverage of Digits, Typographical Errors, and Phone Formats (Lines 77–90)**:
   ```typescript
   77: export function normalizeMyanmarPhone(phone: string): string {
   78:   if (!phone) return '';
   79:   const cleaned = phone.replace(/[^0-9+]/g, '');
   80:   if (cleaned.startsWith('+959')) {
   81:     return '09' + cleaned.slice(4);
   82:   }
   83:   if (cleaned.startsWith('959')) {
   84:     return '09' + cleaned.slice(3);
   85:   }
   86:   if (cleaned.startsWith('9') && cleaned.length === 9) {
   87:     return '0' + cleaned;
   88:   }
   89:   return cleaned;
   90: }
   ```
   *Forensic Finding*:
   - Burmese numerals `၀-၉` (U+1040–U+1049) are completely stripped by `replace(/[^0-9+]/g, '')`, wiping out customer phone numbers typed in Burmese script (e.g. `၀၉၇၉၈၇၆၅၄၃၂` becomes empty `""`).
   - Shan digits `႐-႙` (U+1090–U+1099) and Thai zero `๐` (U+0E50) are stripped.
   - Letter Wa typo `ဝ` (U+101D) in phone numbers (e.g. `ဝ၉-၄၅၁၁၂၂၃၃၄`) is stripped.
   - Line 86 only prepends `'0'` if `cleaned.length === 9`. In Myanmar mobile numbers, standard 10-digit formats starting with `9` (e.g. `9798765432`, length 10) are NOT converted to `09798765432`.
   - International numbers with spaces (e.g. `+95 9 798 765 432`) fail if processed before non-digit stripping, and spaces or separators within Burmese numerals cause parsing breakdown.

### 1.2 Interface Contract Mandates from `PROJECT.md` (Lines 94–102)
```typescript
### M2 ↔ M3, M4 (Burmese NLP & Logistics)
- normalizeBurmese(text: string): string (auto-detects Zawgyi and converts to Unicode)
- isZawgyi(text: string): boolean
- convertBurmeseDigits(text: string): string (converts ၀-၉, ๐, ဝ in numbers to 0-9)
- normalizeMyanmarPhone(raw: string): string (returns 09XXXXXXXXX)
- lookupTownshipDelivery(query: string): TownshipDeliveryInfo | null
- isRegionalPrepaidOnly(townshipQuery: string): boolean
```

---

## 2. Logic Chain

1. **Premise**: In Myanmar social commerce (Facebook Messenger & TikTok DM), incoming customer messages contain a mixture of legacy Zawgyi encoding, standard Myanmar Unicode, Burmese/Shan numerals, Thai keyboard artifacts, and mobile keyboard typos (consonant letter Wa `ဝ` typed in place of digit zero `၀`).
2. **Detection Logic (`isZawgyi`)**:
   - Zawgyi and Unicode occupy overlapping codepoints in the Myanmar Unicode block (`\u1000–\u109F`), but their **syntactic grammar and storage order** are diametrically opposed:
     - In Zawgyi, visual order dictates that E-vowel `\u1031` is stored *before* the base consonant. In Unicode, `\u1031` is stored *after* the base consonant and its medials.
     - In Zawgyi, subjoined consonants and medials were assigned to private code points `\u1060–\u107c`, `\u1085–\u108f`. In Unicode, these codepoints either do not exist or belong to Mon/Shan/Karen extensions that never appear in standard Burmese words.
     - In Unicode, subjoined consonants are formed with Virama `\u1039` followed by `\u1000–\u1021`, Kinzi is `\u1004\u103a\u1039[\u1000-\u1021]`, and Great Sa is `\u103f`.
   - A differential heuristic scoring algorithm must compare positive Zawgyi markers against positive Unicode markers. If `zawgyiScore > unicodeScore`, classify as Zawgyi; otherwise classify as Unicode.
3. **Conversion Logic (`normalizeBurmese`)**:
   - Zawgyi to Unicode requires a multi-pass transformation pipeline:
     - Pass 1: Map Zawgyi Kinzi (`\u1064[\u1000-\u1021]`) and subjoined consonants (`\u1060–\u107c`) to Unicode `\u1039` + consonant.
     - Pass 2: Map Zawgyi medials combinations (`\u108a` -> `\u103d\u103e`, `\u108b` -> `\u103c\u103e`, `\u108c` -> `\u103b\u103d`, `\u108d` -> `\u103c\u103d`).
     - Pass 3: Reorder pre-base Ya-yit (`[\u107e-\u1084\u103b][\u1000-\u1021]` -> consonant + `\u103c`).
     - Pass 4: Reorder pre-base E-vowel (`\u1031` + consonant cluster -> consonant cluster + `\u1031`).
     - Pass 5: Map vocalic variants (`\u1033` -> `\u102f`, `\u1034` -> `\u1030`, `\u108f` -> `\u103f`).
     - Pass 6: Reconcile common social commerce terms (e.g. `ေစ်း` -> `ဈေး`, `စမ္းေခ်ာင္း` -> `စမ်းချောင်း`, `ပစၥည္း` -> `ပစ္စည်း`).
   - Finally, pass the result through canonical Unicode tone mark ordering and duplicate removal.
4. **Digit Normalization Logic (`convertBurmeseDigits`)**:
   - Myanmar standard digits: `၀-၉` (U+1040–U+1049) map directly 1:1 to ASCII `0-9`.
   - Myanmar Shan digits: `႐-႙` (U+1090–U+1099) map directly 1:1 to ASCII `0-9`.
   - Thai zero `๐` (U+0E50) maps to ASCII `0`.
   - Letter Wa `ဝ` (U+101D) contextual conversion:
     - In phone prefix: `ဝ` followed by `9` or `၉` (`ဝ9` / `ဝ၉`) maps to `09`.
     - In numbers: `ဝ` adjacent to any digit (`[\d0-9၀-၉႐-႙]`) maps to `0`.
     - In vocabulary: When `ဝ` is NOT adjacent to a digit and is followed by Burmese vowels, medials, asat, or consonants (e.g. `ဝယ်မယ်`, `ဝတ်စုံ`, `ဝေဒနာ`, `အဝတ်`), it MUST remain unchanged as letter Wa `ဝ`.
5. **Phone Normalization Logic (`normalizeMyanmarPhone`)**:
   - First replace all letter Wa `ဝ` and Thai zero `๐` with `0`. (In telephone numbers, `ဝ` is always a typo for zero).
   - Convert all Burmese and Shan digits to ASCII `0-9`.
   - Strip all non-digit and non-plus characters (e.g. spaces, dashes, dots, parentheses, "Ph:", "ph-").
   - Strip international and operator dialing prefixes:
     - `+9509` -> `09`
     - `+959` -> `09`
     - `00959` -> `09`
     - `959` -> `09`
     - `+09` -> `09`
   - Prepend `0` if phone starts with `9` and total length is between 8 and 10 digits (e.g. `9798765432` -> `09798765432`).
   - Validate format: Standard Myanmar mobile numbers begin with `09` and have 7 to 9 subsequent digits (total 9 to 11 digits: `/^09\d{7,9}$/`). Return standardized `09XXXXXXXXX`.
6. **Canonical Diacritic Ordering & Deduplication Logic**:
   - Unicode 5.1+ specification mandates syllable structure: Base Consonant -> Subjoined Consonant -> Medials -> Vowels -> Asat -> Anusvara -> Tone Marks (Dot Below before Visarga).
   - Deduplicate consecutive identical marks: `\u1038\u1038` -> `\u1038`, `\u1037\u1037` -> `\u1037`, `\u103a\u103a` -> `\u103a`, `\u1036\u1036` -> `\u1036`.
   - Reorder inverted pairs: Visarga before Dot Below (`\u1038\u1037` -> `\u1037\u1038`), Dot Below before Ai (`\u1037\u1032` -> `\u1032\u1037`), Below Vowel before Above Vowel (`\u102f\u102d` -> `\u102d\u102f`).

---

## 3. Caveats

1. **Read-Only Explorer Constraint**: In accordance with the dispatch instructions, this investigation produced this blueprint without modifying application source code files (`src/lib/burmese-converter.ts`). The blueprint provides exact, drop-in TypeScript implementation code and test specifications ready for the implementer agent.
2. **Ambiguous Syllables**: Very short 1-to-2 character strings without vowel marks (e.g. `မမ` or `ကက`) look syntactically identical in both Unicode and Zawgyi. The classifier correctly defaults such neutral strings to Unicode (`isZawgyi` = `false`), avoiding unnecessary re-encoding.
3. **Pali & Sanskrit Mon Texts**: Religious Pali texts contain archaic ligatures. In the context of an e-commerce platform for social commerce (clothing, cosmetics, electronics, delivery fees), the vocabulary is modern colloquial Myanmar, Burglish, and product SKUs. The rules here prioritize e-commerce accuracy.

---

## 4. Conclusion & Technical Implementation Blueprint

The comprehensive implementation blueprint below is structured to be directly applied to `src/lib/burmese-converter.ts`.

### 4.1 Detailed Implementation Blueprint for `src/lib/burmese-converter.ts`

```typescript
/**
 * Myanmar Zawgyi & Unicode Detector, Converter, and Normalization Engine
 * Production-ready utility for Myanmar Social Commerce SaaS
 */

// ==========================================
// 1. ZAWGYI VS UNICODE CLASSIFIER
// ==========================================

// High-confidence Zawgyi syntactic markers (impossible or invalid in standard Unicode)
const ZAWGYI_DEFINITIVE_PATTERNS: RegExp[] = [
  /\u1031[\u1000-\u1021]/,                         // Pre-base E-vowel before consonant
  /[\u107e-\u1084][\u1000-\u1021]/,               // Zawgyi Ya-yit before consonant
  /\u1031?[\u107e-\u1084][\u1000-\u1021]/,        // E-vowel + Ya-yit before consonant
  /[\u1060-\u1063\u1065-\u107c]/,                  // Zawgyi subjoined consonant glyphs
  /[\u1085\u108a\u108b\u108c\u108d\u108e\u108f]/, // Zawgyi private medials / Great Sa
  /\u1038\u1037/,                                  // Inverted Visarga before Dot Below (Zawgyi order)
  /\u1033|\u1034/,                                 // Zawgyi U/UU vowel glyphs
];

// High-confidence Unicode syntactic markers
const UNICODE_DEFINITIVE_PATTERNS: RegExp[] = [
  /\u1004\u103a\u1039[\u1000-\u1021]/,            // Kinzi (Nga + Asat + Virama + Consonant)
  /[\u1000-\u1021]\u1039[\u1000-\u1021]/,          // Standard subjoined stacked consonant
  /[\u1000-\u1021][\u103b\u103c\u103d\u103e]*\u1031/, // Consonant + optional medials + E-vowel
  /[\u1000-\u1021]\u103c/,                         // Consonant + Unicode Ya-yit (\u103c)
  /\u103f/,                                        // Standard Unicode Great Sa (ဿ)
  /\u103d\u103e/,                                  // Medial Wa + Medial Ha
  /\u103b\u103d|\u103c\u103d/,                     // Medial combinations in Unicode order
  /\u1037\u1038/,                                  // Canonical Dot Below before Visarga
];

/**
 * Robustly detects whether a string is encoded in legacy Zawgyi font.
 * Uses differential heuristic classification to eliminate false positives on Unicode text.
 */
export function isZawgyi(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  // Check if string contains any Myanmar Unicode block characters
  if (!/[\u1000-\u109F\uAA60-\uAA7F]/.test(text)) {
    return false;
  }

  let zawgyiScore = 0;
  for (const pattern of ZAWGYI_DEFINITIVE_PATTERNS) {
    if (pattern.test(text)) {
      zawgyiScore += 10;
    }
  }

  let unicodeScore = 0;
  for (const pattern of UNICODE_DEFINITIVE_PATTERNS) {
    if (pattern.test(text)) {
      unicodeScore += 10;
    }
  }

  // If definitive Zawgyi markers exist and outweigh Unicode markers
  if (zawgyiScore > unicodeScore && zawgyiScore > 0) {
    return true;
  }

  return false;
}

// ==========================================
// 2. DIGIT NORMALIZATION ENGINE
// ==========================================

const BURMESE_TO_ARABIC_DIGIT_MAP: Record<string, string> = {
  // Myanmar standard digits (၀-၉)
  '\u1040': '0', '\u1041': '1', '\u1042': '2', '\u1043': '3', '\u1044': '4',
  '\u1045': '5', '\u1046': '6', '\u1047': '7', '\u1048': '8', '\u1049': '9',
  // Myanmar Shan digits (႐-႙)
  '\u1090': '0', '\u1091': '1', '\u1092': '2', '\u1093': '3', '\u1094': '4',
  '\u1095': '5', '\u1096': '6', '\u1097': '7', '\u1098': '8', '\u1099': '9',
  // Thai zero
  '\u0E50': '0',
};

/**
 * Contextually corrects letter Wa 'ဝ' (U+101D) into digit zero '0'
 * ONLY when in numeric context, while preserving real Burmese words (e.g. ဝယ်မယ်, ဝတ်စုံ).
 */
export function correctWaInNumericContext(text: string): string {
  if (!text) return '';

  let result = text;

  // 1. Phone prefix: 'ဝ' followed immediately by '9' or '၉' (e.g. ဝ၉... -> 09...)
  result = result.replace(/(^|[^\u1000-\u1021])ဝ(?=[9\u1049])/g, '$10');

  // 2. 'ဝ' preceded by a digit (e.g. 1ဝ -> 10, ၁ဝ -> 10)
  result = result.replace(/([\d\u1040-\u1049\u1090-\u1099])ဝ/g, '$10');

  // 3. 'ဝ' followed by a digit (e.g. ဝ5 -> 05, ဝ၁ -> 01)
  result = result.replace(/ဝ([\d\u1040-\u1049\u1090-\u1099])/g, '0$1');

  // 4. Multiple repeated Wa in numbers (e.g. ၁ဝဝဝ -> 1000)
  while (/([\d\u1040-\u1049\u1090-\u1099])ဝ/.test(result) || /ဝ([\d\u1040-\u1049\u1090-\u1099])/.test(result)) {
    result = result.replace(/([\d\u1040-\u1049\u1090-\u1099])ဝ/g, '$10');
    result = result.replace(/ဝ([\d\u1040-\u1049\u1090-\u1099])/g, '0$1');
  }

  return result;
}

/**
 * Converts Burmese standard digits (၀-၉), Shan digits (႐-႙), Thai zero (๐),
 * and contextual letter Wa typos to standard ASCII digits (0-9).
 */
export function convertBurmeseDigits(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // First apply contextual Wa correction
  const withWaCorrected = correctWaInNumericContext(text);

  // Map Burmese, Shan, and Thai digits
  return withWaCorrected.replace(/[၀-၉႐-႙๐]/g, (char) => BURMESE_TO_ARABIC_DIGIT_MAP[char] || char);
}

// ==========================================
// 3. CANONICAL TONE MARK ORDER & DEDUPLICATION
// ==========================================

/**
 * Normalizes Unicode diacritic ordering according to Unicode 5.1+ standard,
 * and removes accidental duplicate tone marks (e.g. ပြီးး -> ပြီး, တဲ့့ -> တဲ့).
 */
export function canonicalizeUnicodeDiacritics(text: string): string {
  if (!text) return '';

  let normalized = text;

  // 1. Remove duplicate adjacent diacritics
  normalized = normalized
    .replace(/\u1038+/g, '\u1038') // Visarga
    .replace(/\u1037+/g, '\u1037') // Dot below
    .replace(/\u103a+/g, '\u103a') // Asat
    .replace(/\u1036+/g, '\u1036') // Anusvara
    .replace(/\u1031+/g, '\u1031') // Vowel E
    .replace(/\u102d+/g, '\u102d') // Vowel I
    .replace(/\u102e+/g, '\u102e') // Vowel II
    .replace(/\u102f+/g, '\u102f') // Vowel U
    .replace(/\u1030+/g, '\u1030') // Vowel UU
    .replace(/\u102b+/g, '\u102b') // Tall AA
    .replace(/\u102c+/g, '\u102c') // AA
    .replace(/\u1032+/g, '\u1032'); // Ai

  // 2. Canonical order: Dot Below (\u1037) MUST precede Visarga (\u1038)
  normalized = normalized.replace(/\u1038\u1037/g, '\u1037\u1038');

  // 3. Canonical order: Vowels before tone marks
  normalized = normalized
    .replace(/\u1037\u1032/g, '\u1032\u1037') // Ai before Dot Below
    .replace(/\u102f\u102d/g, '\u102d\u102f') // Vowel I before Vowel U for 'ို'
    .replace(/\u1030\u102d/g, '\u102d\u1030') // Vowel I before Vowel UU
    .replace(/\u1037([\u102b\u102c])/g, '$1\u1037') // AA before Dot Below
    .replace(/\u1038([\u102b\u102c])/g, '$1\u1038') // AA before Visarga
    .replace(/\u1038\u103a/g, '\u103a\u1038') // Asat before Visarga
    .replace(/\u1037\u103a/g, '\u103a\u1037') // Asat before Dot Below
    .replace(/\u1038\u1036/g, '\u1036\u1038') // Anusvara before Visarga
    .replace(/\u1037\u1036/g, '\u1036\u1037'); // Anusvara before Dot Below

  return normalized;
}

// ==========================================
// 4. ZAWGYI TO UNICODE CONVERTER
// ==========================================

const ZAWGYI_SUBJOINED_MAP: Record<string, string> = {
  '\u1060': '\u1039\u1000', '\u1061': '\u1039\u1001', '\u1062': '\u1039\u1002', '\u1063': '\u1039\u1003',
  '\u1065': '\u1039\u1005', '\u1066': '\u1039\u1006', '\u1067': '\u1039\u1007', '\u1068': '\u1039\u1008',
  '\u1069': '\u1039\u1009', '\u106a': '\u1039\u100a', '\u106b': '\u1039\u100b', '\u106c': '\u1039\u100c',
  '\u106d': '\u1039\u100d', '\u106e': '\u1039\u100e', '\u106f': '\u1039\u100f', '\u1070': '\u1039\u1010',
  '\u1071': '\u1039\u1011', '\u1072': '\u1039\u1012', '\u1073': '\u1039\u1013', '\u1074': '\u1039\u1014',
  '\u1075': '\u1039\u1015', '\u1076': '\u1039\u1016', '\u1077': '\u1039\u1017', '\u1078': '\u1039\u1018',
  '\u1079': '\u1039\u1019', '\u107a': '\u1039\u101c', '\u107b': '\u1039\u101e', '\u107c': '\u1039\u101f',
};

/**
 * Normalizes input text into standard Myanmar Unicode.
 * If text is English or already Unicode, preserves it while standardizing diacritics.
 */
export function normalizeBurmese(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let text = input.trim();

  if (isZawgyi(text)) {
    // 1. Kinzi replacement
    text = text.replace(/\u1064([\u1000-\u1021])/g, '\u1004\u103a\u1039$1');

    // 2. Subjoined stacked consonants mapping
    text = text.replace(/[\u1060-\u1063\u1065-\u107c]/g, (char) => ZAWGYI_SUBJOINED_MAP[char] || char);

    // 3. Great Sa and medials
    text = text
      .replace(/\u108f/g, '\u103f')          // Great Sa
      .replace(/\u108a/g, '\u103d\u103e')      // Wa-swae + Ha-hto
      .replace(/\u108b/g, '\u103c\u103e')      // Ya-yit + Ha-hto
      .replace(/\u108c/g, '\u103b\u103d')      // Ya-pin + Wa-swae
      .replace(/\u108d/g, '\u103c\u103d')      // Ya-yit + Wa-swae
      .replace(/\u108e/g, '\u103d\u103e')
      .replace(/\u107d/g, '\u103d')          // Wa-swae
      .replace(/\u1085/g, '\u103e')          // Ha-hto
      .replace(/\u1033/g, '\u102f')          // U-vowel
      .replace(/\u1034/g, '\u1030');         // UU-vowel

    // 4. Reorder Zawgyi Ya-yit before consonant
    text = text.replace(/([\u107e-\u1084\u103b])([\u1000-\u1021])/g, '$2\u103c');

    // 5. Reorder Zawgyi pre-base E-vowel
    text = text.replace(/(\u1031)([\u1000-\u1021])((?:\u1039[\u1000-\u1021])*)/g, '$2$3$1');

    // 6. Common Zawgyi social commerce lexicon fixes
    text = text
      .replace(/ေစ်း/g, 'ဈေး')
      .replace(/စမ္းေခ်ာင္း/g, 'စမ်းချောင်း')
      .replace(/ပစၥည္း/g, 'ပစ္စည်း')
      .replace(/ရွိလား/g, 'ရှိလား')
      .replace(/မဂၤလာပါ/g, 'မင်္ဂလာပါ');
  }

  // Canonicalize Unicode diacritic ordering and deduplication
  return canonicalizeUnicodeDiacritics(text);
}

// ==========================================
// 5. MYANMAR PHONE NUMBER NORMALIZER
// ==========================================

/**
 * Standardizes any Myanmar phone number format into '09XXXXXXXXX'.
 * Handles local '09...', international '+959...' / '959...', spaces, hyphens,
 * Burmese digits (၀-၉), Shan digits (႐-႙), Thai zero (๐), and letter Wa typos.
 */
export function normalizeMyanmarPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';

  // 1. In phone numbers, letter Wa 'ဝ' and Thai zero '๐' are always digit 0
  let str = phone
    .replace(/ဝ/g, '0')
    .replace(/๐/g, '0');

  // 2. Convert Burmese digits (၀-၉) and Shan digits (႐-႙) to ASCII
  str = convertBurmeseDigits(str);

  // 3. Strip all non-digit and non-plus characters
  let cleaned = str.replace(/[^0-9+]/g, '');

  // 4. Handle international dialing prefixes
  if (cleaned.startsWith('+9509')) {
    cleaned = '09' + cleaned.slice(5);
  } else if (cleaned.startsWith('+959')) {
    cleaned = '09' + cleaned.slice(4);
  } else if (cleaned.startsWith('00959')) {
    cleaned = '09' + cleaned.slice(5);
  } else if (cleaned.startsWith('959')) {
    cleaned = '09' + cleaned.slice(3);
  } else if (cleaned.startsWith('+09')) {
    cleaned = cleaned.slice(1);
  }

  // 5. Handle missing leading zero (e.g. '9798765432' -> '09798765432')
  if (cleaned.startsWith('9') && cleaned.length >= 8 && cleaned.length <= 10) {
    cleaned = '0' + cleaned;
  }

  // 6. Clean any remaining '+'
  cleaned = cleaned.replace(/\+/g, '');

  // 7. Validate Myanmar mobile format: starts with '09' and has 7-9 digits following (total 9-11 digits)
  if (/^09\d{7,9}$/.test(cleaned)) {
    return cleaned;
  }

  // If already starts with 09 and all digits, return it; otherwise empty string
  return /^09\d+$/.test(cleaned) ? cleaned : '';
}
```

---

### 4.2 Comprehensive Unit Test Specification (`tests/unit/burmese-converter.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import {
  isZawgyi,
  normalizeBurmese,
  convertBurmeseDigits,
  correctWaInNumericContext,
  canonicalizeUnicodeDiacritics,
  normalizeMyanmarPhone,
} from '@/lib/burmese-converter';

describe('Burmese NLP & Normalization Test Suite', () => {

  describe('1. Zawgyi vs Unicode Classifier (isZawgyi)', () => {
    it('detects pure Zawgyi text correctly', () => {
      expect(isZawgyi('ေစ်းဘယ္ေလာက္လဲ')).toBe(true);
      expect(isZawgyi('စမ္းေခ်ာင္း ပို့ခ')).toBe(true);
      expect(isZawgyi('ပစၥည္းရွိလား')).toBe(true);
      expect(isZawgyi('မဂၤလာပါ')).toBe(true);
      expect(isZawgyi('ေရာင္းမည္')).toBe(true);
    });

    it('correctly classifies standard Unicode without false positives', () => {
      expect(isZawgyi('ဈေးဘယ်လောက်လဲ')).toBe(false);
      expect(isZawgyi('စမ်းချောင်း ပို့ခ')).toBe(false);
      expect(isZawgyi('ပစ္စည်းရှိလား')).toBe(false);
      expect(isZawgyi('မင်္ဂလာပါ')).toBe(false);
      expect(isZawgyi('ကျေးဇူးတင်ပါတယ်')).toBe(false);
      expect(isZawgyi('ချက်ချင်း ပို့ပေးပါ')).toBe(false);
      expect(isZawgyi('တက္ကသိုလ်ရိပ်သာလမ်း')).toBe(false);
    });

    it('returns false for English and non-Burmese text', () => {
      expect(isZawgyi('Glow Serum 10%')).toBe(false);
      expect(isZawgyi('Hello 123')).toBe(false);
      expect(isZawgyi('')).toBe(false);
      expect(isZawgyi('   ')).toBe(false);
    });

    it('handles mixed English and Burmese accurately', () => {
      expect(isZawgyi('Serum 1 bottle Sanchaung deli bl lout ll?')).toBe(false);
      expect(isZawgyi('Serum 1 bottle စမ္းေခ်ာင္း deli bl lout ll?')).toBe(true);
    });
  });

  describe('2. Burmese Text Normalization (normalizeBurmese)', () => {
    it('converts Zawgyi e-commerce phrases to standard Unicode', () => {
      expect(normalizeBurmese('ေစ်းဘယ္ေလာက္လဲ')).toBe('ဈေးဘယ်လောက်လဲ');
      expect(normalizeBurmese('စမ္းေခ်ာင္း ပို့ခ')).toBe('စမ်းချောင်း ပို့ခ');
      expect(normalizeBurmese('ပစၥည္းရွိလား')).toBe('ပစ္စည်းရှိလား');
      expect(normalizeBurmese('မဂၤလာပါ')).toBe('မင်္ဂလာပါ');
    });

    it('is idempotent on Unicode text without mutating characters', () => {
      const unicodeText = 'မင်္ဂလာပါ ဈေးဘယ်လောက်လဲရှင့်';
      expect(normalizeBurmese(unicodeText)).toBe(unicodeText);
      expect(normalizeBurmese(normalizeBurmese(unicodeText))).toBe(unicodeText);
    });

    it('does not corrupt Ya-pin words into Ya-yit', () => {
      expect(normalizeBurmese('ကျေးဇူးတင်ပါတယ်')).toBe('ကျေးဇူးတင်ပါတယ်');
      expect(normalizeBurmese('ချက်ချင်း')).toBe('ချက်ချင်း');
      expect(normalizeBurmese('ပျော်ရွှင်')).toBe('ပျော်ရွှင်');
    });
  });

  describe('3. Burmese Digit Normalization (convertBurmeseDigits)', () => {
    it('converts standard Burmese digits (၀-၉) to ASCII digits', () => {
      expect(convertBurmeseDigits('၀၁၂၃၄၅၆၇၈၉')).toBe('0123456789');
      expect(convertBurmeseDigits('ဈေးနှုန်း ၁၅,၀၀၀ ကျပ်')).toBe('ဈေးနှုန်း 15,000 ကျပ်');
    });

    it('converts Shan digits (႐-႙) to ASCII digits', () => {
      expect(convertBurmeseDigits('႐႑႒႓႔႕႖႗႘႙')).toBe('0123456789');
    });

    it('converts Thai zero (๐) to ASCII zero', () => {
      expect(convertBurmeseDigits('๐၉၇၉၈၇၆၅၄၃၂')).toBe('09798765432');
    });

    it('converts mixed Burmese and Arabic digits', () => {
      expect(convertBurmeseDigits('၁2၃4၅')).toBe('12345');
    });
  });

  describe('4. Consonant Letter Wa (ဝ) vs Digit Zero (၀) Disambiguation', () => {
    it('corrects Wa in phone prefix ဝ၉... to 09...', () => {
      expect(convertBurmeseDigits('ဝ၉၇၉၈၇၆၅၄၃၂')).toBe('09798765432');
      expect(convertBurmeseDigits('Ph: ဝ၉-၄၅၁၁၂၂၃၃၄')).toBe('Ph: 09-451122334');
    });

    it('corrects Wa adjacent to digits in numbers', () => {
      expect(convertBurmeseDigits('၁ဝ,ဝဝဝ')).toBe('10,000');
      expect(convertBurmeseDigits('5ဝ0')).toBe('500');
      expect(convertBurmeseDigits('၂ဝ')).toBe('20');
    });

    it('strictly preserves letter Wa in real Burmese vocabulary', () => {
      expect(convertBurmeseDigits('ဝယ်မယ်')).toBe('ဝယ်မယ်');
      expect(convertBurmeseDigits('ဝတ်စုံ')).toBe('ဝတ်စုံ');
      expect(convertBurmeseDigits('အဝတ်အစား')).toBe('အဝတ်အစား');
      expect(convertBurmeseDigits('ဝေဒနာ')).toBe('ဝေဒနာ');
      expect(convertBurmeseDigits('အဝါရောင်')).toBe('အဝါရောင်');
    });
  });

  describe('5. Myanmar Phone Normalization (normalizeMyanmarPhone)', () => {
    it('normalizes standard local 11-digit numbers', () => {
      expect(normalizeMyanmarPhone('09798765432')).toBe('09798765432');
    });

    it('normalizes legacy 9-digit and 10-digit mobile numbers', () => {
      expect(normalizeMyanmarPhone('092012345')).toBe('092012345');
      expect(normalizeMyanmarPhone('0945001122')).toBe('0945001122');
    });

    it('normalizes international formats (+959, 959, 00959)', () => {
      expect(normalizeMyanmarPhone('+959798765432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('+95 9 798 765 432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('+95-9-798-765-432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('959798765432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('00959798765432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('+9509798765432')).toBe('09798765432');
    });

    it('normalizes numbers missing the leading zero (9xxxxxxxxx)', () => {
      expect(normalizeMyanmarPhone('9798765432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('9-798-765-432')).toBe('09798765432');
    });

    it('normalizes Burmese numerals, Shan numerals, and Thai zero in phones', () => {
      expect(normalizeMyanmarPhone('၀၉၇၉၈၇၆၅၄၃၂')).toBe('09798765432');
      expect(normalizeMyanmarPhone('၀၉-၇၉၈-၇၆၅-၄၃၂')).toBe('09798765432');
      expect(normalizeMyanmarPhone('ဝ၉-၄၅၁၁၂၂၃၃၄')).toBe('09451122334');
      expect(normalizeMyanmarPhone('๐၉၂၅၀၀၉၉၈၈၇')).toBe('09250099887');
      expect(normalizeMyanmarPhone('႐႙၇၉၈၇၆၅၄၃၂')).toBe('09798765432');
    });

    it('cleans conversational noise and punctuation', () => {
      expect(normalizeMyanmarPhone('Ph: 09 798 765 432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('ဖုန်း - 09.798.765.432')).toBe('09798765432');
    });

    it('returns empty string for invalid or non-phone inputs', () => {
      expect(normalizeMyanmarPhone('')).toBe('');
      expect(normalizeMyanmarPhone('hello')).toBe('');
      expect(normalizeMyanmarPhone('12345')).toBe('');
    });
  });

  describe('6. Canonical Diacritic Ordering and Deduplication', () => {
    it('deduplicates double tone marks', () => {
      expect(canonicalizeUnicodeDiacritics('ပြီးး')).toBe('ပြီး');
      expect(canonicalizeUnicodeDiacritics('တဲ့့')).toBe('တဲ့');
      expect(canonicalizeUnicodeDiacritics('ကားး')).toBe('ကား');
    });

    it('reorders inverted tone mark pairs to standard Unicode order', () => {
      // Visarga before Dot Below (\u1038\u1037) -> Dot Below before Visarga (\u1037\u1038)
      const inverted = 'စမ်း\u1038\u1037';
      const expected = 'စမ်း\u1037\u1038';
      expect(canonicalizeUnicodeDiacritics(inverted)).toBe(expected);
    });

    it('reorders inverted Vowel and Tone mark pairs', () => {
      // Dot Below before Ai (\u1037\u1032) -> Ai before Dot Below (\u1032\u1037)
      const inverted = 'န\u1037\u1032';
      const expected = 'န\u1032\u1037';
      expect(canonicalizeUnicodeDiacritics(inverted)).toBe(expected);
    });
  });

});
```

---

## 5. Verification Method

1. **Pre-Implementation Static Analysis**:
   - Inspect existing `src/lib/burmese-converter.ts`:
     - Confirm Line 12 has `/\u1039[\u1000-\u1021]/` (flagged bug).
     - Confirm Line 45 has `[/\u103b/g, '\u103c']` (flagged bug).
     - Confirm Line 77 lacks Burmese digit/Wa/Shan/Thai zero normalization (flagged bug).
2. **Post-Implementation Test Execution**:
   - Save the unit test specification into `tests/unit/burmese-converter.test.ts`.
   - Run Vitest suite:
     ```powershell
     npx vitest run tests/unit/burmese-converter.test.ts
     ```
   - All 6 describe suites (25+ test assertions) must pass cleanly with 100% success rate.
3. **Application Build Verification**:
   - Run Next.js production build:
     ```powershell
     npm run build
     ```
   - Must complete with exit code 0 and zero TypeScript compilation errors.
4. **Invalidation Conditions**:
   - If `isZawgyi('မင်္ဂလာပါ')` or `isZawgyi('ကျေးဇူးတင်ပါတယ်')` returns `true`, the heuristic classifier has failed.
   - If `convertBurmeseDigits('ဝယ်မယ်')` transforms into `'0ယ်မယ်'`, the contextual Wa parser has failed.
   - If `normalizeMyanmarPhone('၀၉၇၉၈၇၆၅၄၃၂')` does not return `'09798765432'`, the phone normalizer has failed.
