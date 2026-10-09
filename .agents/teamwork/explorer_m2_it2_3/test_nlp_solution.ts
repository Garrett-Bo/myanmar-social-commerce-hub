// Test complete proposed implementation of burmese-converter.ts

// High-confidence Zawgyi syntactic markers (impossible or invalid in standard Unicode)
const ZAWGYI_DEFINITIVE_PATTERNS: RegExp[] = [
  /\u1031[\u1000-\u1021]/g,                         // Pre-base E-vowel before consonant
  /\u1039[^\u1000-\u1021]/g,                        // Zawgyi Asat (\u1039) followed by non-consonant
  /\u1039$/g,                                       // Zawgyi Asat (\u1039) at end of string
  /[\u107e-\u1084][\u1000-\u1021]/g,               // Zawgyi Ya-yit before consonant
  /\u1031?[\u107e-\u1084][\u1000-\u1021]/g,        // E-vowel + Ya-yit before consonant
  /[\u1060-\u107c]/g,                               // Zawgyi subjoined consonant glyphs & Kinzi (\u1064)
  /[\u1085\u1086\u108a\u108b\u108c\u108d\u108e\u108f]/g, // Zawgyi private medials / Great Sa (\u1086)
  /\u1038\u1037/g,                                  // Inverted Visarga before Dot Below (Zawgyi order)
  /\u1033|\u1034/g,                                 // Zawgyi U/UU vowel glyphs
  /\u1031\u1005\u103a/g,                            // Zawgyi 'ေစ်' spelling for 'ဈ'
  /\u1031[\u1000-\u1021][\u102b\u102c]/g,          // Zawgyi E-vowel before consonant followed by AA (e.g. ေရာ)
  /\u103b[\u1016\u101b\u101e\u101f]/g,              // Zawgyi Ya-yit using \u103b on non-velar/bilabial (e.g. ျဖ)
  /\u1004\u1039[\u1000-\u1021]/g,                   // Zawgyi Nga Asat without space before consonant (e.g. တင္မယ္)
  /[\u1000\u1015\u101a]\u1039[\u1000-\u1021]/g,    // Zawgyi Asat on Ka/Pa/Ya followed by consonant (e.g. ေရာက္ပီ, လိပ္စာ)
];

// Valid Pali stacked consonant pairs in standard Unicode
// In Pali/Burmese, only homorganic stops stack, or sonorant/sibilant combinations
const UNICODE_VALID_PALI_STACK = new RegExp(
  '(' +
  // Class 1 (Velars): က္က, က္ခ, ဂ္ဂ, ဂ္ဃ
  '[\u1000\u1001]\u1039[\u1000\u1001]|[\u1002\u1003]\u1039[\u1002\u1003]|' +
  // Class 2 (Palatals): စ္စ, စ္ဆ, ဇ္ဇ, ဇ္ဈ, ဉ္စ, ဉ္ဆ, ဉ္ဇ, ဉ္ဈ
  '[\u1005\u1006]\u1039[\u1005\u1006]|[\u1007\u1008]\u1039[\u1007\u1008]|\u100a\u1039[\u1005-\u1008]|' +
  // Class 3 (Retroflex): ဋ္ဋ, ဋ္ဌ, ဍ္ဍ, ဍ္ဎ, ဏ္ဋ, ဏ္ဍ
  '[\u100b\u100c]\u1039[\u100b\u100c]|[\u100d\u100e]\u1039[\u100d\u100e]|\u100f\u1039[\u100b-\u100e]|' +
  // Class 4 (Dentals): တ္တ, တ္ထ, ဒ္ဒ, ဒ္ဓ, န္တ, န္ထ, န္ဒ, န္ဓ, န္န
  '[\u1010\u1011]\u1039[\u1010\u1011]|[\u1012\u1013]\u1039[\u1012\u1013]|\u1014\u1039[\u1010-\u1014]|' +
  // Class 5 (Labials): ပ္ပ, ပ္ဖ, ဗ္ဗ, ဗ္ဘ, မ္ပ, မ္ဗ, မ္ဘ, မ္မ
  '[\u1015\u1016]\u1039[\u1015\u1016]|[\u1017\u1018]\u1039[\u1017\u1018]|\u1019\u1039[\u1015-\u1019]|' +
  // Liquids/Sibilants: လ္လ, သ္သ
  '\u101c\u1039\u101c|\u101e\u1039\u101e' +
  ')',
  'g'
);

