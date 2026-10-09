/**
/**
 * Milestone 2 Adversarial Challenge Test Suite: Myanmar Townships & Logistics
 * Agent: challenger_m2_2 (teamwork_preview_challenger)
 * 
 * Comprehensive adversarial verification:
 *  1. Matrix Integrity & Topology (61 total entries: 34 YGN, 7 MDY, 6 NPT, 11 REG, 3 Gates)
 *  2. Substring Collision Stress Tests (Dagon cluster, Pathein/Patheingyi, Hlaing/Hlaingthaya, etc.)
 *  3. English, Burmese, Zawgyi, Prefix/Suffix Stripping & Fuzzy Queries
 *  4. Highway Express Bus Gate Verification (Fees, COD: false, Prepaid status, Notes)
 *  5. Strict Prepaid Policy Enforcement (isRegionalPrepaidOnly across all locations & fallbacks)
 *  6. Dual-Aliased Contract Conformance (nameEn/townshipEn, standardFeeMmk/feeMmk, etc.)
 *  7. Adversarial Boundary, Injection & Negative Input Tests
 */

import {
  lookupTownshipDelivery,
  isRegionalPrepaidOnly,
  MYANMAR_DELIVERY_MATRIX,
  TownshipDeliveryInfo,
} from '../src/lib/myanmar-townships';

interface ChallengeAssertion {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const assertions: ChallengeAssertion[] = [];

function check(category: string, name: string, condition: boolean, errorMsg?: string) {
  if (condition) {
    assertions.push({ category, name, passed: true });
    console.log(`  [PASS] [${category}] ${name}`);
  } else {
    const err = errorMsg || 'Condition evaluated to false';
    assertions.push({ category, name, passed: false, error: err });
    console.error(`  [FAIL] [${category}] ${name} -> ${err}`);
  }
}

export async function runChallenge() {
  console.log('================================================================');
  console.log('CHALLENGER M2: EMPIRICAL ADVERSARIAL STRESS TEST SUITE');
  console.log('================================================================\n');

  // ===========================================================================
  // CATEGORY 1: Matrix Topology & Regional Integrity
  // ===========================================================================
  console.log('--- CATEGORY 1: Matrix Topology & Regional Integrity ---');
  
  check(
    'Topology',
    'Total delivery matrix entries is exactly 61 (58 townships + 3 bus gates)',
    MYANMAR_DELIVERY_MATRIX.length === 61,
    `Expected 61, got ${MYANMAR_DELIVERY_MATRIX.length}`
  );

  const yangonList = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Yangon');
  check('Topology', 'Yangon region has exactly 34 townships', yangonList.length === 34, `Got ${yangonList.length}`);
  check('Topology', 'All 34 Yangon townships support COD', yangonList.every((t) => t.codAvailable === true));
  check('Topology', 'Yangon fees range between 2,500 and 5,000 MMK', yangonList.every((t) => t.standardFeeMmk >= 2500 && t.standardFeeMmk <= 5000));

  const mdyList = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Mandalay');
  check('Topology', 'Mandalay region has exactly 7 townships', mdyList.length === 7, `Got ${mdyList.length}`);
  check('Topology', 'All 7 Mandalay townships support COD', mdyList.every((t) => t.codAvailable === true));
  check('Topology', 'Mandalay fees range between 3,000 and 4,000 MMK', mdyList.every((t) => t.standardFeeMmk >= 3000 && t.standardFeeMmk <= 4000));

  const nptList = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Naypyitaw');
  check('Topology', 'Naypyitaw region has exactly 6 townships', nptList.length === 6, `Got ${nptList.length}`);
  check('Topology', 'All 6 Naypyitaw townships support COD', nptList.every((t) => t.codAvailable === true));
  check('Topology', 'Naypyitaw fees range between 4,000 and 4,500 MMK', nptList.every((t) => t.standardFeeMmk >= 4000 && t.standardFeeMmk <= 4500));

  const regList = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'State/Region');
  check('Topology', 'State/Region has exactly 14 locations (11 cities + 3 bus gates)', regList.length === 14, `Got ${regList.length}`);
  check('Topology', 'All 14 State/Region entries strictly enforce COD: false', regList.every((t) => t.codAvailable === false));

  // Verify uniqueness of English and Burmese names
  const enNames = new Set<string>();
  const mmNames = new Set<string>();
  let hasDuplicateNames = false;
  for (const item of MYANMAR_DELIVERY_MATRIX) {
    if (enNames.has(item.nameEn.toLowerCase())) {
      hasDuplicateNames = true;
      console.error(`Duplicate nameEn: ${item.nameEn}`);
    }
    if (mmNames.has(item.nameMm)) {
      hasDuplicateNames = true;
      console.error(`Duplicate nameMm: ${item.nameMm}`);
    }
    enNames.add(item.nameEn.toLowerCase());
    mmNames.add(item.nameMm);
  }
  check('Topology', 'Zero duplicate township names across matrix', !hasDuplicateNames);

  // ===========================================================================
  // CATEGORY 2: Substring Collision Stress Tests
  // ===========================================================================
  console.log('\n--- CATEGORY 2: Substring Collision Stress Tests ---');

