import {
  isZawgyi,
  normalizeBurmese,
  convertBurmeseDigits,
  correctWaInNumericContext,
  canonicalizeUnicodeDiacritics,
  normalizeMyanmarPhone,
} from '../src/lib/burmese-converter';
import {
  lookupTownshipDelivery,
  isRegionalPrepaidOnly,
  MYANMAR_DELIVERY_MATRIX,
  TownshipDeliveryInfo,
} from '../src/lib/myanmar-townships';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${desc}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${desc}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runForensicAuditProbe() {
  console.log('================================================================');
  console.log('FORENSIC AUDITOR M2: INDEPENDENT EMPIRICAL INTEGRITY PROBE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. NOVEL ZAWGYI SAMPLES (Not present in test suites or worker scripts)
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Novel Zawgyi and Unicode Classification ---');
  
  // Zawgyi: ေမးျမန္းျခင္း (Zawgyi encoding) vs မေးမြန်းခြင်း (Unicode)
  const zg1 = 'ေမးျမန္းျခင္း';
  assert(isZawgyi(zg1), 'Detects novel Zawgyi: ေမးျမန္းျခင္း');
  assert(normalizeBurmese(zg1) === 'မေးမြန်းခြင်း', 'Converts novel Zawgyi ေမးျမန္းျခင္း to Unicode');

  // Zawgyi: ေနရာ (Zawgyi: e-vowel first) vs နေရာ (Unicode: consonant first)
  const zg2 = 'ေနရာ';
  assert(isZawgyi(zg2), 'Detects novel Zawgyi: ေနရာ');
  assert(normalizeBurmese(zg2) === 'နေရာ', 'Converts novel Zawgyi ေနရာ to Unicode');

  // Zawgyi: ေဆး (medicine) -> Unicode: ဆေး
  const zgMedicine = 'ေဆး';
  assert(isZawgyi(zgMedicine), 'Detects novel Zawgyi: ေဆး');
  assert(normalizeBurmese(zgMedicine) === 'ဆေး', 'Converts novel Zawgyi ေဆး to Unicode ဆေး');

  // Zawgyi: ေရးပါ (please write) -> Unicode: ရေးပါ
  const zgWrite = 'ေရးပါ';
  assert(isZawgyi(zgWrite), 'Detects novel Zawgyi: ေရးပါ');
  assert(normalizeBurmese(zgWrite) === 'ရေးပါ', 'Converts novel Zawgyi ေရးပါ to Unicode ရေးပါ');

  // Zawgyi: တကၠသိုလ္ (Zawgyi stacked \u1060) vs တက္ကသိုလ် (Unicode subjoined)
  const zg4 = 'တကၠသိုလ္';
  assert(isZawgyi(zg4), 'Detects novel Zawgyi with stacked consonants: တကၠသိုလ္');
  assert(normalizeBurmese(zg4) === 'တက္ကသိုလ်', 'Converts novel Zawgyi တကၠသိုလ္ to Unicode');

  // Unicode Preservation & Idempotency
  const unicodeCorpus = [
    'မင်္ဂလာပါ ခင်ဗျာ ကုန်ပစ္စည်း မှာယူချင်လို့ပါ',
    'ရန်ကုန်မြို့တွင်း အိမ်အရောက် ငွေချေစနစ် ရပါသလား',
    'အဝေးပြေးကားဂိတ်သို့ ပို့ဆောင်ခ ၃၅၀၀ ကျပ် ဖြစ်ပါသည်',
    'ကျေးဇူးတင်ပါတယ် လူကြီးမင်း မင်္ဂလာရှိသော နေ့လေးဖြစ်ပါစေ',
    'အမြန်ဆုံး ပို့ပေးပါရှင် ကျေးဇူးပြု၍',
  ];
  for (const text of unicodeCorpus) {
    assert(!isZawgyi(text), `Unicode sentence correctly flagged as non-Zawgyi: "${text.slice(0, 20)}..."`);
    assert(normalizeBurmese(text) === text, `Unicode idempotency preserved: "${text.slice(0, 20)}..."`);
  }

  // -------------------------------------------------------------------------
  // 2. BURMESE VOCABULARY WA PRESERVATION VS NUMERIC CONTEXT
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Wa Preservation in Real Vocabulary vs Numbers ---');

  const burmeseWaWords = [
    'ဝယ်မယ်',
    'ဝတ်စုံ',
    'ဝေဒနာ',
    'အဝါရောင်',
    'အဝေးပြေးဂိတ်',
    'ဝက်သား',
    'ဝတ်ရုံ',
    'ဝန်ကြီး',
    'ဝိညာဉ်',
    'ဝါးတံတား',
    'ဝမ်းသာပါတယ်',
    'ဝန်ဆောင်ခ',
    'အဝတ်အထည်',
  ];
  for (const word of burmeseWaWords) {
    const res = convertBurmeseDigits(word);
    assert(res === word, `Preserves lexical word with Wa "${word}" without converting to digit 0`);
  }

  // Mixed paragraph testing
  const paragraph = 'ဝယ်သူ ၅ ဦးအတွက် ဝတ်စုံ ၂ဝ စုံ ပို့ဆောင်ခ ၃,ဝဝဝ ကျပ် (ဖုန်း ဝ၉-၇၉၈၇၆၅၄၃၂)';
  const convertedPara = convertBurmeseDigits(paragraph);
  assert(convertedPara.includes('ဝယ်သူ 5 ဦးအတွက်'), 'Converts ၅ to 5 while preserving ဝယ်သူ');
  assert(convertedPara.includes('ဝတ်စုံ 20 စုံ'), 'Converts ၂ဝ to 20 while preserving ဝတ်စုံ');
  assert(convertedPara.includes('3,000 ကျပ်'), 'Converts ၃,ဝဝဝ to 3,000');
  assert(convertedPara.includes('09-798765432'), 'Converts ဝ၉ to 09');

  // -------------------------------------------------------------------------
  // 3. ADVANCED PHONE NUMBER NORMALIZATION
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Advanced Phone Number Normalization ---');

  const phoneCases: [string, string][] = [
    // [Input, Expected]
    ['09798765432', '09798765432'],
    ['+959798765432', '09798765432'],
    ['+95 9 798 765 432', '09798765432'],
    ['+95-9-798-765-432', '09798765432'],
    ['00959798765432', '09798765432'],
    ['959798765432', '09798765432'],
    ['9798765432', '09798765432'],
    ['(09) 798-765-432', '09798765432'],
    ['၀၉၇၉၈၇၆၅၄၃၂', '09798765432'],
    ['၀၉-၇၉၈-၇၆၅-၄၃၂', '09798765432'],
    ['ဝ၉၇၉၈၇၆၅၄၃၂', '09798765432'],
    ['ဝ၉ ၄၅ဝဝ ၁၁၂၂၃', '09450011223'],
    ['ဝ၉-၄၅ဝဝ-၁၁၂၂၃', '09450011223'],
    ['๐၉၂၅၀၀၉၉၈၈၇', '09250099887'],
    ['႐႙၇၉၈၇၆၅၄၃၂', '09798765432'],
    ['+၉၅၉၇၉၈၇၆၅၄၃၂', '09798765432'],
    ['092012345', '092012345'],
    ['0945001122', '0945001122'],
    ['09450011223', '09450011223'],
  ];

  for (const [inp, exp] of phoneCases) {
    const res = normalizeMyanmarPhone(inp);
    assert(res === exp, `Phone "${inp}" normalizes to "${exp}"`, `got "${res}"`);
  }

  // Invalid phones should return empty string
  const invalidPhones = [
    '',
    '   ',
    'hello world',
    '12345',
    '01234567', // Yangon landline (not mobile)
    '+14155552671', // US number
    '09-123', // Too short
    '09-12345678901234', // Too long
  ];
  for (const inv of invalidPhones) {
    const res = normalizeMyanmarPhone(inv);
    assert(res === '', `Invalid phone "${inv}" returns empty string`, `got "${res}"`);
  }

  // -------------------------------------------------------------------------
  // 4. DIACRITIC CANONICALIZATION & DEDUPLICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Diacritic Canonicalization & Deduplication ---');

  assert(canonicalizeUnicodeDiacritics('ပြီးးးး') === 'ပြီး', 'Deduplicates multiple Visargas');
  assert(canonicalizeUnicodeDiacritics('တဲ့့့့') === 'တဲ့', 'Deduplicates multiple Dot Belows');
  assert(canonicalizeUnicodeDiacritics('စမ်း\u1038\u1037') === 'စမ်း\u1037\u1038', 'Reorders Visarga before Dot Below');

  // -------------------------------------------------------------------------
  // 5. 61-ENTRY LOGISTICS MATRIX INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Full 61-Entry Logistics Matrix Integrity ---');

  assert(MYANMAR_DELIVERY_MATRIX.length === 61, `Matrix has exact 61 entries, found ${MYANMAR_DELIVERY_MATRIX.length}`);

  // Test every entry lookup in English and Burmese
  let allFoundEn = true;
  let allFoundMm = true;
  let feesReasonable = true;

  for (const entry of MYANMAR_DELIVERY_MATRIX) {
    const byEn = lookupTownshipDelivery(entry.nameEn);
    if (!byEn || byEn.nameEn !== entry.nameEn) {
      allFoundEn = false;
      console.error(`Failed to lookup by nameEn: ${entry.nameEn}`);
    }

    const byMm = lookupTownshipDelivery(entry.nameMm);
    if (!byMm || byMm.nameEn !== entry.nameEn) {
      allFoundMm = false;
      console.error(`Failed to lookup by nameMm: ${entry.nameMm}`);
    }

    if (entry.standardFeeMmk < 2000 || entry.standardFeeMmk > 10000) {
      feesReasonable = false;
      console.error(`Unreasonable delivery fee for ${entry.nameEn}: ${entry.standardFeeMmk}`);
    }
  }

  assert(allFoundEn, 'All 61 entries successfully looked up by English name');
  assert(allFoundMm, 'All 61 entries successfully looked up by Burmese name');
  assert(feesReasonable, 'All delivery fees in realistic range (2,000 - 10,000 MMK)');

  // Regional breakdown
  const yangon = MYANMAR_DELIVERY_MATRIX.filter((e) => e.region === 'Yangon');
  const mandalay = MYANMAR_DELIVERY_MATRIX.filter((e) => e.region === 'Mandalay');
  const naypyitaw = MYANMAR_DELIVERY_MATRIX.filter((e) => e.region === 'Naypyitaw');
  const regional = MYANMAR_DELIVERY_MATRIX.filter((e) => e.region === 'State/Region');

  assert(yangon.length === 34, `Yangon count is 34, got ${yangon.length}`);
  assert(mandalay.length === 7, `Mandalay count is 7, got ${mandalay.length}`);
  assert(naypyitaw.length === 6, `Naypyitaw count is 6, got ${naypyitaw.length}`);
  assert(regional.length === 14, `State/Region count is 14 (11 cities + 3 bus gates), got ${regional.length}`);

  // Bus gate drop-off and regional prepaid rules
  assert(isRegionalPrepaidOnly('အောင်မင်္ဂလာ အဝေးပြေးဂိတ်') === true, 'Aung Mingalar Bus Gate enforces Prepaid Only');
  assert(isRegionalPrepaidOnly('ဒဂုံဧရာ အဝေးပြေးဂိတ်') === true, 'Dagon Ayeyar Bus Gate enforces Prepaid Only');
  assert(isRegionalPrepaidOnly('စော်ဘွားကြီးကုန်း ကားဂိတ်') === true, 'Saw Bwar Gyi Gone Bus Gate enforces Prepaid Only');
  assert(isRegionalPrepaidOnly('Taunggyi') === true, 'Taunggyi enforces Prepaid Only');
  assert(isRegionalPrepaidOnly('Sittwe') === true, 'Sittwe enforces Prepaid Only');
  assert(isRegionalPrepaidOnly('Myitkyina') === true, 'Myitkyina enforces Prepaid Only');

  assert(isRegionalPrepaidOnly('Kyauktada') === false, 'Kyauktada (Yangon) allows COD');
  assert(isRegionalPrepaidOnly('Chanayethazan') === false, 'Chanayethazan (Mandalay) allows COD');
  assert(isRegionalPrepaidOnly('Zabuthiri') === false, 'Zabuthiri (Naypyitaw) allows COD');

  // Substring collision defenses
  const dagonMatch = lookupTownshipDelivery('ဒဂုံ');
  assert(dagonMatch?.nameEn === 'Dagon' && dagonMatch.standardFeeMmk === 2500, 'Exact "ဒဂုံ" resolves to Downtown Dagon (2,500 MMK)');

  const myaukDagonMatch = lookupTownshipDelivery('ဒဂုံမြို့သစ်မြောက်ပိုင်း');
  assert(myaukDagonMatch?.nameEn === 'North Dagon' && myaukDagonMatch.standardFeeMmk === 3500, '"ဒဂုံမြို့သစ်မြောက်ပိုင်း" resolves to North Dagon (3,500 MMK)');

  const taungDagonMatch = lookupTownshipDelivery('ဒဂုံမြို့သစ်တောင်ပိုင်း');
  assert(taungDagonMatch?.nameEn === 'South Dagon' && taungDagonMatch.standardFeeMmk === 3500, '"ဒဂုံမြို့သစ်တောင်ပိုင်း" resolves to South Dagon (3,500 MMK)');

  const ashaeDagonMatch = lookupTownshipDelivery('ဒဂုံမြို့သစ်အရှေ့ပိုင်း');
  assert(ashaeDagonMatch?.nameEn === 'East Dagon' && ashaeDagonMatch.standardFeeMmk === 4000, '"ဒဂုံမြို့သစ်အရှေ့ပိုင်း" resolves to East Dagon (4,000 MMK)');

  // Non-existent location lookups
  assert(lookupTownshipDelivery('Bangkok') === null, 'Lookup "Bangkok" returns null');
  assert(lookupTownshipDelivery('Singapore') === null, 'Lookup "Singapore" returns null');
  assert(lookupTownshipDelivery('RandomLocation123') === null, 'Lookup "RandomLocation123" returns null');

  // -------------------------------------------------------------------------
  // 6. CONTRACT ALIASES AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Interface Contract Dual Aliases ---');

  const testLocation = lookupTownshipDelivery('Bahan');
  assert(testLocation !== null, 'Lookup Bahan succeeds');
  if (testLocation) {
    assert(testLocation.nameEn === 'Bahan', 'Has canonical nameEn');
    assert(testLocation.townshipEn === 'Bahan', 'Has contract townshipEn');
    assert(testLocation.nameMm === 'ဗဟန်း', 'Has canonical nameMm');
    assert(testLocation.townshipMm === 'ဗဟန်း', 'Has contract townshipMm');
    assert(testLocation.standardFeeMmk === 2500, 'Has canonical standardFeeMmk');
    assert(testLocation.feeMmk === 2500, 'Has contract feeMmk');
    assert(testLocation.codAvailable === true, 'Has canonical codAvailable');
    assert(testLocation.isCodAvailable === true, 'Has contract isCodAvailable');
    assert(typeof testLocation.estDays === 'string', 'Has canonical estDays');
    assert(typeof testLocation.estimatedDays === 'string', 'Has contract estimatedDays');
  }

  console.log('\n================================================================');
  console.log(`FORENSIC AUDIT TOTAL PROBES: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runForensicAuditProbe().catch((err) => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