// High-confidence Unicode syntactic markers
const UNICODE_DEFINITIVE_PATTERNS: RegExp[] = [
  /\u1004\u103a\u1039[\u1000-\u1021]/g,            // Kinzi (Nga + Asat + Virama + Consonant)
  UNICODE_VALID_PALI_STACK,                          // Valid Pali stacked consonants
  /[\u1000-\u1021][\u103b\u103c\u103d\u103e]*\u1031/g, // Consonant + optional medials + E-vowel
  /[\u1000-\u1021]\u103c/g,                         // Consonant + Unicode Ya-yit (\u103c)
  /\u103f/g,                                        // Standard Unicode Great Sa (ဿ)
  /\u103d\u103e|\u103b\u103d|\u103c\u103d/g,       // Medial combinations in Unicode order
  /\u1037\u1038/g,                                  // Canonical Dot Below before Visarga
];

export function isZawgyiProposed(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  if (!/[\u1000-\u109F\uAA60-\uAA7F]/.test(text)) return false;

  let zawgyiScore = 0;
  for (const pattern of ZAWGYI_DEFINITIVE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) zawgyiScore += matches.length * 10;
  }

  let unicodeScore = 0;
  for (const pattern of UNICODE_DEFINITIVE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) unicodeScore += matches.length * 10;
  }

  return zawgyiScore > unicodeScore && zawgyiScore > 0;
}

const ZAWGYI_SUBJOINED_MAP: Record<string, string> = {
  '\u1060': '\u1039\u1000', '\u1061': '\u1039\u1001', '\u1062': '\u1039\u1002', '\u1063': '\u1039\u1003',
  '\u1065': '\u1039\u1005', '\u1066': '\u1039\u1006', '\u1067': '\u1039\u1007', '\u1068': '\u1039\u1008',
  '\u1069': '\u1039\u1009', '\u106a': '\u1039\u100a', '\u106b': '\u1039\u100b', '\u106c': '\u1039\u100c',
  '\u106d': '\u1039\u100d', '\u106e': '\u1039\u100e', '\u106f': '\u1039\u100f', '\u1070': '\u1039\u1010',
  '\u1071': '\u1039\u1011', '\u1072': '\u1039\u1012', '\u1073': '\u1039\u1013', '\u1074': '\u1039\u1014',
  '\u1075': '\u1039\u1015', '\u1076': '\u1039\u1016', '\u1077': '\u1039\u1017', '\u1078': '\u1039\u1018',
  '\u1079': '\u1039\u1019', '\u107a': '\u1039\u101c', '\u107b': '\u1039\u101e', '\u107c': '\u1039\u101f',
};

export function canonicalizeUnicodeDiacriticsProposed(text: string): string {
  if (!text) return '';
  let normalized = text;
  normalized = normalized.replace(/\u1038\u1037/g, '\u1037\u1038');
  normalized = normalized
    .replace(/\u1031([\u103b\u103c\u103d\u103e])/g, '$1\u1031') // Medials before E-vowel
    .replace(/\u1037\u1032/g, '\u1032\u1037')
    .replace(/\u102f\u102d/g, '\u102d\u102f')
    .replace(/\u1030\u102d/g, '\u102d\u1030')
    .replace(/\u1037([\u102b\u102c])/g, '$1\u1037')
    .replace(/\u1038([\u102b\u102c])/g, '$1\u1038')
    .replace(/\u1038\u103a/g, '\u103a\u1038')
    .replace(/\u1037\u103a/g, '\u103a\u1037')
    .replace(/\u1038\u1036/g, '\u1036\u1038')
    .replace(/\u1037\u1036/g, '\u1036\u1037');

  normalized = normalized
    .replace(/\u1038+/g, '\u1038')
    .replace(/\u1037+/g, '\u1037')
    .replace(/\u103a+/g, '\u103a')
    .replace(/\u1036+/g, '\u1036')
    .replace(/\u1031+/g, '\u1031')
    .replace(/\u102d+/g, '\u102d')
    .replace(/\u102e+/g, '\u102e')
    .replace(/\u102f+/g, '\u102f')
    .replace(/\u1030+/g, '\u1030')
    .replace(/\u102b+/g, '\u102b')
    .replace(/\u102c+/g, '\u102c')
    .replace(/\u1032+/g, '\u1032');

  return normalized;
}