  // Test 2.1: Dagon Multi-way Collision Cluster
  // Downtown Dagon (2500) vs North Dagon (3500) vs South Dagon (3500) vs East Dagon (4000) vs Dagon Seikkan (4000) vs Dagon Ayeyar Gate (3500)
  const dagonRes = lookupTownshipDelivery('Dagon');
  check('Collision-Dagon', 'Query "Dagon" resolves to Downtown Dagon', dagonRes?.nameEn === 'Dagon' && dagonRes?.standardFeeMmk === 2500);

  const northDagonRes = lookupTownshipDelivery('North Dagon');
  check('Collision-Dagon', 'Query "North Dagon" resolves to North Dagon (3500 MMK)', northDagonRes?.nameEn === 'North Dagon' && northDagonRes?.standardFeeMmk === 3500);

  const southDagonRes = lookupTownshipDelivery('South Dagon');
  check('Collision-Dagon', 'Query "South Dagon" resolves to South Dagon (3500 MMK)', southDagonRes?.nameEn === 'South Dagon' && southDagonRes?.standardFeeMmk === 3500);

  const eastDagonRes = lookupTownshipDelivery('East Dagon');
  check('Collision-Dagon', 'Query "East Dagon" resolves to East Dagon (4000 MMK)', eastDagonRes?.nameEn === 'East Dagon' && eastDagonRes?.standardFeeMmk === 4000);

  const dagonSeikkanRes = lookupTownshipDelivery('Dagon Seikkan');
  check('Collision-Dagon', 'Query "Dagon Seikkan" resolves to Dagon Seikkan (4000 MMK)', dagonSeikkanRes?.nameEn === 'Dagon Seikkan' && dagonSeikkanRes?.standardFeeMmk === 4000);

  const dagonAyeyarRes = lookupTownshipDelivery('Dagon Ayeyar Highway Bus Terminal');
  check('Collision-Dagon', 'Query "Dagon Ayeyar Highway Bus Terminal" resolves to Dagon Ayeyar', dagonAyeyarRes?.nameEn === 'Dagon Ayeyar Highway Bus Terminal');

  const dagonAyeyarShortRes = lookupTownshipDelivery('Dagon Ayeyar');
  check('Collision-Dagon', 'Short query "Dagon Ayeyar" resolves to Bus Terminal, NOT Downtown Dagon', dagonAyeyarShortRes?.nameEn === 'Dagon Ayeyar Highway Bus Terminal' && dagonAyeyarShortRes?.codAvailable === false);

  const dagonAyeyarGateRes = lookupTownshipDelivery('Dagon Ayeyar Gate');
  check('Collision-Dagon', 'Query "Dagon Ayeyar Gate" resolves to Bus Terminal', dagonAyeyarGateRes?.nameEn === 'Dagon Ayeyar Highway Bus Terminal');

  // Burmese Dagon Cluster
  const dagonMmRes = lookupTownshipDelivery('ဒဂုံ');
  check('Collision-Dagon-MM', 'Burmese query "ဒဂုံ" resolves to Downtown Dagon', dagonMmRes?.nameEn === 'Dagon' && dagonMmRes?.standardFeeMmk === 2500);

  const myaukDagonMm = lookupTownshipDelivery('မြောက်ဒဂုံ');
  check('Collision-Dagon-MM', 'Colloquial "မြောက်ဒဂုံ" resolves to North Dagon', myaukDagonMm?.nameEn === 'North Dagon');

  const dagonMyaukMm = lookupTownshipDelivery('ဒဂုံမြောက်');
  check('Collision-Dagon-MM', 'Inverted "ဒဂုံမြောက်" resolves to North Dagon', dagonMyaukMm?.nameEn === 'North Dagon');

  const northDagonFormalMm = lookupTownshipDelivery('ဒဂုံမြို့သစ်မြောက်ပိုင်း');
  check('Collision-Dagon-MM', 'Formal "ဒဂုံမြို့သစ်မြောက်ပိုင်း" resolves to North Dagon', northDagonFormalMm?.nameEn === 'North Dagon');

  const taungDagonMm = lookupTownshipDelivery('တောင်ဒဂုံ');
  check('Collision-Dagon-MM', 'Colloquial "တောင်ဒဂုံ" resolves to South Dagon', taungDagonMm?.nameEn === 'South Dagon');

  const dagonTaungMm = lookupTownshipDelivery('ဒဂုံတောင်');
  check('Collision-Dagon-MM', 'Inverted "ဒဂုံတောင်" resolves to South Dagon', dagonTaungMm?.nameEn === 'South Dagon');

  const southDagonFormalMm = lookupTownshipDelivery('ဒဂုံမြို့သစ်တောင်ပိုင်း');
  check('Collision-Dagon-MM', 'Formal "ဒဂုံမြို့သစ်တောင်ပိုင်း" resolves to South Dagon', southDagonFormalMm?.nameEn === 'South Dagon');

