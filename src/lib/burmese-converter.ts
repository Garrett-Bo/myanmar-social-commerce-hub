/**
 * Myanmar Zawgyi & Unicode Detector, Converter, and Normalization Engine
 * Production-ready utility for Myanmar Social Commerce SaaS
 */

// ==========================================
// 1. ZAWGYI VS UNICODE CLASSIFIER
// ==========================================

// High-confidence Zawgyi syntactic markers (impossible or invalid in standard Unicode)
const ZAWGYI_DEFINITIVE_PATTERNS: RegExp[] = [
  /\u1031[\u1000-\u1021]/g,                         // Pre-base E-vowel before consonant
  /\u1039[^\u1000-\u1021]/g,                        // Zawgyi Asat (\u1039) followed by non-consonant
  /\u1039$/g,                                       // Zawgyi Asat (\u1039) at end of string
  /[\u107e-\u1084][\u1000-\u1021]/g,               // Zawgyi Ya-yit before consonant
  /\u1031?[\u107e-\u1084][\u1000-\u1021]/g,        // E-vowel + Ya-yit before consonant
  /[\u1060-\u107c]/g,                               // Zawgyi subjoined consonant glyphs & Kinzi (\u1064)
  /[\u1085\u1086\u108a\u108b\u108c\u108d\u108e\u108f]/g, // Zawgyi private medials / Great Sa (\u1086, \u108f)
  /\u1038\u1037/g,                                  // Inverted Visarga before Dot Below (Zawgyi order)
  /\u1033|\u1034/g,                                 // Zawgyi U/UU vowel glyphs
  /\u1031\u1005\u103a/g,                            // Zawgyi 'ေစ်' spelling for 'ဈ'
];

// Strictly valid Pali/Burmese subjoined consonant clusters (Vagga and homorganic rules)
const VALID_PALI_STACK_REGEX = /(?:\u1000\u1039[\u1000\u1001]|\u1002\u1039[\u1002\u1003]|[\u1005\u1007]\u1039[\u1005-\u1008]|[\u1009\u100a]\u1039[\u1005-\u100a]|\u100b\u1039[\u100b\u100c]|\u100d\u1039[\u100d\u100e]|\u100f\u1039[\u100b-\u100f]|\u1010\u1039[\u1010\u1011]|[\u1012\u1013]\u1039[\u1012\u1013]|\u1014\u1039[\u1010-\u1014]|\u1015\u1039[\u1015\u1016]|\u1017\u1039[\u1017\u1018]|\u1019\u1039[\u1015-\u1019]|\u101c\u1039\u101c|\u101e\u1039\u101e|\u101f\u1039[\u1014\u1019\u101c\u1020]|\u1020\u1039\u1020)/g;

