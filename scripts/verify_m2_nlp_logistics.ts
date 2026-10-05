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
  correctWaInNumericContext,
  canonicalizeUnicodeDiacritics,
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
  assert(!isZawgyi('ကျေးဇူးတင်ပါတယ်'), 'Unicode "ကျေးဇူးတင်ပါတယ်" detected as Unicode');
  assert(!isZawgyi('ချက်ချင်း ပို့ပေးပါ'), 'Unicode "ချက်ချင်း" detected as Unicode');
  assert(!isZawgyi('တက္ကသိုလ်ရိပ်သာလမ်း'), 'Unicode "တက္ကသိုလ်" detected as Unicode');
  assert(!isZawgyi('Hello, how much is this?'), 'English text detected as non-Zawgyi');
  assert(!isZawgyi(''), 'Empty string returns false');
  assert(!isZawgyi('   '), 'Whitespace returns false');

  // Zawgyi samples MUST be detected as Zawgyi
  assert(isZawgyi('ေစ်းဘယ္ေလာက္လဲ'), 'Zawgyi "ေစ်းဘယ္ေလာက္လဲ" detected as Zawgyi');
  assert(isZawgyi('စမ္းေခ်ာင္း ပို့ခ'), 'Zawgyi "စမ္းေခ်ာင္း" detected as Zawgyi');
  assert(isZawgyi('ေရာင္းမည္'), 'Zawgyi "ေရာင္းမည္" detected as Zawgyi');
  assert(isZawgyi('မဂၤလာပါ'), 'Zawgyi Kinzi "မဂၤလာပါ" detected as Zawgyi');
  assert(isZawgyi('ပစၥည္းရွိလား'), 'Zawgyi "ပစၥည္းရွိလား" detected as Zawgyi');

  // Conversion fidelity
  assert(normalizeBurmese('ေစ်းဘယ္ေလာက္လဲ') === 'ဈေးဘယ်လောက်လဲ', 'Converts Zawgyi "ေစ်းဘယ္ေလာက္လဲ" to Unicode "ဈေးဘယ်လောက်လဲ"');
  assert(normalizeBurmese('စမ္းေခ်ာင္း ပို့ခ') === 'စမ်းချောင်း ပို့ခ', 'Converts Zawgyi "စမ္းေခ်ာင္း" to Unicode "စမ်းချောင်း"');
  assert(normalizeBurmese('ေရာင္းမည္') === 'ရောင်းမည်', 'Converts visual E-vowel order "ေရာင္းမည္" to "ရောင်းမည်"');
  assert(normalizeBurmese('မဂၤလာပါ') === 'မင်္ဂလာပါ', 'Converts Zawgyi Kinzi "မဂၤလာပါ" to Unicode "မင်္ဂလာပါ"');
  assert(normalizeBurmese('ပစၥည္းရွိလား') === 'ပစ္စည်းရှိလား', 'Converts Zawgyi "ပစၥည္းရွိလား" to Unicode "ပစ္စည်းရှိလား"');
  
  // Preservation of English and Mixed Burglish
  const burglish = 'Serum 1 bottle Sanchaung deli bl lout ll?';
  assert(normalizeBurmese(burglish) === burglish, 'Preserves mixed English and Burglish without corruption');

  // Idempotency and Ya-pin preservation
  assert(normalizeBurmese('ကျေးဇူးတင်ပါတယ်') === 'ကျေးဇူးတင်ပါတယ်', 'Preserves Unicode Ya-pin in "ကျေးဇူးတင်ပါတယ်"');
  assert(normalizeBurmese('ချက်ချင်း') === 'ချက်ချင်း', 'Preserves Unicode Ya-pin in "ချက်ချင်း"');
  assert(normalizeBurmese('ပျော်ရွှင်') === 'ပျော်ရွှင်', 'Preserves Unicode Ya-pin in "ပျော်ရွှင်"');

  // ----------------------------------------------------------------------------
  // SUITE 2: Burmese Numerals, Thai Zero & Wa vs Zero Corrections
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Burmese Numerals, Thai Zero & Wa vs Zero ---');

  // Burmese Digits conversion
  assert(convertBurmeseDigits('၀၁၂၃၄၅၆၇၈၉') === '0123456789', 'Converts all Burmese numerals ၀-၉ to 0-9');
  assert(convertBurmeseDigits('၂၈၀၀၀ ကျပ်') === '28000 ကျပ်', 'Converts price string "၂၈၀၀၀ ကျပ်" to "28000 ကျပ်"');
  assert(convertBurmeseDigits('အရေအတွက် ၃ ခု') === 'အရေအတွက် 3 ခု', 'Converts quantity "၃ ခု" to "3 ခု"');
  assert(convertBurmeseDigits('၁2၃4၅') === '12345', 'Converts mixed Burmese and ASCII digits');

  // Shan digits conversion
  assert(convertBurmeseDigits('႐႑႒႓႔႕႖႗႘႙') === '0123456789', 'Converts Shan numerals ႐-႙ to 0-9');

  // Thai Zero conversion
  assert(convertBurmeseDigits('๐၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Converts Thai zero ๐ to 0');

  // Contextual Wa (ဝ) vs Zero (၀)
  assert(convertBurmeseDigits('ဝ၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Converts leading letter Wa in phone "ဝ၉..." to "09..."');
  assert(convertBurmeseDigits('Ph: ဝ၉-၄၅၁၁၂၂၃၃၄') === 'Ph: 09-451122334', 'Converts phone prefix "ဝ၉" in "Ph: ဝ၉-..."');
  assert(convertBurmeseDigits('09-4ဝဝ-11223') === '09-400-11223', 'Converts embedded letter Wa in numeric string "4ဝဝ" to "400"');
  assert(convertBurmeseDigits('၁ဝ,ဝဝဝ') === '10,000', 'Converts letter Wa with comma "၁ဝ,ဝဝဝ" to "10,000"');
  assert(convertBurmeseDigits('5ဝ0') === '500', 'Converts "5ဝ0" to "500"');
  assert(convertBurmeseDigits('၂ဝ') === '20', 'Converts "၂ဝ" to "20"');
  
  // CRITICAL: Consonant Wa in Burmese vocabulary words MUST NOT be converted to 0
  assert(convertBurmeseDigits('ဝယ်မယ်') === 'ဝယ်မယ်', 'Preserves lexical word "ဝယ်မယ်" (does not corrupt to "0ယ်မယ်")');
  assert(convertBurmeseDigits('ဝတ်စုံ') === 'ဝတ်စုံ', 'Preserves lexical word "ဝတ်စုံ" (does not corrupt to "0တ်စုံ")');
  assert(convertBurmeseDigits('အဝတ်အစား') === 'အဝတ်အစား', 'Preserves lexical word "အဝတ်အစား"');
  assert(convertBurmeseDigits('ဝေဒနာ') === 'ဝေဒနာ', 'Preserves lexical word "ဝေဒနာ"');
  assert(convertBurmeseDigits('အဝါရောင်') === 'အဝါရောင်', 'Preserves lexical word "အဝါရောင်"');
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
  assert(normalizeMyanmarPhone('092012345') === '092012345', 'Normalizes 9-digit mobile number');
  assert(normalizeMyanmarPhone('0945001122') === '0945001122', 'Normalizes 10-digit mobile number');

  // Missing leading zero (9xxxxxxxxx)
  assert(normalizeMyanmarPhone('9798765432') === '09798765432', 'Prepends leading 0 for "9798765432"');
  assert(normalizeMyanmarPhone('9-798-765-432') === '09798765432', 'Normalizes "9-798-765-432"');

  // International formats
  assert(normalizeMyanmarPhone('+959798765432') === '09798765432', 'Normalizes "+959" prefix to "09"');
  assert(normalizeMyanmarPhone('+95 9 798 765 432') === '09798765432', 'Normalizes spaced "+95 9" to "09"');
  assert(normalizeMyanmarPhone('+95-9-798-765-432') === '09798765432', 'Normalizes hyphenated "+95-9" to "09"');
  assert(normalizeMyanmarPhone('959798765432') === '09798765432', 'Normalizes "959" prefix to "09"');
  assert(normalizeMyanmarPhone('00959798765432') === '09798765432', 'Normalizes "00959" prefix to "09"');
  assert(normalizeMyanmarPhone('+9509798765432') === '09798765432', 'Normalizes "+9509" to "09"');

  // Burmese numerals in phone
  assert(normalizeMyanmarPhone('၀၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Normalizes Burmese digits "၀၉၇၉၈၇၆၅၄၃၂" to "09798765432"');
  assert(normalizeMyanmarPhone('+၉၅၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Normalizes international Burmese digits "+၉၅၉..." to "09..."');
  assert(normalizeMyanmarPhone('၀၉-၇၉၈-၇၆၅-၄၃၂') === '09798765432', 'Normalizes formatted Burmese digits "၀၉-၇၉၈-..."');
  assert(normalizeMyanmarPhone('၀၉-၄၅၀၀-၁၁၂၂၃') === '09450011223', 'Normalizes hyphenated Burmese digits');

  // Typo corrections in phone
  assert(normalizeMyanmarPhone('ဝ၉၇၉၈၇၆၅၄၃၂') === '09798765432', 'Corrects letter Wa typo in phone "ဝ၉..."');
  assert(normalizeMyanmarPhone('ဝ၉-၄၅၁၁၂၂၃၃၄') === '09451122334', 'Corrects letter Wa typo in "ဝ၉-၄၅..."');
  assert(normalizeMyanmarPhone('ဝ၉-၄၅၀၀-၁၁၂၂၃') === '09450011223', 'Corrects letter Wa typo and Burmese digits combined');
  assert(normalizeMyanmarPhone('๐၉၂၅၀၀၉၉၈၈၇') === '09250099887', 'Corrects Thai zero in phone "๐၉..."');
  assert(normalizeMyanmarPhone('႐႙၇၉၈၇၆၅၄၃၂') === '09798765432', 'Normalizes Shan digits in phone');

  // Conversational text stripping
  assert(normalizeMyanmarPhone('Ph: 09 798 765 432') === '09798765432', 'Cleans "Ph:" prefix');
  assert(normalizeMyanmarPhone('ဖုန်း - 09.798.765.432') === '09798765432', 'Cleans Burmese phone prefix');

  // Invalid phone inputs
  assert(normalizeMyanmarPhone('') === '', 'Empty phone returns empty string');
  assert(normalizeMyanmarPhone('hello') === '', 'Non-phone string returns empty string');
  assert(normalizeMyanmarPhone('12345') === '', 'Short digits return empty string');

  // ----------------------------------------------------------------------------
  // SUITE 4: Canonical Diacritic Ordering and Deduplication
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Canonical Diacritics ---');
  assert(canonicalizeUnicodeDiacritics('ပြီးး') === 'ပြီး', 'Deduplicates double Visarga "ပြီးး" -> "ပြီး"');
  assert(canonicalizeUnicodeDiacritics('တဲ့့') === 'တဲ့', 'Deduplicates double Dot Below "တဲ့့" -> "တဲ့"');
  assert(canonicalizeUnicodeDiacritics('ကားး') === 'ကား', 'Deduplicates "ကားး" -> "ကား"');
  assert(canonicalizeUnicodeDiacritics('စမ်း\u1038\u1037') === 'စမ်း\u1037\u1038', 'Reorders Visarga before Dot Below');
  assert(canonicalizeUnicodeDiacritics('န\u1037\u1032') === 'န\u1032\u1037', 'Reorders Dot Below before Ai');

  // ----------------------------------------------------------------------------
  // SUITE 5: 58-Township Delivery Matrix & COD / Bus Gate Enforcement
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 5: 58-Township Delivery Matrix & COD Enforcement ---');

  // Verify full matrix count (at least 58 townships + 3 highway gates = 61 entries)
  assert(MYANMAR_DELIVERY_MATRIX.length >= 61, `Delivery matrix contains ${MYANMAR_DELIVERY_MATRIX.length} verified locations (>= 61 required)`);

  const yangonEntries = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Yangon');
  assert(yangonEntries.length === 34, `Yangon has exactly 34 townships, got ${yangonEntries.length}`);

  const mdyEntries = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Mandalay');
  assert(mdyEntries.length === 7, `Mandalay has exactly 7 townships, got ${mdyEntries.length}`);
  assert(mdyEntries.every((t) => t.codAvailable === true), 'All Mandalay townships support COD');

  const nptEntries = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Naypyitaw');
  assert(nptEntries.length === 6, `Naypyitaw has exactly 6 townships, got ${nptEntries.length}`);
  assert(nptEntries.every((t) => t.codAvailable === true), 'All Naypyitaw townships support COD');

  const regionalEntries = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'State/Region');
  assert(regionalEntries.length === 14, `State/Region has exactly 14 locations (11 cities + 3 bus gates), got ${regionalEntries.length}`);
  assert(regionalEntries.every((t) => t.codAvailable === false), 'All State/Region & Bus Gates enforce COD: false (Prepaid Only)');

  // Yangon Downtown (2,500 MMK, COD: true)
  const sanchaung = lookupTownshipDelivery('Sanchaung');
  assert(sanchaung !== null && sanchaung.standardFeeMmk === 2500, 'Sanchaung delivery fee is 2,500 MMK');
  assert(sanchaung?.codAvailable === true, 'Sanchaung supports COD');
  assert(sanchaung?.region === 'Yangon', 'Sanchaung belongs to Yangon region');
  assert(isRegionalPrepaidOnly('Sanchaung') === false, 'Sanchaung is not prepaid-only');

  const kyauktadaMm = lookupTownshipDelivery('ကျောက်တံတား');
  assert(kyauktadaMm !== null && kyauktadaMm.standardFeeMmk === 2500, 'Burmese query "ကျောက်တံတား" fee is 2,500 MMK');
  assert(kyauktadaMm?.codAvailable === true, 'Kyauktada supports COD');

  // Substring hijacking prevention: Dagon vs North Dagon vs East Dagon
  const dagon = lookupTownshipDelivery('Dagon');
  assert(dagon !== null && dagon.nameEn === 'Dagon' && dagon.standardFeeMmk === 2500, 'Query "Dagon" matches Downtown Dagon (2,500 MMK)');

  const northDagon = lookupTownshipDelivery('North Dagon');
  assert(northDagon?.nameEn === 'North Dagon' && northDagon?.standardFeeMmk === 3500 && northDagon?.codAvailable === true, 'North Dagon fee is 3,500 MMK with COD');

  const eastDagon = lookupTownshipDelivery('East Dagon');
  assert(eastDagon?.nameEn === 'East Dagon' && eastDagon?.standardFeeMmk === 4000, 'East Dagon fee is 4,000 MMK');

  const myaukDagonMm = lookupTownshipDelivery('မြောက်ဒဂုံ');
  assert(myaukDagonMm?.nameEn === 'North Dagon' && myaukDagonMm?.standardFeeMmk === 3500, 'Colloquial "မြောက်ဒဂုံ" resolves to North Dagon (3,500 MMK)');

  // Substring hijacking prevention: Pathein vs Patheingyi
  const patheingyi = lookupTownshipDelivery('Patheingyi');
  assert(patheingyi?.nameEn === 'Patheingyi' && patheingyi?.region === 'Mandalay' && patheingyi?.codAvailable === true, 'Query "Patheingyi" matches Mandalay (COD: true)');

  const patheingyiMm = lookupTownshipDelivery('ပုသိမ်ကြီး');
  assert(patheingyiMm?.nameEn === 'Patheingyi' && patheingyiMm?.region === 'Mandalay', 'Burmese "ပုသိမ်ကြီး" matches Mandalay Patheingyi');

  const pathein = lookupTownshipDelivery('Pathein');
  assert(pathein?.nameEn === 'Pathein' && pathein?.region === 'State/Region' && pathein?.codAvailable === false, 'Query "Pathein" matches Ayeyarwady Pathein (COD: false)');

  // Yangon Outer Suburbs (3,000 to 5,000 MMK, COD: true)
  const mayangone = lookupTownshipDelivery('Mayangone');
  assert(mayangone?.standardFeeMmk === 3000, 'Mayangone fee is 3,000 MMK');

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

  const taunggyiMm = lookupTownshipDelivery('တောင်ကြီး');
  assert(taunggyiMm?.codAvailable === false, 'တောင်ကြီး COD is false');
  assert(isRegionalPrepaidOnly('တောင်ကြီး') === true, 'isRegionalPrepaidOnly("တောင်ကြီး") returns true');

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

  const sawBwarGyiGone = lookupTownshipDelivery('Saw Bwar Gyi Gone Bus Gate');
  assert(sawBwarGyiGone?.standardFeeMmk === 3500 && sawBwarGyiGone?.codAvailable === false, 'Saw Bwar Gyi Gone fee is 3,500 MMK with COD: false');

  // Edge cases & unknown locations
  assert(lookupTownshipDelivery('Tokyo') === null, 'Unknown location returns null');
  assert(lookupTownshipDelivery('') === null, 'Empty string returns null');

  // ----------------------------------------------------------------------------
  // SUITE 6: Downstream Contract Compatibility (Dual Aliases)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Downstream Contract Compatibility ---');

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