  const ashaeDagonMm = lookupTownshipDelivery('အရှေ့ဒဂုံ');
  check('Collision-Dagon-MM', 'Colloquial "အရှေ့ဒဂုံ" resolves to East Dagon', ashaeDagonMm?.nameEn === 'East Dagon');

  const dagonAshaeMm = lookupTownshipDelivery('ဒဂုံအရှေ့');
  check('Collision-Dagon-MM', 'Inverted "ဒဂုံအရှေ့" resolves to East Dagon', dagonAshaeMm?.nameEn === 'East Dagon');

  const eastDagonFormalMm = lookupTownshipDelivery('ဒဂုံမြို့သစ်အရှေ့ပိုင်း');
  check('Collision-Dagon-MM', 'Formal "ဒဂုံမြို့သစ်အရှေ့ပိုင်း" resolves to East Dagon', eastDagonFormalMm?.nameEn === 'East Dagon');

  const dagonSeikkanMm = lookupTownshipDelivery('ဒဂုံဆိပ်ကမ်း');
  check('Collision-Dagon-MM', 'Burmese "ဒဂုံဆိပ်ကမ်း" resolves to Dagon Seikkan', dagonSeikkanMm?.nameEn === 'Dagon Seikkan');

  const dagonAyeyarMm = lookupTownshipDelivery('ဒဂုံဧရာ');
  check('Collision-Dagon-MM', 'Burmese "ဒဂုံဧရာ" resolves to Bus Terminal, NOT Downtown Dagon', dagonAyeyarMm?.nameEn === 'Dagon Ayeyar Highway Bus Terminal' && dagonAyeyarMm?.codAvailable === false);

  const dagonAyeyarFullMm = lookupTownshipDelivery('ဒဂုံဧရာ အဝေးပြေးဂိတ်');
  check('Collision-Dagon-MM', 'Full "ဒဂုံဧရာ အဝေးပြေးဂိတ်" resolves to Bus Terminal', dagonAyeyarFullMm?.nameEn === 'Dagon Ayeyar Highway Bus Terminal');

  // Test 2.2: Pathein (Regional Ayeyarwady) vs Patheingyi (Mandalay Suburb)
  const patheinEn = lookupTownshipDelivery('Pathein');
  check('Collision-Pathein', 'Query "Pathein" matches Regional Ayeyarwady (COD: false, fee: 4500)', patheinEn?.nameEn === 'Pathein' && patheinEn?.region === 'State/Region' && patheinEn?.codAvailable === false && patheinEn?.standardFeeMmk === 4500);

  const patheingyiEn = lookupTownshipDelivery('Patheingyi');
  check('Collision-Pathein', 'Query "Patheingyi" matches Mandalay Suburb (COD: true, fee: 4000)', patheingyiEn?.nameEn === 'Patheingyi' && patheingyiEn?.region === 'Mandalay' && patheingyiEn?.codAvailable === true && patheingyiEn?.standardFeeMmk === 4000);

  const patheinGyiSpaced = lookupTownshipDelivery('Pathein Gyi');
  check('Collision-Pathein', 'Spaced "Pathein Gyi" matches Patheingyi', patheinGyiSpaced?.nameEn === 'Patheingyi');

  const paTheinGyiSpaced = lookupTownshipDelivery('Pa Thein Gyi');
  check('Collision-Pathein', 'Three-word "Pa Thein Gyi" matches Patheingyi', paTheinGyiSpaced?.nameEn === 'Patheingyi');

  const patheinMm = lookupTownshipDelivery('ပုသိမ်');
  check('Collision-Pathein', 'Burmese "ပုသိမ်" matches Regional Pathein', patheinMm?.nameEn === 'Pathein' && patheinMm?.codAvailable === false);

  const patheingyiMm = lookupTownshipDelivery('ပုသိမ်ကြီး');
  check('Collision-Pathein', 'Burmese "ပုသိမ်ကြီး" matches Mandalay Patheingyi', patheingyiMm?.nameEn === 'Patheingyi' && patheingyiMm?.codAvailable === true);

  const patheinCityMm = lookupTownshipDelivery('ပုသိမ်မြို့');
  check('Collision-Pathein', 'Burmese "ပုသိမ်မြို့" matches Regional Pathein', patheinCityMm?.nameEn === 'Pathein');

  const patheingyiTspMm = lookupTownshipDelivery('ပုသိမ်ကြီးမြို့နယ်');
  check('Collision-Pathein', 'Burmese "ပုသိမ်ကြီးမြို့နယ်" matches Mandalay Patheingyi', patheingyiTspMm?.nameEn === 'Patheingyi');

  const basseinColonial = lookupTownshipDelivery('Bassein');
  check('Collision-Pathein', 'Colonial name "Bassein" resolves to Pathein', basseinColonial?.nameEn === 'Pathein');

  // Test 2.3: Hlaing (Inner Yangon) vs Hlaingthaya (Outer Industrial Zone)
  const hlaingRes = lookupTownshipDelivery('Hlaing');
  check('Collision-Hlaing', 'Query "Hlaing" resolves to Inner Yangon Hlaing (2500 MMK)', hlaingRes?.nameEn === 'Hlaing' && hlaingRes?.standardFeeMmk === 2500);

