/**
 * Independent Forensic Auditor Probe for Milestone 2 Iteration 2
 * Author: auditor_m2_it2
 * 
 * Conducts independent, non-prepopulated empirical tests on:
 * 1. Burmese NLP and Diacritic Normalization
 * 2. Digit and Phone Normalization with Lexical Wa Preservation
 * 3. 61-Entry Townships Matrix and Policy Enforcement
 * 4. Substring Collision Resolution (Naypyitaw vs Pyay, Dagon cluster, Pathein vs Patheingyi)
 * 5. Zero-Chat Database Storage Invariant
 */

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
} from '../src/lib/myanmar-townships';

import { MultiTenantDB } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failedTests++;
  }
}

async function runAuditorProbe() {
  console.log('================================================================');
  console.log('AUDITOR M2 IT2 INDEPENDENT FORENSIC VERIFICATION PROBE');
  console.log('================================================================\n');

  // ----------------------------------------------------------------------------
  // SECTION 1: Burmese NLP Novel Test Cases
  // ----------------------------------------------------------------------------
  console.log('--- SECTION 1: Burmese NLP Novel Test Cases ---');

  // Novel Zawgyi phrases
  const zg1 = 'စမ္းေခ်ာင္း ပို့ခ ေမးျမန္းျခင္း';
  assert(isZawgyi(zg1), 'Novel Zawgyi string detected as Zawgyi');
  const norm1 = normalizeBurmese(zg1);
  assert(norm1.includes('စမ်းချောင်း'), `Normalized includes စမ်းချောင်း: "${norm1}"`);
  assert(norm1.includes('မေးမြန်းခြင်း'), `Normalized includes မေးမြန်းခြင်း: "${norm1}"`);

  const zg2 = 'ေရာင္းမည့္ ပစၥည္း စာရင္း';
  assert(isZawgyi(zg2), 'Zawgyi string detected as Zawgyi');
  const norm2 = normalizeBurmese(zg2);
  assert(norm2.includes('ရောင်းမည်'), `Normalized includes ရောင်းမည်: "${norm2}"`);
  assert(norm2.includes('ပစ္စည်း'), `Normalized includes ပစ္စည်း: "${norm2}"`);

  // Unspaced Zawgyi
  const zg3 = 'ေရာက္ပီလား တင္မယ္';
  assert(isZawgyi(zg3), 'Unspaced Zawgyi detected as Zawgyi');
  const norm3 = normalizeBurmese(zg3);
  assert(norm3.includes('ရောက်'), `Converted unspaced Zawgyi: "${norm3}"`);
  assert(norm3.includes('တင်မယ်'), `Converted unspaced Zawgyi: "${norm3}"`);

  // Capital Naypyitaw Zawgyi
  const zg4 = 'ေနျပည္ေတာ္';
  assert(isZawgyi(zg4), 'Naypyitaw Zawgyi detected as Zawgyi');
  const norm4 = normalizeBurmese(zg4);
  assert(norm4 === 'နေပြည်တော်', `Converted Naypyitaw Zawgyi: "${norm4}"`);

  // Complex diacritics deduplication
  const dup1 = canonicalizeUnicodeDiacritics('ကားးကြီးး');
  assert(dup1 === 'ကားကြီး', `Deduplicated complex diacritics: "${dup1}"`);

  // ----------------------------------------------------------------------------
  // SECTION 2: Numerals, Phone and Lexical Wa Disambiguation
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Numerals, Phone and Lexical Wa Disambiguation ---');

  // Thai zero mixed with Burmese digits
  const thaiMixed = '๐၉-၂၅ဝ-11223';
  assert(normalizeMyanmarPhone(thaiMixed) === '0925011223', `Normalizes Thai zero phone "${thaiMixed}"`);

  // Lexical sentence with phone
  const sentence = 'ဝယ်သူဖုန်း ဝ၉-၇၉၈-၇၆၅-၄၃၂ ဖြစ်ပြီး အဝတ်အစား ဝယ်မည်';
  const digitsConverted = convertBurmeseDigits(sentence);
  assert(digitsConverted.includes('09-798-765-432'), `Converted phone inside sentence: "${digitsConverted}"`);
  assert(digitsConverted.includes('ဝယ်သူ'), `Preserved lexical ဝယ်သူ: "${digitsConverted}"`);
  assert(digitsConverted.includes('အဝတ်အစား'), `Preserved lexical အဝတ်အစား: "${digitsConverted}"`);
  assert(digitsConverted.includes('ဝယ်မည်'), `Preserved lexical ဝယ်မည်: "${digitsConverted}"`);

  // Price formatting
  const price1 = '၂,၅ဝဝ ကျပ်';
  assert(convertBurmeseDigits(price1) === '2,500 ကျပ်', `Price conversion: "${convertBurmeseDigits(price1)}"`);

  // ----------------------------------------------------------------------------
  // SECTION 3: 61-Township Matrix and Policy Invariants
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 3: 61-Township Matrix and Policy Invariants ---');

  assert(MYANMAR_DELIVERY_MATRIX.length === 61, `Matrix length exactly 61 (got ${MYANMAR_DELIVERY_MATRIX.length})`);

  let allNameEnMatch = true;
  let allNameMmMatch = true;
  let allContractsConform = true;
  let allPolicyAccurate = true;

  for (const item of MYANMAR_DELIVERY_MATRIX) {
    const resEn = lookupTownshipDelivery(item.nameEn);
    if (!resEn || resEn.nameEn !== item.nameEn) {
      allNameEnMatch = false;
      console.error(`Mismatch on English name lookup: ${item.nameEn}`);
    }

    const resMm = lookupTownshipDelivery(item.nameMm);
    if (!resMm || resMm.nameMm !== item.nameMm) {
      allNameMmMatch = false;
      console.error(`Mismatch on Burmese name lookup: ${item.nameMm}`);
    }

    // Verify dual-aliased contract
    if (
      resEn?.townshipEn !== item.nameEn ||
      resEn?.townshipMm !== item.nameMm ||
      resEn?.feeMmk !== item.standardFeeMmk ||
      resEn?.isCodAvailable !== item.codAvailable ||
      resEn?.estimatedDays !== item.estDays
    ) {
      allContractsConform = false;
      console.error(`Contract mismatch on ${item.nameEn}`);
    }

    // Verify policy
    const isPrepaid = isRegionalPrepaidOnly(item.nameEn);
    const expectedPrepaid = !item.codAvailable;
    if (isPrepaid !== expectedPrepaid) {
      allPolicyAccurate = false;
      console.error(`Policy mismatch on ${item.nameEn}: expected ${expectedPrepaid}, got ${isPrepaid}`);
    }
  }

  assert(allNameEnMatch, 'All 61 locations resolve cleanly by nameEn');
  assert(allNameMmMatch, 'All 61 locations resolve cleanly by nameMm');
  assert(allContractsConform, 'All 61 locations expose dual-aliased PROJECT.md fields');
  assert(allPolicyAccurate, 'isRegionalPrepaidOnly matches codAvailable across all 61 locations');

  // ----------------------------------------------------------------------------
  // SECTION 4: Substring Collision and Resolution Stress Tests
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Substring Collision and Resolution Stress Tests ---');

  // Naypyitaw vs Pyay
  const nptExact = lookupTownshipDelivery('နေပြည်တော်');
  assert(nptExact?.nameEn === 'Zabuthiri', `နေပြည်တော် resolves to Zabuthiri (got ${nptExact?.nameEn})`);
  assert(nptExact?.standardFeeMmk === 4000, `နေပြည်တော် fee is 4000 MMK (got ${nptExact?.standardFeeMmk})`);
  assert(nptExact?.codAvailable === true, `နေပြည်တော် supports COD`);
  assert(!isRegionalPrepaidOnly('နေပြည်တော်'), `isRegionalPrepaidOnly("နေပြည်တော်") is false`);

  const nptCity = lookupTownshipDelivery('နေပြည်တော်မြို့');
  assert(nptCity?.nameEn === 'Zabuthiri', `နေပြည်တော်မြို့ resolves to Zabuthiri`);

  const pyayExact = lookupTownshipDelivery('ပြည်');
  assert(pyayExact?.nameEn === 'Pyay', `ပြည် resolves to Pyay (got ${pyayExact?.nameEn})`);
  assert(pyayExact?.standardFeeMmk === 4500, `ပြည် fee is 4500 MMK`);
  assert(pyayExact?.codAvailable === false, `ပြည် is 100% Prepaid (COD false)`);
  assert(isRegionalPrepaidOnly('ပြည်'), `isRegionalPrepaidOnly("ပြည်") is true`);

  const pyayCity = lookupTownshipDelivery('ပြည်မြို့');
  assert(pyayCity?.nameEn === 'Pyay', `ပြည်မြို့ resolves to Pyay`);

  // Dagon Cluster Disambiguation
  assert(lookupTownshipDelivery('Dagon')?.nameEn === 'Dagon', 'Dagon resolves to Downtown Dagon');
  assert(lookupTownshipDelivery('North Dagon')?.nameEn === 'North Dagon', 'North Dagon resolves to North Dagon');
  assert(lookupTownshipDelivery('South Dagon')?.nameEn === 'South Dagon', 'South Dagon resolves to South Dagon');
  assert(lookupTownshipDelivery('East Dagon')?.nameEn === 'East Dagon', 'East Dagon resolves to East Dagon');
  assert(lookupTownshipDelivery('Dagon Seikkan')?.nameEn === 'Dagon Seikkan', 'Dagon Seikkan resolves to Dagon Seikkan');
  assert(lookupTownshipDelivery('Dagon Ayeyar')?.nameEn === 'Dagon Ayeyar Highway Bus Terminal', 'Dagon Ayeyar resolves to Bus Terminal');
  assert(lookupTownshipDelivery('Dagon Ayeyar')?.codAvailable === false, 'Dagon Ayeyar enforces COD: false');

  // Pathein vs Patheingyi Disambiguation
  assert(lookupTownshipDelivery('Pathein')?.nameEn === 'Pathein', 'Pathein resolves to Regional Pathein');
  assert(lookupTownshipDelivery('Pathein')?.region === 'State/Region', 'Pathein region is State/Region');
  assert(lookupTownshipDelivery('Patheingyi')?.nameEn === 'Patheingyi', 'Patheingyi resolves to Mandalay Patheingyi');
  assert(lookupTownshipDelivery('Patheingyi')?.region === 'Mandalay', 'Patheingyi region is Mandalay');

  // ----------------------------------------------------------------------------
  // SECTION 5: Zero-Chat Database Invariant Verification
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Zero-Chat Database Invariant Verification ---');

  const testDb = new MultiTenantDB();
  assert((testDb as any).conversations === undefined, 'MultiTenantDB has no conversations table');
  assert((testDb as any).messages === undefined, 'MultiTenantDB has no messages table');
  assert((testDb as any).chat_logs === undefined, 'MultiTenantDB has no chat_logs table');
  assert((testDb as any).getConversations === undefined, 'MultiTenantDB has no getConversations method');
  assert((testDb as any).getMessages === undefined, 'MultiTenantDB has no getMessages method');

  // Inspect data/db.json
  const dbFile = path.join(process.cwd(), 'data', 'db.json');
  if (fs.existsSync(dbFile)) {
    const rawData = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
    const keys = Object.keys(rawData).sort();
    assert(
      JSON.stringify(keys) === JSON.stringify(['channels', 'orders', 'products', 'shops']),
      'data/db.json contains strictly 4 root keys (shops, products, channels, orders)'
    );
  }

  // Summary
  console.log('\n================================================================');
  console.log(`TOTAL AUDITOR PROBES : ${totalTests}`);
  console.log(`PASSED               : ${passedTests}`);
  console.log(`FAILED               : ${failedTests}`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAuditorProbe();