// High-confidence Unicode syntactic markers
const UNICODE_DEFINITIVE_PATTERNS: RegExp[] = [
  /\u1004\u103a\u1039[\u1000-\u1021]/g,            // Kinzi (Nga + Asat + Virama + Consonant)
  VALID_PALI_STACK_REGEX,                           // Standard subjoined stacked consonant (strictly valid Pali/Burmese clusters)
  /[\u1000-\u1021][\u103b\u103c\u103d\u103e]*\u1031/g, // Consonant + optional medials + E-vowel
  /[\u1000-\u1021]\u103c/g,                         // Consonant + Unicode Ya-yit (\u103c)
  /\u103f/g,                                        // Standard Unicode Great Sa (ဿ)
  /\u103d\u103e|\u103b\u103d|\u103c\u103d/g,       // Medial combinations in Unicode order
  /\u1037\u1038/g,                                  // Canonical Dot Below before Visarga
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
    const matches = text.match(pattern);
    if (matches) {
      zawgyiScore += matches.length * 10;
    }
  }

  // Zawgyi Asat (\u1039) not forming valid Unicode Kinzi or valid Pali stacked consonant
  const allViramas = (text.match(/\u1039/g) || []).length;
  const kinziCount = (text.match(/\u1004\u103a\u1039[\u1000-\u1021]/g) || []).length;
  const paliCount = (text.match(VALID_PALI_STACK_REGEX) || []).length;
  const orphanViramas = Math.max(0, allViramas - kinziCount - paliCount);
  if (orphanViramas > 0) {
    zawgyiScore += orphanViramas * 10;
  }

  let unicodeScore = 0;
  for (const pattern of UNICODE_DEFINITIVE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      unicodeScore += matches.length * 10;
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
 * ONLY when in numeric context, while preserving real Burmese words (e.g. ဝယ်မယ်, ဝတ်စုံ, အဝေးပြေးဂိတ်).
 */
export function correctWaInNumericContext(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let result = text;

  // 1. Phone prefix: 'ဝ' followed by 9 or ၉ (e.g. ဝ၉... -> 09..., ဝ9... -> 09...)
  result = result.replace(/(^|[^\u1000-\u1021])ဝ(?=[9\u1049])/g, (_match, p1) => (p1 || '') + '0');

  // 2. Digits characters set
  const DIGIT_CHARS = '\\d\\u1040-\\u1049\\u1090-\\u1099\\u0E50';

  // 3. Repeated adjacent Wa with digits, including through commas and dots
  const adjacentPattern = new RegExp(`([${DIGIT_CHARS}][,\\.]*)ဝ|ဝ([,\\.]*[${DIGIT_CHARS}])`, 'g');
  while (adjacentPattern.test(result)) {
    result = result.replace(adjacentPattern, (_match, p1, p2) => {
      if (p1 !== undefined) return `${p1}0`;
      if (p2 !== undefined) return `0${p2}`;
      return '0';
    });
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

  // 1. Canonical order: Dot Below (\u1037) MUST precede Visarga (\u1038)
  normalized = normalized.replace(/\u1038\u1037/g, '\u1037\u1038');

  // Canonical order: Medials must precede Vowel E (\u1031)
  normalized = normalized.replace(/\u1031([\u103b\u103c\u103d\u103e]+)/g, '$1\u1031');

  // 2. Canonical order: Vowels before tone marks
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

  // 3. Remove duplicate adjacent diacritics
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
    // 1. Common Zawgyi social commerce lexicon fixes first
    text = text
      .replace(/ေစ်း/g, 'ဈေး')
      .replace(/စမ္းေခ်ာင္း/g, 'စမ်းချောင်း')
      .replace(/ခ်မ္းေအးသာစံ/g, 'ချမ်းအေးသာစံ')
      .replace(/ခ်မ္း/g, 'ချမ်း')
      .replace(/ခ်မ်း/g, 'ချမ်း')
      .replace(/ပစၥည္း/g, 'ပစ္စည်း')
      .replace(/ရွိလား/g, 'ရှိလား')
      .replace(/မဂၤလာပါ/g, 'မင်္ဂလာပါ');

    // 2. Kinzi replacement: consonant (with optional upper vowel) followed by \u1064
    text = text.replace(/([\u1000-\u1021])([\u102d\u102e\u1036]?)\u1064/g, '\u1004\u103a\u1039$1$2');

    // 3. Subjoined stacked consonants mapping
    text = text.replace(/[\u1060-\u1063\u1065-\u107c]/g, (char) => ZAWGYI_SUBJOINED_MAP[char] || char);

    // 4. Great Sa and medials
    text = text
      .replace(/[\u1086\u108f]/g, '\u103f')          // Great Sa (\u1086 and \u108f)
      .replace(/\u108a/g, '\u103d\u103e')      // Wa-swae + Ha-hto
      .replace(/\u108b/g, '\u103c\u103e')      // Ya-yit + Ha-hto
      .replace(/\u108c/g, '\u103b\u103d')      // Ya-pin + Wa-swae
      .replace(/\u108d/g, '\u103c\u103d')      // Ya-yit + Wa-swae
      .replace(/\u108e/g, '\u103d\u103e')
      .replace(/\u107d/g, '\u103d')          // Wa-swae
      .replace(/\u1085/g, '\u103e')          // Ha-hto
      .replace(/\u1033/g, '\u102f')          // U-vowel
      .replace(/\u1034/g, '\u1030');         // UU-vowel

    // 5. Reorder Zawgyi Ya-yit before consonant (\u107e-\u1084 are Zawgyi pre-consonant Ya-yit glyphs)
    text = text.replace(/([\u107e-\u1084])([\u1000-\u1021])/g, '$2\u103c');

    // 6. Reorder Zawgyi pre-base E-vowel (ordering medials before E-vowel)
    text = text.replace(/(\u1031)([\u1000-\u1021])((?:\u1039[\u1000-\u1021]|[\u103b\u103c\u103d\u103e])*)/g, '$2$3$1');

    // 7. Convert Zawgyi Asat \u1039 to Unicode Asat \u103a
    // Protect valid Unicode Kinzi (\u1004\u103a\u1039) and valid Pali stacked consonants
    text = text.replace(/(\u1004\u103a)\u1039/g, '$1\uE000');
    text = text.replace(VALID_PALI_STACK_REGEX, (m) => m.replace('\u1039', '\uE000'));
    text = text.replace(/\u1039/g, '\u103a');
    text = text.replace(/\uE000/g, '\u1039');
  }

  // Residual Zawgyi Kha+Asat combinations used as Ya-pin
  text = text.replace(/ခ်မ်း/g, 'ချမ်း');

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

  // 5. Remove any remaining '+'
  cleaned = cleaned.replace(/\+/g, '');

  // 6. Handle missing leading zero (e.g. '9798765432' -> '09798765432')
  if (cleaned.startsWith('9') && cleaned.length >= 8 && cleaned.length <= 10) {
    cleaned = '0' + cleaned;
  }

  // 7. Validate Myanmar mobile format: starts with '09' and has 7-9 digits following (total 9-11 digits)
  if (/^09\d{7,9}$/.test(cleaned)) {
    return cleaned;
  }

  // If already starts with 09 and valid digits, return it; otherwise empty string
  return '';
}

/**
 * Converts ASCII numbers to Myanmar Unicode numerals (၀-၉)
 */
export function toBurmeseNumerals(val: number | string): string {
  const mmDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
  return String(val).replace(/[0-9]/g, (d) => mmDigits[parseInt(d, 10)]);
}