  const hlaingthayaRes = lookupTownshipDelivery('Hlaingthaya');
  check('Collision-Hlaing', 'Query "Hlaingthaya" resolves to Outer Yangon (4000 MMK)', hlaingthayaRes?.nameEn === 'Hlaingthaya' && hlaingthayaRes?.standardFeeMmk === 4000);

  const hlaingTharyarRes = lookupTownshipDelivery('Hlaing Tharyar');
  check('Collision-Hlaing', 'Spaced "Hlaing Tharyar" resolves to Hlaingthaya', hlaingTharyarRes?.nameEn === 'Hlaingthaya');

  const hlaingMmRes = lookupTownshipDelivery('လှိုင်');
  check('Collision-Hlaing', 'Burmese "လှိုင်" resolves to Inner Hlaing', hlaingMmRes?.nameEn === 'Hlaing' && hlaingMmRes?.standardFeeMmk === 2500);

  const hlaingthayaMmRes = lookupTownshipDelivery('လှိုင်သာယာ');
  check('Collision-Hlaing', 'Burmese "လှိုင်သာယာ" resolves to Hlaingthaya', hlaingthayaMmRes?.nameEn === 'Hlaingthaya' && hlaingthayaMmRes?.standardFeeMmk === 4000);

  // Test 2.4: Pyay (Regional) vs Pyigyidagun (Mandalay) vs Pyinmana (Naypyitaw)
  const pyayRes = lookupTownshipDelivery('Pyay');
  check('Collision-Pyay', 'Query "Pyay" resolves to Regional Pyay (4500 MMK, COD: false)', pyayRes?.nameEn === 'Pyay' && pyayRes?.region === 'State/Region' && pyayRes?.codAvailable === false);

  const pyigyidagunRes = lookupTownshipDelivery('Pyigyidagun');
  check('Collision-Pyay', 'Query "Pyigyidagun" resolves to Mandalay (3500 MMK, COD: true)', pyigyidagunRes?.nameEn === 'Pyigyidagun' && pyigyidagunRes?.region === 'Mandalay' && pyigyidagunRes?.codAvailable === true);

  const pyinmanaRes = lookupTownshipDelivery('Pyinmana');
  check('Collision-Pyay', 'Query "Pyinmana" resolves to Naypyitaw (4000 MMK, COD: true)', pyinmanaRes?.nameEn === 'Pyinmana' && pyinmanaRes?.region === 'Naypyitaw' && pyinmanaRes?.codAvailable === true);

  const pyayMmRes = lookupTownshipDelivery('ပြည်');
  check('Collision-Pyay', 'Burmese "ပြည်" resolves to Regional Pyay', pyayMmRes?.nameEn === 'Pyay' && pyayMmRes?.codAvailable === false);

  const pyigyidagunMmRes = lookupTownshipDelivery('ပြည်ကြီးတံခွန်');
  check('Collision-Pyay', 'Burmese "ပြည်ကြီးတံခွန်" resolves to Mandalay, NOT Pyay', pyigyidagunMmRes?.nameEn === 'Pyigyidagun' && pyigyidagunMmRes?.codAvailable === true);

  const pyinmanaMmRes = lookupTownshipDelivery('ပျဉ်းမနား');
  check('Collision-Pyay', 'Burmese "ပျဉ်းမနား" resolves to Naypyitaw', pyinmanaMmRes?.nameEn === 'Pyinmana');

  // Test 2.5: Okkalapa Cluster (South Okkalapa vs North Okkalapa)
  const sOkkala = lookupTownshipDelivery('South Okkalapa');
  const nOkkala = lookupTownshipDelivery('North Okkalapa');
  check('Collision-Okkala', 'South Okkalapa resolves correctly', sOkkala?.nameEn === 'South Okkalapa');
  check('Collision-Okkala', 'North Okkalapa resolves correctly', nOkkala?.nameEn === 'North Okkalapa');
  check('Collision-Okkala', 'Short "တ/ဥ" resolves to South Okkalapa', lookupTownshipDelivery('တ/ဥ')?.nameEn === 'South Okkalapa');
  check('Collision-Okkala', 'Short "မ/ဥ" resolves to North Okkalapa', lookupTownshipDelivery('မ/ဥ')?.nameEn === 'North Okkalapa');

  // Test 2.6: Mingalar Cluster (Mingaladon vs Mingalar Taung Nyunt vs Aung Mingalar Gate)
  const mingaladonRes = lookupTownshipDelivery('Mingaladon');
  check('Collision-Mingalar', 'Query "Mingaladon" resolves to Airport zone (4000 MMK)', mingaladonRes?.nameEn === 'Mingaladon' && mingaladonRes?.standardFeeMmk === 4000);

  const mtnRes = lookupTownshipDelivery('Mingalar Taung Nyunt');
  check('Collision-Mingalar', 'Query "Mingalar Taung Nyunt" resolves to Inner Yangon (2500 MMK)', mtnRes?.nameEn === 'Mingalar Taung Nyunt' && mtnRes?.standardFeeMmk === 2500);

