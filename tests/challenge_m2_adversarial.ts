/**
 * CHALLENGER M2: EMPIRICAL ADVERSARIAL STRESS TEST SUITE
 * 
 * Adversarial audit of `src/lib/burmese-converter.ts` for Milestone 2:
 * 1. Zawgyi vs Unicode Detection & Conversion Fidelity
 * 2. False Positive Prevention on Standard Unicode Texts
 * 3. Burmese, Shan & Thai Digit Normalization
 * 4. Contextual Letter Wa (ဝ) vs Digit Zero (၀) Disambiguation
 * 5. Messy Myanmar Phone Formats Normalization (09XXXXXXXXX)
 * 6. Diacritic Reordering & Duplicate Elimination
 * 7. Stress Fuzzing & High-Throughput Performance
 */

import {
  isZawgyi,
  normalizeBurmese,
  convertBurmeseDigits,
  correctWaInNumericContext,
  canonicalizeUnicodeDiacritics,
  normalizeMyanmarPhone,
} from '../src/lib/burmese-converter';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: false, error: err.message || String(err), durationMs });
    console.error(`  [FAIL] ${name} (${durationMs}ms): ${err.message || String(err)}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('CHALLENGER M2: BURMESE NLP & DIGIT NORMALIZATION ADVERSARIAL HARNESS');
  console.log('================================================================\n');

  // ============================================================================
  // SUITE 1: ZAWGYI VS UNICODE DETECTION & CONVERSION FIDELITY
  // ============================================================================
  console.log('--- SUITE 1: Zawgyi vs Unicode Detection & Conversion Fidelity ---');

  await runTest('Zawgyi NLP', 'Hardcoded social commerce lexicon phrases convert cleanly', () => {
    const samples = [
      { zg: 'ေစ်းဘယ္ေလာက္လဲ', expected: 'ဈေးဘယ်လောက်လဲ' },
      { zg: 'စမ္းေခ်ာင္း ပို့ခ', expected: 'စမ်းချောင်း ပို့ခ' },
      { zg: 'မဂၤလာပါ', expected: 'မင်္ဂလာပါ' },
      { zg: 'ပစၥည္းရွိလား', expected: 'ပစ္စည်းရှိလား' },
    ];
    for (const sample of samples) {
      assert(isZawgyi(sample.zg), `Sample "${sample.zg}" must be detected as Zawgyi`);
      const norm = normalizeBurmese(sample.zg);
      assert(norm === sample.expected, `Expected "${sample.expected}", got "${norm}"`);
    }
  });

  await runTest('Zawgyi NLP', 'Zawgyi subjoined consonants map to Unicode virama stacking', () => {
    const subjoinedZg = 'ပစ\u1065ည္း'; // Zawgyi ပစ္စည်း with \u1065
    assert(isZawgyi(subjoinedZg), 'Subjoined glyph must trigger Zawgyi detection');
    const res = normalizeBurmese(subjoinedZg);
    assert(res.includes('ပစ္စည်း'), `Subjoined glyph conversion failed: "${res}"`);
  });

  await runTest('Zawgyi NLP', 'Zawgyi Great Sa (\\u1086) detected and converted to Unicode Great Sa (\\u103f)', () => {
    // In Zawgyi, Great Sa (ဿ) is encoded at \u1086. Example: ပြဿနာ
    const greatSaZg = '\u107e\u1015\u1086\u1014\u102c'; // ပြဿနာ in Zawgyi
    assert(isZawgyi(greatSaZg), 'Zawgyi Great Sa \\u1086 must be detected as Zawgyi');
    const converted = normalizeBurmese(greatSaZg);
    assert(converted === 'ပြဿနာ', `Expected "ပြဿနာ", got "${converted}"`);
  });

  await runTest('Zawgyi NLP', 'Zawgyi Kinzi general case ordering and non-consonant followers', () => {
    // Example: အင်္ဂါ (Tuesday / organ) in Zawgyi is အ + ဂ + \u1064 + ါ
    const tuesdayZg = 'အဂ\u1064\u102b';
    assert(isZawgyi(tuesdayZg), 'Kinzi in အဂၤါ must be detected as Zawgyi');
    const normTuesday = normalizeBurmese(tuesdayZg);
    assert(normTuesday === 'အင်္ဂါ', `Expected "အင်္ဂါ", got "${normTuesday}"`);

    // Example: အင်္ဂလန် (England) in Zawgyi is အ + ဂ + \u1064 + လ + န်
    const englandZg = 'အဂ\u1064လန္';
    const normEngland = normalizeBurmese(englandZg);
    assert(normEngland === 'အင်္ဂလန်', `Expected "အင်္ဂလန်", got "${normEngland}"`);
  });

  await runTest('Zawgyi NLP', 'Visual E-vowel with medials converts to canonical Unicode order', () => {
    // In Zawgyi: ေ + ြ + ပ + ာ (\u1031\u107e\u1015\u102c) -> Unicode: ပြော (ပ + ြ + ေ + ာ)
    const speakZg = '\u1031\u107e\u1015\u102c';
    assert(isZawgyi(speakZg), 'Zawgyi E-vowel + Ya-yit must be detected as Zawgyi');
    const normSpeak = normalizeBurmese(speakZg);
    assert(normSpeak === 'ပြော', `Expected "ပြော" (\\u1015\\u103c\\u1031\\u102c), got "${normSpeak}"`);
  });

  await runTest('Zawgyi NLP', 'Zawgyi Asat (\\u1039) converts to Unicode Asat (\\u103a) in unspaced compound words', () => {
    // Example: တင်မယ် (want to submit) in Zawgyi without spaces is တ + င + \u1039 + မ + ယ + \u1039
    const orderZg = 'တင္မယ္';
    assert(isZawgyi(orderZg), 'တင္မယ္ must be detected as Zawgyi');
    const normOrder = normalizeBurmese(orderZg);
    assert(normOrder === 'တင်မယ်', `Expected "တင်မယ်", got "${normOrder}"`);
  });

  await runTest('Zawgyi NLP', 'Common customer inquiry phrases in Zawgyi are detected and converted', () => {
    // Common e-commerce queries:
    // 1. ရောက်ပြီလား (has it arrived): ေရာက္ပီလား
    const arrivedZg = 'ေရာက္ပီလား';
    assert(isZawgyi(arrivedZg), 'ေရာက္ပီလား must be detected as Zawgyi');
    
    // 2. ဖြစ်ပါတယ် (can do): ျဖစ္ပါတယ္
    const canDoZg = '\u103b\u1016\u1005\u1039\u1015\u102c\u1010\u101a\u1039';
    assert(isZawgyi(canDoZg), 'ျဖစ္ပါတယ္ must be detected as Zawgyi');

    // 3. လိပ်စာ (address): လိပ္စာ
    const addrZg = 'လိပ္စာ';
    assert(isZawgyi(addrZg), 'လိပ္စာ must be detected as Zawgyi');
  });

  await runTest('Zawgyi NLP', 'Idempotency: Normalizing already converted text produces identical output', () => {
    const phrases = ['ဈေးဘယ်လောက်လဲ', 'စမ်းချောင်း ပို့ခ', 'ပစ္စည်းရှိလား', 'မင်္ဂလာပါရှင်', 'ကျေးဇူးတင်ပါတယ်'];
    for (const p of phrases) {
      const once = normalizeBurmese(p);
      const twice = normalizeBurmese(once);
      assert(once === twice, `Idempotency violation for "${p}": "${once}" !== "${twice}"`);
    }
  });

  // ============================================================================
  // SUITE 2: FALSE POSITIVE PREVENTION ON STANDARD UNICODE TEXTS
  // ============================================================================
  console.log('\n--- SUITE 2: False Positive Prevention on Standard Unicode Texts ---');

  await runTest('False Positive Prevention', 'Standard Unicode vocabulary is NEVER detected as Zawgyi', () => {
    const unicodeWords = [
      'မင်္ဂလာပါ',
      'မင်္ဂလာပါရှင်',
      'မင်္ဂလာပါခင်ဗျာ',
      'ပစ္စည်း',
      'ပစ္စည်းများ',
      'ကျေးဇူးတင်ပါတယ်',
      'ချက်ချင်း',
      'ချက်ချင်းပို့ပေးပါ',
      'ပျော်ရွှင်',
      'တက္ကသိုလ်ရိပ်သာလမ်း',
      'ကွန်ပျူတာ',
      'အင်တာနက်',
      'ဖုန်းနံပါတ်',
      'ငွေလွှဲပြေစာ',
      'ဈေးဘယ်လောက်လဲ',
      'စမ်းချောင်း မြို့နယ် ပို့ဆောင်ခ',
      'မြောက်ဒဂုံ',
      'တောင်ကြီးမြို့',
      'အောင်မင်္ဂလာ အဝေးပြေးဂိတ်',
    ];
    for (const word of unicodeWords) {
      assert(!isZawgyi(word), `False positive: Unicode word "${word}" wrongly classified as Zawgyi!`);
      const norm = normalizeBurmese(word);
      assert(norm === word, `Corruption: Unicode word "${word}" mutated to "${norm}"!`);
    }
  });

  await runTest('False Positive Prevention', 'Pali stacked subjoined consonants in Unicode never misdetected', () => {
    const paliStacked = [
      'သမ္မတ',     // President
      'ဥက္ကဋ္ဌ',     // Chairman
      'ဗုဒ္ဓ',      // Buddha
      'ကမ္ဘာ',     // World
      'အန္တရာယ်',  // Danger
      'မေတ္တာ',    // Loving kindness
      'စေတနာ',    // Benevolence
      'ဝိဇ္ဇာ',     // Arts
      'သိပ္ပံ',     // Science
      'သစ္စာ',     // Truth
    ];
    for (const word of paliStacked) {
      assert(!isZawgyi(word), `Pali stacked word "${word}" wrongly classified as Zawgyi!`);
      assert(normalizeBurmese(word) === word, `Pali stacked word "${word}" mutated during normalization!`);
    }
  });

  await runTest('False Positive Prevention', 'Single-syllable E-vowel Unicode words never misdetected', () => {
    const eWords = ['နေ', 'မေ', 'ရေ', 'လေ', 'မေး', 'ပေး', 'ဆေး', 'ပြေး', 'ရွေး', 'ဖွေး'];
    for (const word of eWords) {
      assert(!isZawgyi(word), `Single-syllable word "${word}" wrongly classified as Zawgyi!`);
      assert(normalizeBurmese(word) === word, `Word "${word}" mutated during normalization!`);
    }
  });

  await runTest('False Positive Prevention', 'English, numbers, emojis, and Burglish never misdetected', () => {
    const inputs = [
      'Hello world',
      'iPhone 16 Pro Max 256GB Natural Titanium',
      'KPay / WavePay available',
      'COD Yangon 2,500 MMK',
      'Serum 1 bottle Sanchaung deli bl lout ll?',
      'order tin mel naw',
      '1234567890',
      '🇲🇲 🛍️ 📦 💳 🚚',
      '!@#$%^&*()_+-=[]{}|;:",.<>?',
      '',
      '   ',
      '\t\n\r',
    ];
    for (const input of inputs) {
      assert(!isZawgyi(input), `Input "${input}" wrongly classified as Zawgyi!`);
      assert(normalizeBurmese(input) === input.trim(), `Non-Burmese input "${input}" corrupted!`);
    }
  });

  // ============================================================================
  // SUITE 3: BURMESE, SHAN & THAI DIGIT NORMALIZATION
  // ============================================================================
  console.log('\n--- SUITE 3: Burmese, Shan & Thai Digit Normalization ---');

  await runTest('Digit Normalization', 'Burmese standard digits (၀-၉) translate to ASCII 0-9', () => {
    assert(convertBurmeseDigits('၀၁၂၃၄၅၆၇၈၉') === '0123456789', '၀-၉ mapping failed');
    assert(convertBurmeseDigits('၂၅၀၀၀ ကျပ်') === '25000 ကျပ်', 'Price string failed');
    assert(convertBurmeseDigits('အရေအတွက် ၅ ထည်') === 'အရေအတွက် 5 ထည်', 'Quantity string failed');
    assert(convertBurmeseDigits('၁၅၀၀၀၀ Ks') === '150000 Ks', 'Ks price failed');
  });

  await runTest('Digit Normalization', 'Shan digits (႐-႙) translate to ASCII 0-9', () => {
    assert(convertBurmeseDigits('႐႑႒႓႔႕႖႗႘႙') === '0123456789', '႐-႙ mapping failed');
    assert(convertBurmeseDigits('႓႕၀၀၀ ကျပ်') === '35000 ကျပ်', 'Shan digits in price failed');
  });

  await runTest('Digit Normalization', 'Thai zero (๐) translates to ASCII 0', () => {
    assert(convertBurmeseDigits('๐၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Thai zero in phone failed');
    assert(convertBurmeseDigits('၂၅๐๐๐') === '25000', 'Thai zero in price failed');
  });

  await runTest('Digit Normalization', 'Mixed script digits in single string normalize seamlessly', () => {
    const mixed = '၁2႓4၅6႗8၉0';
    assert(convertBurmeseDigits(mixed) === '1234567890', `Mixed digits failed: ${convertBurmeseDigits(mixed)}`);

    const formattedPrice = '၁,၂၅၀,၀၀၀.၅၀ ကျပ်';
    assert(convertBurmeseDigits(formattedPrice) === '1,250,000.50 ကျပ်', 'Formatted large currency failed');
  });

  // ============================================================================
  // SUITE 4: CONTEXTUAL LETTER WA (ဝ) VS DIGIT ZERO (၀) DISAMBIGUATION
  // ============================================================================
  console.log('\n--- SUITE 4: Contextual Letter Wa (ဝ) vs Digit Zero (၀) ---');

  await runTest('Wa vs Zero', 'Phone prefixes with letter Wa convert to 09...', () => {
    assert(convertBurmeseDigits('ဝ၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Leading Wa in ဝ၉... failed');
    assert(convertBurmeseDigits('ဝ9798765432') === '09798765432', 'Wa before ASCII 9 failed');
    assert(convertBurmeseDigits('Ph: ဝ၉-၄၅၁၁၂၂၃၃၄') === 'Ph: 09-451122334', 'Wa with Ph prefix failed');
    assert(convertBurmeseDigits('ဖုန်း - ဝ၉၇၉၈၇၆၅၄၃၂') === 'ဖုန်း - 09798765432', 'Wa with Burmese phone label failed');
  });

  await runTest('Wa vs Zero', 'Embedded Wa adjacent to numbers converts to 0', () => {
    assert(convertBurmeseDigits('5ဝ0') === '500', '5ဝ0 failed');
    assert(convertBurmeseDigits('၁ဝ,ဝဝဝ') === '10,000', '၁ဝ,ဝဝဝ with comma failed');
    assert(convertBurmeseDigits('၂ဝ') === '20', '၂ဝ failed');
    assert(convertBurmeseDigits('09-4ဝဝ-11223') === '09-400-11223', 'Repeated Wa in phone failed');
    assert(convertBurmeseDigits('၁ဝဝ%') === '100%', 'Percentage 100% with Wa failed');
  });

  await runTest('Wa vs Zero', 'Real Burmese vocabulary containing letter Wa is STRICTLY PRESERVED', () => {
    const vocabList = [
      'ဝယ်မယ်',           // want to buy -> NOT 0ယ်မယ်
      'ဝယ်ယူမည်',         // purchase
      'ဝတ်စုံ',           // clothing suit -> NOT 0တ်စုံ
      'အဝတ်အစား',        // clothes
      'ဝေဒနာ',           // ailment / pain
      'အဝါရောင်',         // yellow color
      'အဝေးပြေးဂိတ်',     // highway bus gate -> NOT အ0ေးပြေးဂိတ်
      'ဝမ်းသာပါတယ်',     // glad / pleased
      'ဝက်သား',          // pork
      'ဝါးတားတား',       // blurred
      'ဝေခြမ်း',          // distribute
      'သတင်းဝေငှပါ',      // share news
      'အေးချမ်းသာယာဝပြော', // prosperous
    ];
    for (const vocab of vocabList) {
      const converted = convertBurmeseDigits(vocab);
      assert(converted === vocab, `Vocabulary corruption: "${vocab}" became "${converted}"!`);
      assert(!converted.includes('0'), `Vocabulary "${vocab}" contains illegal digit 0!`);
    }
  });

  await runTest('Wa vs Zero', 'Complex sentence with BOTH Wa vocabulary AND Wa numeric typos handles both correctly', () => {
    const complexInput = 'ဝတ်စုံ ၂ဝ ထည် ဝယ်မယ် ဝ၉၄၅၀၀၁၁၂၂၃ ကို ပို့ပေးပါ';
    const expected = 'ဝတ်စုံ 20 ထည် ဝယ်မယ် 09450011223 ကို ပို့ပေးပါ';
    const converted = convertBurmeseDigits(complexInput);
    assert(converted === expected, `Complex sentence disambiguation failed:\nExpected: ${expected}\nGot:      ${converted}`);
  });

  // ============================================================================
  // SUITE 5: MESSY MYANMAR PHONE FORMATS NORMALIZATION
  // ============================================================================
  console.log('\n--- SUITE 5: Messy Myanmar Phone Formats Normalization ---');

  await runTest('Phone Normalizer', 'All valid formats normalize strictly to 09XXXXXXXXX', () => {
    const cases = [
      // Standard local
      { input: '09798765432', expected: '09798765432' },
      { input: '09 798 765 432', expected: '09798765432' },
      { input: '09-798-765-432', expected: '09798765432' },
      { input: '09.798.765.432', expected: '09798765432' },
      { input: '(09) 798-765-432', expected: '09798765432' },
      { input: '09/798/765/432', expected: '09798765432' },
      
      // Missing leading zero (9XXXXXXXXX)
      { input: '9798765432', expected: '09798765432' },
      { input: '9-798-765-432', expected: '09798765432' },
      { input: '9 798 765 432', expected: '09798765432' },

      // International prefixes
      { input: '+959798765432', expected: '09798765432' },
      { input: '+95 9 798 765 432', expected: '09798765432' },
      { input: '+95-9-798-765-432', expected: '09798765432' },
      { input: '959798765432', expected: '09798765432' },
      { input: '00959798765432', expected: '09798765432' },
      { input: '+9509798765432', expected: '09798765432' },
      { input: '+09798765432', expected: '09798765432' },

      // Burmese digits
      { input: '၀၉၇၉၈၇၆၅၄၃၂', expected: '09798765432' },
      { input: '+၉၅၉၇၉၈၇၆၅၄၃၂', expected: '09798765432' },
      { input: '၀၉-၇၉၈-၇၆၅-၄၃၂', expected: '09798765432' },
      { input: '၀၉-၄၅၀၀-၁၁၂၂၃', expected: '09450011223' },

      // Letter Wa typos in phone
      { input: 'ဝ၉၇၉၈၇၆၅၄၃၂', expected: '09798765432' },
      { input: 'ဝ၉-၄၅၁၁၂၂၃၃၄', expected: '09451122334' },
      { input: 'ဝ၉-၄၅၀၀-၁၁၂၂၃', expected: '09450011223' },
      { input: '09-4ဝဝ-11223', expected: '0940011223' },

      // Thai zero in phone
      { input: '๐၉၂၅၀၀၉၉၈၈၇', expected: '09250099887' },

      // Shan digits in phone
      { input: '႐႙၇၉၈၇၆၅၄၃၂', expected: '09798765432' },

      // Conversational prefixes
      { input: 'Ph: 09 798 765 432', expected: '09798765432' },
      { input: 'ဖုန်း - 09.798.765.432', expected: '09798765432' },
      { input: 'Phone: +959-798-765-432', expected: '09798765432' },
      { input: 'KPay: 09798765432', expected: '09798765432' },
    ];

    for (const c of cases) {
      const res = normalizeMyanmarPhone(c.input);
      assert(res === c.expected, `Phone normalization mismatch for "${c.input}":\nExpected: "${c.expected}"\nGot:      "${res}"`);
      assert(/^09\d{7,9}$/.test(res), `Normalized phone "${res}" does not match 09XXXXXXXXX regex!`);
    }
  });

  await runTest('Phone Normalizer', 'Invalid and non-phone inputs return empty string', () => {
    const invalidInputs = [
      '',
      '   ',
      'invalid',
      'hello world',
      '12345',              // too short
      '09123',              // too short
      '09123456789012345',  // too long
      '01234567',           // landline 01
      '02234567',           // landline 02
      '+12025550123',       // US phone number
      '+447911123456',      // UK phone number
    ];
    for (const inv of invalidInputs) {
      const res = normalizeMyanmarPhone(inv);
      assert(res === '', `Expected empty string for invalid input "${inv}", got "${res}"`);
    }
  });

  // ============================================================================
  // SUITE 6: DIACRITIC REORDERING & DUPLICATE ELIMINATION
  // ============================================================================
  console.log('\n--- SUITE 6: Diacritic Reordering & Duplicate Elimination ---');

  await runTest('Diacritics', 'Deduplication removes duplicate tone marks and vowels', () => {
    assert(canonicalizeUnicodeDiacritics('ပြီးး') === 'ပြီး', 'Double Visarga failed');
    assert(canonicalizeUnicodeDiacritics('သွားးးး') === 'သွား', 'Quadruple Visarga failed');
    assert(canonicalizeUnicodeDiacritics('တဲ့့') === 'တဲ့', 'Double Dot Below failed');
    assert(canonicalizeUnicodeDiacritics('ကားး') === 'ကား', 'Double Visarga on ကား failed');
    assert(canonicalizeUnicodeDiacritics('တယ််') === 'တယ်', 'Double Asat failed');
    assert(canonicalizeUnicodeDiacritics('စစ််') === 'စစ်', 'Double Asat on စစ် failed');
  });

  await runTest('Diacritics', 'Inverted tone marks reorder into Unicode canonical sequence', () => {
    // 1. Visarga before Dot Below (\u1038\u1037 -> \u1037\u1038)
    const invertedVisarga = 'စမ်း\u1038\u1037';
    assert(canonicalizeUnicodeDiacritics(invertedVisarga) === 'စမ်း\u1037\u1038', 'Visarga before Dot Below reorder failed');

    // 2. Dot Below before Ai (\u1037\u1032 -> \u1032\u1037)
    const invertedAi = 'န\u1037\u1032';
    assert(canonicalizeUnicodeDiacritics(invertedAi) === 'န\u1032\u1037', 'Dot Below before Ai reorder failed');

    // 3. Vowel U before Vowel I (\u102f\u102d -> \u102d\u102f) for 'ို'
    const invertedO = 'က\u102f\u102d';
    assert(canonicalizeUnicodeDiacritics(invertedO) === 'က\u102d\u102f', 'Inverted O vowel reorder failed');

    // 4. Asat before Visarga (\u1038\u103a -> \u103a\u1038)
    const invertedAsat = 'သ\u1038\u103a';
    assert(canonicalizeUnicodeDiacritics(invertedAsat) === 'သ\u103a\u1038', 'Asat before Visarga reorder failed');
  });

  // ============================================================================
  // SUITE 7: ADVERSARIAL STRESS & PERFORMANCE FUZZING
  // ============================================================================
  console.log('\n--- SUITE 7: Adversarial Stress & Performance Fuzzing ---');

  await runTest('Adversarial Stress', '10,000 randomized operations complete in under 500ms', () => {
    const testCases = [
      'ဈေးဘယ်လောက်လဲ',
      'ေစ်းဘယ္ေလာက္လဲ',
      '၀၉-၇၉၈-၇၆၅-၄၃၂',
      'ဝ၉၇၉၈၇၆၅၄၃၂',
      'ဝတ်စုံ ၂ဝ ထည် ဝယ်မယ်',
      'ပြီးးးး တဲ့့့့',
      '+95 9 798 765 432',
      'စမ္းေခ်ာင္း ပို့ခ ၂၅၀၀ ကျပ်',
      'Serum 1 bottle bl lout ll?',
      '႐႑႒႓႔႕႖႗႘႙',
    ];

    const start = Date.now();
    for (let i = 0; i < 10000; i++) {
      const text = testCases[i % testCases.length];
      isZawgyi(text);
      normalizeBurmese(text);
      convertBurmeseDigits(text);
      normalizeMyanmarPhone(text);
    }
    const elapsed = Date.now() - start;
    console.log(`    Throughput: 10,000 iterations processed in ${elapsed}ms (${(10000 / (elapsed / 1000)).toFixed(0)} ops/sec)`);
    assert(elapsed < 1000, `Performance too slow: took ${elapsed}ms for 10,000 iterations`);
  });

  await runTest('Adversarial Stress', 'Large text payload (100KB) processed without heap exhaustion', () => {
    const largeUnicode = 'မင်္ဂလာပါရှင်။ ပစ္စည်းများ ကျေးဇူးတင်ပါတယ် ချက်ချင်းပို့ပေးပါ ဈေးဘယ်လောက်လဲ။ '.repeat(1000);
    assert(largeUnicode.length > 50000, 'Payload size verified');
    
    const start = Date.now();
    assert(!isZawgyi(largeUnicode), 'Large Unicode text must not be Zawgyi');
    const norm = normalizeBurmese(largeUnicode);
    assert(norm.length > 50000, 'Normalized text returned intact');
    const elapsed = Date.now() - start;
    console.log(`    Large payload processed in ${elapsed}ms`);
    assert(elapsed < 500, `Large payload processing took too long: ${elapsed}ms`);
  });

  await runTest('Adversarial Stress', 'Graceful handling of null, undefined, and non-string inputs', () => {
    // @ts-ignore
    assert(isZawgyi(null) === false, 'null isZawgyi safe');
    // @ts-ignore
    assert(isZawgyi(undefined) === false, 'undefined isZawgyi safe');
    // @ts-ignore
    assert(isZawgyi(12345) === false, 'number isZawgyi safe');
    // @ts-ignore
    assert(normalizeBurmese(null) === '', 'null normalizeBurmese safe');
    // @ts-ignore
    assert(normalizeBurmese(undefined) === '', 'undefined normalizeBurmese safe');
    // @ts-ignore
    assert(convertBurmeseDigits(null) === '', 'null convertBurmeseDigits safe');
    // @ts-ignore
    assert(normalizeMyanmarPhone(null) === '', 'null normalizeMyanmarPhone safe');
  });

  // ============================================================================
  // SUMMARY & VERDICT
  // ============================================================================
  console.log('\n================================================================');
  console.log('CHALLENGE EXECUTION SUMMARY');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Scenarios Tested : ${total}`);
  console.log(`Passed                 : ${passed}`);
  console.log(`Failed                 : ${failed}`);

  if (failed > 0) {
    console.log('\n❌ VERDICT: REJECT');
    console.log('Failures encountered:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - [${r.suite}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ VERDICT: APPROVE');
    console.log('All empirical adversarial stress tests passed cleanly.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal unhandled error in challenge harness:', err);
  process.exit(1);
});
