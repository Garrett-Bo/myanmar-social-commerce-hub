/**
 * Challenger Deep Probe: Empirical Verification of Myanmar Townships & Delivery Policies
 * Agent: challenger_m2_it2_2 (teamwork_preview_challenger)
 */

import {
  lookupTownshipDelivery,
  isRegionalPrepaidOnly,
  MYANMAR_DELIVERY_MATRIX,
  TownshipDeliveryInfo,
} from '../src/lib/myanmar-townships';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, details?: string) {
  if (condition) {
    results.push({ suite, name, passed: true });
  } else {
    results.push({ suite, name, passed: false, details: details || 'Assertion failed' });
    console.error(`[FAIL] [${suite}] ${name}: ${details || 'Assertion failed'}`);
  }
}

export function runDeepProbe() {
  console.log('>>> RUNNING CHALLENGER DEEP PROBE FOR MYANMAR TOWNSHIPS <<<\n');

  // -------------------------------------------------------------
  // 1. Category 2.7: Naypyitaw Substring Collision & Pyay Separation
  // -------------------------------------------------------------
  const npt = lookupTownshipDelivery('နေပြည်တော်');
  assert('Cat2.7-NPT', "lookupTownshipDelivery('နေပြည်တော်') not null", npt !== null);
  assert('Cat2.7-NPT', "lookupTownshipDelivery('နေပြည်တော်') is Zabuthiri", npt?.nameEn === 'Zabuthiri', `Got ${npt?.nameEn}`);
  assert('Cat2.7-NPT', "lookupTownshipDelivery('နေပြည်တော်') region is Naypyitaw", npt?.region === 'Naypyitaw', `Got ${npt?.region}`);
  assert('Cat2.7-NPT', "lookupTownshipDelivery('နေပြည်တော်') fee is 4,000 MMK", npt?.standardFeeMmk === 4000 && npt?.feeMmk === 4000, `Got fee ${npt?.feeMmk}`);
  assert('Cat2.7-NPT', "lookupTownshipDelivery('နေပြည်တော်') COD is true", npt?.codAvailable === true && npt?.isCodAvailable === true);

  const nptCity = lookupTownshipDelivery('နေပြည်တော်မြို့');
  assert('Cat2.7-NPT', "lookupTownshipDelivery('နေပြည်တော်မြို့') not null", nptCity !== null);
  assert('Cat2.7-NPT', "lookupTownshipDelivery('နေပြည်တော်မြို့') is Zabuthiri", nptCity?.nameEn === 'Zabuthiri', `Got ${nptCity?.nameEn}`);
  assert('Cat2.7-NPT', "lookupTownshipDelivery('နေပြည်တော်မြို့') fee is 4,000 MMK", nptCity?.standardFeeMmk === 4000);
  assert('Cat2.7-NPT', "lookupTownshipDelivery('နေပြည်တော်မြို့') COD is true", nptCity?.codAvailable === true);

  const nptPrepaid = isRegionalPrepaidOnly('နေပြည်တော်');
  assert('Cat2.7-NPT', "isRegionalPrepaidOnly('နေပြည်တော်') returns false", nptPrepaid === false, `Got ${nptPrepaid}`);

  const nptCityPrepaid = isRegionalPrepaidOnly('နေပြည်တော်မြို့');
  assert('Cat2.7-NPT', "isRegionalPrepaidOnly('နေပြည်တော်မြို့') returns false", nptCityPrepaid === false, `Got ${nptCityPrepaid}`);

  const pyayEn = lookupTownshipDelivery('Pyay');
  assert('Cat2.7-Pyay', "lookupTownshipDelivery('Pyay') resolves to Pyay", pyayEn?.nameEn === 'Pyay');
  assert('Cat2.7-Pyay', "lookupTownshipDelivery('Pyay') region is State/Region", pyayEn?.region === 'State/Region');
  assert('Cat2.7-Pyay', "lookupTownshipDelivery('Pyay') fee is 4,500 MMK", pyayEn?.standardFeeMmk === 4500 && pyayEn?.feeMmk === 4500);
  assert('Cat2.7-Pyay', "lookupTownshipDelivery('Pyay') COD is strictly false", pyayEn?.codAvailable === false && pyayEn?.isCodAvailable === false);
  assert('Cat2.7-Pyay', "isRegionalPrepaidOnly('Pyay') returns true", isRegionalPrepaidOnly('Pyay') === true);

  const pyayMm = lookupTownshipDelivery('ပြည်');
  assert('Cat2.7-Pyay', "lookupTownshipDelivery('ပြည်') resolves strictly to Pyay", pyayMm?.nameEn === 'Pyay', `Got ${pyayMm?.nameEn}`);
  assert('Cat2.7-Pyay', "lookupTownshipDelivery('ပြည်') fee is 4,500 MMK", pyayMm?.standardFeeMmk === 4500);
  assert('Cat2.7-Pyay', "lookupTownshipDelivery('ပြည်') COD is strictly false", pyayMm?.codAvailable === false);
  assert('Cat2.7-Pyay', "isRegionalPrepaidOnly('ပြည်') returns true", isRegionalPrepaidOnly('ပြည်') === true);

  // -------------------------------------------------------------
  // 2. Topology & Regional Completeness
  // -------------------------------------------------------------
  assert('Cat1-Topology', 'Exact total length is 61', MYANMAR_DELIVERY_MATRIX.length === 61, `Got ${MYANMAR_DELIVERY_MATRIX.length}`);
  const ygn = MYANMAR_DELIVERY_MATRIX.filter(t => t.region === 'Yangon');
  const mdy = MYANMAR_DELIVERY_MATRIX.filter(t => t.region === 'Mandalay');
  const nptReg = MYANMAR_DELIVERY_MATRIX.filter(t => t.region === 'Naypyitaw');
  const stateReg = MYANMAR_DELIVERY_MATRIX.filter(t => t.region === 'State/Region');

  assert('Cat1-Topology', 'Yangon count is 34', ygn.length === 34, `Got ${ygn.length}`);
  assert('Cat1-Topology', 'Mandalay count is 7', mdy.length === 7, `Got ${mdy.length}`);
  assert('Cat1-Topology', 'Naypyitaw count is 6', nptReg.length === 6, `Got ${nptReg.length}`);
  assert('Cat1-Topology', 'State/Region count is 14 (11 cities + 3 bus gates)', stateReg.length === 14, `Got ${stateReg.length}`);

  // Duplicate checks
  const namesEn = new Set<string>();
  const namesMm = new Set<string>();
  let dupCount = 0;
  for (const item of MYANMAR_DELIVERY_MATRIX) {
    if (namesEn.has(item.nameEn.toLowerCase())) dupCount++;
    if (namesMm.has(item.nameMm)) dupCount++;
    namesEn.add(item.nameEn.toLowerCase());
    namesMm.add(item.nameMm);
  }
  assert('Cat1-Topology', 'Zero duplicate English or Burmese names', dupCount === 0, `Duplicates found: ${dupCount}`);

  // -------------------------------------------------------------
  // 3. Substring Collisions Deep Checks
  // -------------------------------------------------------------
  // Pathein vs Patheingyi
  assert('Cat2-Collisions', 'Pathein is Regional', lookupTownshipDelivery('Pathein')?.region === 'State/Region');
  assert('Cat2-Collisions', 'Patheingyi is Mandalay', lookupTownshipDelivery('Patheingyi')?.region === 'Mandalay');
  assert('Cat2-Collisions', 'ပုသိမ် is Regional', lookupTownshipDelivery('ပုသိမ်')?.region === 'State/Region');
  assert('Cat2-Collisions', 'ပုသိမ်ကြီး is Mandalay', lookupTownshipDelivery('ပုသိမ်ကြီး')?.region === 'Mandalay');

  // Hlaing vs Hlaingthaya
  assert('Cat2-Collisions', 'Hlaing fee is 2500', lookupTownshipDelivery('Hlaing')?.standardFeeMmk === 2500);
  assert('Cat2-Collisions', 'Hlaingthaya fee is 4000', lookupTownshipDelivery('Hlaingthaya')?.standardFeeMmk === 4000);
  assert('Cat2-Collisions', 'လှိုင် fee is 2500', lookupTownshipDelivery('လှိုင်')?.standardFeeMmk === 2500);
  assert('Cat2-Collisions', 'လှိုင်သာယာ fee is 4000', lookupTownshipDelivery('လှိုင်သာယာ')?.standardFeeMmk === 4000);

  // Pyay vs Pyigyidagun vs Pyinmana
  assert('Cat2-Collisions', 'Pyay is State/Region', lookupTownshipDelivery('Pyay')?.region === 'State/Region');
  assert('Cat2-Collisions', 'Pyigyidagun is Mandalay', lookupTownshipDelivery('Pyigyidagun')?.region === 'Mandalay');
  assert('Cat2-Collisions', 'Pyinmana is Naypyitaw', lookupTownshipDelivery('Pyinmana')?.region === 'Naypyitaw');
  assert('Cat2-Collisions', 'ပြည်ကြီးတံခွန် is Mandalay', lookupTownshipDelivery('ပြည်ကြီးတံခွန်')?.region === 'Mandalay');
  assert('Cat2-Collisions', 'ပျဉ်းမနား is Naypyitaw', lookupTownshipDelivery('ပျဉ်းမနား')?.region === 'Naypyitaw');

  // Okkalapa
  assert('Cat2-Collisions', 'South Okkalapa resolves', lookupTownshipDelivery('South Okkalapa')?.nameEn === 'South Okkalapa');
  assert('Cat2-Collisions', 'North Okkalapa resolves', lookupTownshipDelivery('North Okkalapa')?.nameEn === 'North Okkalapa');
  assert('Cat2-Collisions', 'တောင်ဥက္ကလာ resolves', lookupTownshipDelivery('တောင်ဥက္ကလာ')?.nameEn === 'South Okkalapa');
  assert('Cat2-Collisions', 'မြောက်ဥက္ကလာ resolves', lookupTownshipDelivery('မြောက်ဥက္ကလာ')?.nameEn === 'North Okkalapa');

  // Mingalar
  assert('Cat2-Collisions', 'Mingaladon is Airport Zone (4000)', lookupTownshipDelivery('Mingaladon')?.standardFeeMmk === 4000);
  assert('Cat2-Collisions', 'Mingalar Taung Nyunt is Inner Yangon (2500)', lookupTownshipDelivery('Mingalar Taung Nyunt')?.standardFeeMmk === 2500);
  assert('Cat2-Collisions', 'Aung Mingalar is Bus Gate (3500, COD false)', lookupTownshipDelivery('Aung Mingalar')?.standardFeeMmk === 3500 && lookupTownshipDelivery('Aung Mingalar')?.codAvailable === false);

  // -------------------------------------------------------------
  // 4. Bus Gate Strict Policies
  // -------------------------------------------------------------
  const gates = [
    'Aung Mingalar Highway Bus Terminal',
    'Dagon Ayeyar Highway Bus Terminal',
    'Saw Bwar Gyi Gone Bus Gate'
  ];
  for (const g of gates) {
    const res = lookupTownshipDelivery(g);
    assert('Cat4-BusGates', `${g} fee is 3500`, res?.standardFeeMmk === 3500);
    assert('Cat4-BusGates', `${g} COD is false`, res?.codAvailable === false);
    assert('Cat4-BusGates', `${g} isRegionalPrepaidOnly is true`, isRegionalPrepaidOnly(g) === true);
  }

  // -------------------------------------------------------------
  // 5. Dual Alias Contract
  // -------------------------------------------------------------
  for (const item of MYANMAR_DELIVERY_MATRIX) {
    const res = lookupTownshipDelivery(item.nameEn);
    assert('Cat6-Contract', `${item.nameEn} alias townshipEn`, res?.townshipEn === res?.nameEn);
    assert('Cat6-Contract', `${item.nameEn} alias townshipMm`, res?.townshipMm === res?.nameMm);
    assert('Cat6-Contract', `${item.nameEn} alias feeMmk`, res?.feeMmk === res?.standardFeeMmk);
    assert('Cat6-Contract', `${item.nameEn} alias isCodAvailable`, res?.isCodAvailable === res?.codAvailable);
    assert('Cat6-Contract', `${item.nameEn} alias estimatedDays`, res?.estimatedDays === res?.estDays);
  }

  // -------------------------------------------------------------
  // 6. Adversarial Injection & Boundary Stress
  // -------------------------------------------------------------
  assert('Cat7-Adversarial', 'null returns null', lookupTownshipDelivery(null as any) === null);
  assert('Cat7-Adversarial', 'undefined returns null', lookupTownshipDelivery(undefined as any) === null);
  assert('Cat7-Adversarial', 'empty string returns null', lookupTownshipDelivery('') === null);
  assert('Cat7-Adversarial', 'whitespaces return null', lookupTownshipDelivery('    \n\t  ') === null);
  assert('Cat7-Adversarial', '__proto__ returns null', lookupTownshipDelivery('__proto__') === null);
  assert('Cat7-Adversarial', 'constructor returns null', lookupTownshipDelivery('constructor') === null);
  assert('Cat7-Adversarial', 'toString returns null', lookupTownshipDelivery('toString') === null);
  assert('Cat7-Adversarial', 'Zero-width space only returns null', lookupTownshipDelivery('\u200B\u200B\u200B') === null);
  assert('Cat7-Adversarial', 'Long garbage string returns null', lookupTownshipDelivery('A'.repeat(5000)) === null);

  // -------------------------------------------------------------
  // 7. Performance Benchmark (10,000 lookups)
  // -------------------------------------------------------------
  const t0 = Date.now();
  const testQueries = ['နေပြည်တော်', 'Yangon Sanchaung', 'Aung Mingalar Gate', 'ပုသိမ်', 'ပြည်', 'Patheingyi', 'မ/ဥ', 'Kamayut'];
  for (let i = 0; i < 10000; i++) {
    lookupTownshipDelivery(testQueries[i % testQueries.length]);
  }
  const elapsed = Date.now() - t0;
  assert('Performance', `10,000 lookups executed under 1000ms (took ${elapsed}ms)`, elapsed < 1000, `Took ${elapsed}ms`);

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n========================================`);
  console.log(`DEEP PROBE RESULTS: Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDeepProbe();