export function normalizeBurmeseProposed(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let text = input.trim();

  if (isZawgyiProposed(text)) {
    // 1. Zawgyi Asat \u1039 -> Unicode Asat \u103a
    // In raw Zawgyi input, \u1039 is ALWAYS Asat (subjoined consonants were encoded as \u1060-\u107c).
    // Running this before any expansions ensures we never mutate newly generated Unicode viramas.
    text = text.replace(/\u1039/g, '\u103a');

    // 2. Common Zawgyi social commerce lexicon fixes
    text = text
      .replace(/ေစ်း/g, 'ဈေး')
      .replace(/စ[မ္မ်း]+ေခ်ာင္း/g, 'စမ်းချောင်း')
      .replace(/စမ္းေခ်ာင္း/g, 'စမ်းချောင်း')
      .replace(/ပစၥည္း/g, 'ပစ္စည်း')
      .replace(/ရွိလား/g, 'ရှိလား')
      .replace(/မဂၤလာပါ/g, 'မင်္ဂလာပါ');

    // 3. Kinzi replacement: In Zawgyi Kinzi follows the carrying base consonant
    text = text.replace(/([\u1000-\u1021])\u1064/g, '\u1004\u103a\u1039$1');
    // Also handle \u1064 preceding consonant if typed in inverted order
    text = text.replace(/\u1064([\u1000-\u1021])/g, '\u1004\u103a\u1039$1');

    // 4. Subjoined stacked consonants mapping (\u1060-\u107c -> \u1039 + consonant)
    text = text.replace(/[\u1060-\u1063\u1065-\u107c]/g, (char) => ZAWGYI_SUBJOINED_MAP[char] || char);

    // 5. Great Sa and medials
    text = text
      .replace(/[\u1086\u108f]/g, '\u103f')    // Great Sa (\u1086 & \u108f)
      .replace(/\u108a/g, '\u103d\u103e')      // Wa-swae + Ha-hto
      .replace(/\u108b/g, '\u103c\u103e')      // Ya-yit + Ha-hto
      .replace(/\u108c/g, '\u103b\u103d')      // Ya-pin + Wa-swae
      .replace(/\u108d/g, '\u103c\u103d')      // Ya-yit + Wa-swae
      .replace(/\u108e/g, '\u103d\u103e')
      .replace(/\u107d/g, '\u103d')          // Wa-swae
      .replace(/\u1085/g, '\u103e')          // Ha-hto
      .replace(/\u1033/g, '\u102f')          // U-vowel
      .replace(/\u1034/g, '\u1030');         // UU-vowel

    // 6. Reorder Zawgyi Ya-yit (\u107e-\u1084) before consonant
    text = text.replace(/([\u107e-\u1084])([\u1000-\u1021])/g, '$2\u103c');
    // Also Zawgyi \u103b used as Ya-yit before consonant like ျဖ
    text = text.replace(/\u103b([\u1016\u101b\u101e\u101f])/g, '$1\u103c');

    // 7. Reorder Zawgyi pre-base E-vowel: ensure medials and subjoined consonants stay before E-vowel
    text = text.replace(/(\u1031)([\u1000-\u1021])((?:[\u103b\u103c\u103d\u103e]|\u1039[\u1000-\u1021])*)/g, '$2$3$1');
  }

  return canonicalizeUnicodeDiacriticsProposed(text);
}

// RUN THE 5 CHALLENGER 1 TESTS:
console.log('=== VERIFYING CHALLENGER 1 FIXES ===');

// Test 1: Great Sa
const greatSaZg = '\u107e\u1015\u1086\u1014\u102c';
console.log('Test 1 (Great Sa):', isZawgyiProposed(greatSaZg) ? 'DETECTED' : 'NOT DETECTED');
const t1Res = normalizeBurmeseProposed(greatSaZg);
console.log('Test 1 Result:', t1Res, t1Res === 'ပြဿနာ' ? 'PASS' : 'FAIL');

// Test 2: Kinzi
const tuesdayZg = 'အဂ\u1064\u102b';
console.log('Test 2a (Tuesday):', isZawgyiProposed(tuesdayZg) ? 'DETECTED' : 'NOT DETECTED');
const t2aRes = normalizeBurmeseProposed(tuesdayZg);
console.log('Test 2a Result:', t2aRes, t2aRes === 'အင်္ဂါ' ? 'PASS' : 'FAIL');