  const aungMingalarRes = lookupTownshipDelivery('Aung Mingalar Highway Bus Terminal');
  check('Collision-Mingalar', 'Query "Aung Mingalar..." resolves to Bus Terminal (3500 MMK, COD: false)', aungMingalarRes?.nameEn === 'Aung Mingalar Highway Bus Terminal' && aungMingalarRes?.codAvailable === false);

  const aungMingalarShort = lookupTownshipDelivery('Aung Mingalar');
  check('Collision-Mingalar', 'Query "Aung Mingalar" resolves to Bus Terminal', aungMingalarShort?.nameEn === 'Aung Mingalar Highway Bus Terminal');

  // ===========================================================================
  // CATEGORY 3: Prefix/Suffix Normalization & Fuzzy Variations
  // ===========================================================================
  console.log('\n--- CATEGORY 3: Prefix/Suffix Normalization & Fuzzy Variations ---');

  // Prefix stripping
  check('Fuzzy', 'Prefix "Yangon Sanchaung" resolves to Sanchaung', lookupTownshipDelivery('Yangon Sanchaung')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'Prefix "Mandalay Chanayethazan" resolves to Chanayethazan', lookupTownshipDelivery('Mandalay Chanayethazan')?.nameEn === 'Chanayethazan');
  check('Fuzzy', 'Prefix "Naypyitaw Zabuthiri" resolves to Zabuthiri', lookupTownshipDelivery('Naypyitaw Zabuthiri')?.nameEn === 'Zabuthiri');
  check('Fuzzy', 'Burmese prefix "ရန်ကုန် စမ်းချောင်း" resolves to Sanchaung', lookupTownshipDelivery('ရန်ကုန် စမ်းချောင်း')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'Burmese prefix "မန္တလေး ချမ်းအေးသာစံ" resolves to Chanayethazan', lookupTownshipDelivery('မန္တလေး ချမ်းအေးသာစံ')?.nameEn === 'Chanayethazan');
  check('Fuzzy', 'Burmese prefix "နေပြည်တော် ဇမ္ဗူသီရိ" resolves to Zabuthiri', lookupTownshipDelivery('နေပြည်တော် ဇမ္ဗူသီရိ')?.nameEn === 'Zabuthiri');

  // Suffix stripping
  check('Fuzzy', 'Suffix "Sanchaung Township" resolves to Sanchaung', lookupTownshipDelivery('Sanchaung Township')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'Suffix "Bahan tsp" resolves to Bahan', lookupTownshipDelivery('Bahan tsp')?.nameEn === 'Bahan');
  check('Fuzzy', 'Suffix "စမ်းချောင်းမြို့နယ်" resolves to Sanchaung', lookupTownshipDelivery('စမ်းချောင်းမြို့နယ်')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'Suffix "မော်လမြိုင်မြို့" resolves to Mawlamyine', lookupTownshipDelivery('မော်လမြိုင်မြို့')?.nameEn === 'Mawlamyine');
  check('Fuzzy', 'Suffix "Aung Mingalar Gate" resolves to Bus Terminal', lookupTownshipDelivery('Aung Mingalar Gate')?.nameEn === 'Aung Mingalar Highway Bus Terminal');
  check('Fuzzy', 'Suffix "အောင်မင်္ဂလာကားဂိတ်" resolves to Bus Terminal', lookupTownshipDelivery('အောင်မင်္ဂလာကားဂိတ်')?.nameEn === 'Aung Mingalar Highway Bus Terminal');
  check('Fuzzy', 'Suffix "ဒဂုံဧရာဂိတ်" resolves to Bus Terminal', lookupTownshipDelivery('ဒဂုံဧရာဂိတ်')?.nameEn === 'Dagon Ayeyar Highway Bus Terminal');

  // Combined Prefix and Suffix
  check('Fuzzy', 'Combined "Yangon Sanchaung Township" resolves to Sanchaung', lookupTownshipDelivery('Yangon Sanchaung Township')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'Combined "ရန်ကုန် စမ်းချောင်းမြို့နယ်" resolves to Sanchaung', lookupTownshipDelivery('ရန်ကုန် စမ်းချောင်းမြို့နယ်')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'Combined "မန္တလေး ချမ်းအေးသာစံမြို့နယ်" resolves to Chanayethazan', lookupTownshipDelivery('မန္တလေး ချမ်းအေးသာစံမြို့နယ်')?.nameEn === 'Chanayethazan');

  // Zawgyi queries
  check('Zawgyi', 'Zawgyi "ေက်ာက္တံတား" resolves to Kyauktada', lookupTownshipDelivery('ေက်ာက္တံတား')?.nameEn === 'Kyauktada');
  check('Zawgyi', 'Zawgyi "စမ္းေခ်ာင္း" resolves to Sanchaung', lookupTownshipDelivery('စမ္းေခ်ာင္း')?.nameEn === 'Sanchaung');
  check('Zawgyi', 'Zawgyi "ေတာင္ႀကီး" resolves to Taunggyi', lookupTownshipDelivery('ေတာင္ႀကီး')?.nameEn === 'Taunggyi');
  check('Zawgyi', 'Zawgyi "ျပည္ႀကီးတံခြန္" resolves to Pyigyidagun', lookupTownshipDelivery('ျပည္ႀကီးတံခြန္')?.nameEn === 'Pyigyidagun');
  check('Zawgyi', 'Zawgyi "မဂၤလာဒုံ" resolves to Mingaladon', lookupTownshipDelivery('မဂၤလာဒုံ')?.nameEn === 'Mingaladon');

  // Colloquial landmarks & historic names
  check('Landmark', '"Chinatown Yangon" resolves to Latha', lookupTownshipDelivery('Chinatown Yangon')?.nameEn === 'Latha');
  check('Landmark', '"8 Mile" resolves to Mayangone', lookupTownshipDelivery('8 Mile')?.nameEn === 'Mayangone');
  check('Landmark', '"9 Mile" resolves to Mayangone', lookupTownshipDelivery('9 Mile')?.nameEn === 'Mayangone');
  check('Landmark', '"ဆရာစံ" resolves to Bahan', lookupTownshipDelivery('ဆရာစံ')?.nameEn === 'Bahan');
  check('Landmark', '"ကျောက်မြောင်း" resolves to Tamwe', lookupTownshipDelivery('ကျောက်မြောင်း')?.nameEn === 'Tamwe');
  check('Landmark', '"သုဝဏ္ဏ" resolves to Thingangyun', lookupTownshipDelivery('သုဝဏ္ဏ')?.nameEn === 'Thingangyun');
  check('Landmark', '"Moulmein" resolves to Mawlamyine', lookupTownshipDelivery('Moulmein')?.nameEn === 'Mawlamyine');
  check('Landmark', '"Pegu" resolves to Bago', lookupTownshipDelivery('Pegu')?.nameEn === 'Bago');
  check('Landmark', '"Prome" resolves to Pyay', lookupTownshipDelivery('Prome')?.nameEn === 'Pyay');
  check('Landmark', '"Syriam" resolves to Thanlyin', lookupTownshipDelivery('Syriam')?.nameEn === 'Thanlyin');

  // Case insensitivity & whitespace trimming
  check('Fuzzy', '"  sAnChAuNg  " resolves to Sanchaung', lookupTownshipDelivery('  sAnChAuNg  ')?.nameEn === 'Sanchaung');
  check('Fuzzy', '"nOrTh dAgOn" resolves to North Dagon', lookupTownshipDelivery('nOrTh dAgOn')?.nameEn === 'North Dagon');

  // ===========================================================================
  // CATEGORY 4: Highway Express Bus Gate Verification
  // ===========================================================================
  console.log('\n--- CATEGORY 4: Highway Express Bus Gate Verification ---');

  const busGates = [
    {
      nameEn: 'Aung Mingalar Highway Bus Terminal',
      nameMm: 'အောင်မင်္ဂလာ အဝေးပြေးဂိတ်',
      aliases: ['Aung Mingalar', 'Aung Mingalar Gate', 'အောင်မင်္ဂလာ', 'အောင်မင်္ဂလာ ကားဂိတ်', 'အောင်မင်္ဂလာဂိတ်'],
    },
    {
      nameEn: 'Dagon Ayeyar Highway Bus Terminal',
      nameMm: 'ဒဂုံဧရာ အဝေးပြေးဂိတ်',
      aliases: ['Dagon Ayeyar', 'Dagon Ayeyar Gate', 'ဒဂုံဧရာ', 'ဒဂုံဧရာ ကားဂိတ်', 'ဒဂုံဧရာဂိတ်'],
    },
    {
      nameEn: 'Saw Bwar Gyi Gone Bus Gate',
      nameMm: 'စော်ဘွားကြီးကုန်း ကားဂိတ်',
      aliases: ['Saw Bwar Gyi Gone', 'Sawbwa Gyi Gone', 'စော်ဘွားကြီးကုန်း', 'စော်ဘွားကြီးကုန်း ကားဂိတ်'],
    },
  ];

  for (const gate of busGates) {
    const info = lookupTownshipDelivery(gate.nameEn);
    check('BusGate', `${gate.nameEn}: fee is exactly 3,500 MMK`, info?.standardFeeMmk === 3500 && info?.feeMmk === 3500);
    check('BusGate', `${gate.nameEn}: COD is strictly false`, info?.codAvailable === false && info?.isCodAvailable === false);
    check('BusGate', `${gate.nameEn}: estDays contains Prepaid Only`, typeof info?.estDays === 'string' && info.estDays.includes('Prepaid Only'));
    check('BusGate', `${gate.nameEn}: isRegionalPrepaidOnly returns true`, isRegionalPrepaidOnly(gate.nameEn) === true);
    check('BusGate', `${gate.nameEn}: notes explains drop-off fee and bus freight`, typeof info?.notes === 'string' && info.notes.includes('Drop-off fee'));

    // Check all gate aliases
    for (const alias of gate.aliases) {
      const aliasInfo = lookupTownshipDelivery(alias);
      check('BusGate', `Alias "${alias}" maps to ${gate.nameEn}`, aliasInfo?.nameEn === gate.nameEn);
      check('BusGate', `Alias "${alias}" triggers isRegionalPrepaidOnly === true`, isRegionalPrepaidOnly(alias) === true);
    }
  }