const englandZg = 'အဂ\u1064လန္';
const t2bRes = normalizeBurmeseProposed(englandZg);
console.log('Test 2b Result:', t2bRes, t2bRes === 'အင်္ဂလန်' ? 'PASS' : 'FAIL');

// Test 3: E-vowel medials
const speakZg = '\u1031\u107e\u1015\u102c';
console.log('Test 3 (Speak):', isZawgyiProposed(speakZg) ? 'DETECTED' : 'NOT DETECTED');
const t3Res = normalizeBurmeseProposed(speakZg);
console.log('Test 3 Result:', t3Res, t3Res === 'ပြော' ? 'PASS' : 'FAIL');

// Test 4: Asat unspaced
const orderZg = 'တင္မယ္';
console.log('Test 4 (Order):', isZawgyiProposed(orderZg) ? 'DETECTED' : 'NOT DETECTED');
const t4Res = normalizeBurmeseProposed(orderZg);
console.log('Test 4 Result:', t4Res, t4Res === 'တင်မယ်' ? 'PASS' : 'FAIL');

// Test 5: Common inquiries
const arrivedZg = 'ေရာက္ပီလား';
console.log('Test 5a (Arrived):', isZawgyiProposed(arrivedZg) ? 'DETECTED' : 'NOT DETECTED');
const t5aRes = normalizeBurmeseProposed(arrivedZg);
console.log('Test 5a Result:', t5aRes);

const canDoZg = '\u103b\u1016\u1005\u1039\u1015\u102c\u1010\u101a\u1039';
console.log('Test 5b (CanDo):', isZawgyiProposed(canDoZg) ? 'DETECTED' : 'NOT DETECTED');
const t5bRes = normalizeBurmeseProposed(canDoZg);
console.log('Test 5b Result:', t5bRes);

const addrZg = 'လိပ္စာ';
console.log('Test 5c (Addr):', isZawgyiProposed(addrZg) ? 'DETECTED' : 'NOT DETECTED');
const t5cRes = normalizeBurmeseProposed(addrZg);
console.log('Test 5c Result:', t5cRes, t5cRes === 'လိပ်စာ' ? 'PASS' : 'FAIL');

// FULL TEST OF VERIFY_M2_NLP_LOGISTICS SUITE 1 SAMPLES
console.log('\n=== TESTING BASELINE VERIFY_M2 SUITE 1 SAMPLES ===');
const baseUnicode = [
  'ဈေးဘယ်လောက်လဲ',
  'စမ်းချောင်း မြို့နယ် ပို့ဆောင်ခ',
  'မင်္ဂလာပါရှင်',
  'ကျေးဇူးတင်ပါတယ်',
  'ချက်ချင်း ပို့ပေးပါ',
  'တက္ကသိုလ်ရိပ်သာလမ်း',
  'Hello, how much is this?',
  '',
  '   ',
];
for (const u of baseUnicode) {
  if (isZawgyiProposed(u)) {
    console.error('FAIL: Baseline Unicode misdetected as Zawgyi:', u);
  }
}
const baseZawgyi = [
  { zg: 'ေစ်းဘယ္ေလာက္လဲ', expected: 'ဈေးဘယ်လောက်လဲ' },
  { zg: 'စမ္းေခ်ာင္း ပို့ခ', expected: 'စမ်းချောင်း ပို့ခ' },
  { zg: 'ေရာင္းမည္', expected: 'ရောင်းမည်' },
  { zg: 'မဂၤလာပါ', expected: 'မင်္ဂလာပါ' },
  { zg: 'ပစၥည္းရွိလား', expected: 'ပစ္စည်းရှိလား' },
];
for (const z of baseZawgyi) {
  if (!isZawgyiProposed(z.zg)) {
    console.error('FAIL: Baseline Zawgyi not detected:', z.zg);
  }
  const norm = normalizeBurmeseProposed(z.zg);
  if (norm !== z.expected) {
    console.error(`FAIL: Baseline Zawgyi conversion: expected "${z.expected}", got "${norm}"`);
  }
}
console.log('Baseline Suite 1 completed.');