  // ===========================================================================
  // CATEGORY 5: Strict Prepaid Policy Enforcement (isRegionalPrepaidOnly)
  // ===========================================================================
  console.log('\n--- CATEGORY 5: Strict Prepaid Policy Enforcement ---');

  // Yangon (34): COD available -> isRegionalPrepaidOnly MUST be false
  for (const item of yangonList) {
    const enPrepaid = isRegionalPrepaidOnly(item.nameEn);
    const mmPrepaid = isRegionalPrepaidOnly(item.nameMm);
    check('Policy-YGN', `Yangon ${item.nameEn} returns isRegionalPrepaidOnly === false`, enPrepaid === false, `Got ${enPrepaid}`);
    check('Policy-YGN', `Yangon ${item.nameMm} returns isRegionalPrepaidOnly === false`, mmPrepaid === false, `Got ${mmPrepaid}`);
  }

  // Mandalay (7): COD available -> isRegionalPrepaidOnly MUST be false
  for (const item of mdyList) {
    const enPrepaid = isRegionalPrepaidOnly(item.nameEn);
    const mmPrepaid = isRegionalPrepaidOnly(item.nameMm);
    check('Policy-MDY', `Mandalay ${item.nameEn} returns isRegionalPrepaidOnly === false`, enPrepaid === false, `Got ${enPrepaid}`);
    check('Policy-MDY', `Mandalay ${item.nameMm} returns isRegionalPrepaidOnly === false`, mmPrepaid === false, `Got ${mmPrepaid}`);
  }

  // Naypyitaw (6): COD available -> isRegionalPrepaidOnly MUST be false
  for (const item of nptList) {
    const enPrepaid = isRegionalPrepaidOnly(item.nameEn);
    const mmPrepaid = isRegionalPrepaidOnly(item.nameMm);
    check('Policy-NPT', `Naypyitaw ${item.nameEn} returns isRegionalPrepaidOnly === false`, enPrepaid === false, `Got ${enPrepaid}`);
    check('Policy-NPT', `Naypyitaw ${item.nameMm} returns isRegionalPrepaidOnly === false`, mmPrepaid === false, `Got ${mmPrepaid}`);
  }

  // Regional Cities (11) & Bus Gates (3): 100% Prepaid -> isRegionalPrepaidOnly MUST be true
  for (const item of regList) {
    const enPrepaid = isRegionalPrepaidOnly(item.nameEn);
    const mmPrepaid = isRegionalPrepaidOnly(item.nameMm);
    check('Policy-REG', `Regional/Gate ${item.nameEn} returns isRegionalPrepaidOnly === true`, enPrepaid === true, `Got ${enPrepaid}`);
    check('Policy-REG', `Regional/Gate ${item.nameMm} returns isRegionalPrepaidOnly === true`, mmPrepaid === true, `Got ${mmPrepaid}`);
  }

  // Fallback heuristic test: non-matrix queries containing gate/freight keywords return true
  const fallbackKeywords = [
    'အောင်သုခ ကားဂိတ်',
    'မန္တလေး အဝေးပြေးကားဂိတ်',
    'မော်လမြိုင် ဂိတ်ချ',
    'တန်ဆာခ ရှင်းပေးပါ',
    'နယ်ဝေး ပို့ဆောင်ရေး',
    'နယ်စုံ ကားဂိတ်',
    'Highway express cargo',
    'Express gate delivery',
    'Bus gate drop-off',
    'Bus terminal dispatch',
    'Prepaid only shipment',
  ];

  for (const kw of fallbackKeywords) {
    check('Policy-Fallback', `Fallback indicator "${kw}" returns isRegionalPrepaidOnly === true`, isRegionalPrepaidOnly(kw) === true);
  }

  // Pure metro region indicators without gate return false
  const metroKeywords = ['Yangon', 'Mandalay', 'Naypyitaw', 'ရန်ကုန်', 'မန္တလေး', 'နေပြည်တော်'];
  for (const metro of metroKeywords) {
    check('Policy-Metro', `Metro indicator "${metro}" returns isRegionalPrepaidOnly === false`, isRegionalPrepaidOnly(metro) === false);
  }

  // ===========================================================================
  // CATEGORY 6: Dual-Aliased Contract Conformance
  // ===========================================================================
  console.log('\n--- CATEGORY 6: Dual-Aliased Contract Conformance ---');

  // Verify all 61 matrix items have valid dual-aliases when returned via lookupTownshipDelivery
  let allDualAliased = true;
  for (const item of MYANMAR_DELIVERY_MATRIX) {
    const lookedUp = lookupTownshipDelivery(item.nameEn);
    if (!lookedUp) {
      allDualAliased = false;
      console.error(`Lookup returned null for ${item.nameEn}`);
      continue;
    }

    if (lookedUp.townshipEn !== lookedUp.nameEn) allDualAliased = false;
    if (lookedUp.townshipMm !== lookedUp.nameMm) allDualAliased = false;
    if (lookedUp.feeMmk !== lookedUp.standardFeeMmk) allDualAliased = false;
    if (lookedUp.isCodAvailable !== lookedUp.codAvailable) allDualAliased = false;
    if (lookedUp.estimatedDays !== lookedUp.estDays) allDualAliased = false;
    if (typeof lookedUp.feeMmk !== 'number' || lookedUp.feeMmk <= 0) allDualAliased = false;
    if (typeof lookedUp.isCodAvailable !== 'boolean') allDualAliased = false;
    if (typeof lookedUp.townshipEn !== 'string' || lookedUp.townshipEn.length === 0) allDualAliased = false;
    if (typeof lookedUp.townshipMm !== 'string' || lookedUp.townshipMm.length === 0) allDualAliased = false;
    if (typeof lookedUp.estimatedDays !== 'string' || lookedUp.estimatedDays.length === 0) allDualAliased = false;
  }

  check('Contract', 'All 61 matrix items expose 100% valid dual-aliased properties (PROJECT.md contract)', allDualAliased);

  // ===========================================================================
  // CATEGORY 7: Adversarial Boundary, Injection & Negative Input Tests
  // ===========================================================================
  console.log('\n--- CATEGORY 7: Adversarial Boundary & Negative Input Tests ---');

  check('Negative', 'Empty string returns null', lookupTownshipDelivery('') === null);
  check('Negative', 'Whitespace string returns null', lookupTownshipDelivery('   \t\n   ') === null);
  check('Negative', 'Null / undefined cast returns null', lookupTownshipDelivery(null as any) === null && lookupTownshipDelivery(undefined as any) === null);
  check('Negative', 'Number input cast returns null', lookupTownshipDelivery(12345 as any) === null);
  check('Negative', 'Object input cast returns null', lookupTownshipDelivery({} as any) === null);

  // Foreign / Unknown locations
  check('Negative', 'Foreign city "Tokyo" returns null', lookupTownshipDelivery('Tokyo') === null);
  check('Negative', 'Foreign city "Bangkok" returns null', lookupTownshipDelivery('Bangkok') === null);
  check('Negative', 'Foreign city "Singapore" returns null', lookupTownshipDelivery('Singapore') === null);
  check('Negative', 'Foreign city "New York" returns null', lookupTownshipDelivery('New York') === null);
  check('Negative', 'Gibberish string returns null', lookupTownshipDelivery('xyzqwertyuiop12345') === null);

  // Test 2.7: Naypyitaw Substring Collision vs Pyay (ပြည်)
  const nptRes = lookupTownshipDelivery('နေပြည်တော်');
  check(
    'Collision-Pyay',
    'Query "နေပြည်တော်" does NOT collide with Pyay (ပြည်)',
    nptRes?.nameEn !== 'Pyay',
    `CRITICAL BUG: "နေပြည်တော်" collided with "${nptRes?.nameEn}" (${nptRes?.nameMm}, ${nptRes?.region}) because "ပြည်" is a substring of "နေပြည်တော်"`
  );

  const nptCityRes = lookupTownshipDelivery('နေပြည်တော်မြို့');
  check(
    'Collision-Pyay',
    'Query "နေပြည်တော်မြို့" does NOT collide with Pyay (ပြည်)',
    nptCityRes?.nameEn !== 'Pyay',
    `CRITICAL BUG: "နေပြည်တော်မြို့" collided with "${nptCityRes?.nameEn}"`
  );

  // Injection tests
  check('Negative', 'SQL injection string without township returns null', lookupTownshipDelivery("' OR '1'='1; DROP TABLE townships;--") === null);
  check('Negative', 'HTML script injection returns null', lookupTownshipDelivery('<script>alert("hack")</script>') === null);

  // Suffix-only queries must NOT falsely match a random township
  check('Negative', 'Query "မြို့နယ်" alone returns null', lookupTownshipDelivery('မြို့နယ်') === null);
  check('Negative', 'Query "township" alone returns null', lookupTownshipDelivery('township') === null);
  check('Negative', 'Query "city" alone returns null', lookupTownshipDelivery('city') === null);

  // ===========================================================================
  // SUMMARY & EMPIRICAL EVIDENCE COLLECTION
  // ===========================================================================
  const total = assertions.length;
  const passed = assertions.filter((a) => a.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log('CHALLENGE SUMMARY REPORT');
  console.log('================================================================');
  console.log(`TOTAL CHALLENGE ASSERTIONS : ${total}`);
  console.log(`PASSED                     : ${passed}`);
  console.log(`FAILED                     : ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error(`\n❌ ADVERSARIAL VERDICT: REJECT (${failed} assertions failed)`);
    process.exit(1);
  } else {
    console.log(`\n✅ ADVERSARIAL VERDICT: APPROVE (${passed}/${total} assertions passed cleanly)`);
    process.exit(0);
  }
}

runChallenge().catch((err) => {
  console.error('Fatal challenge execution error:', err);
  process.exit(1);
});
