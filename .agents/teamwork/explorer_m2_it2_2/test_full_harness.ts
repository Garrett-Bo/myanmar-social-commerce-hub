import {
  MYANMAR_DELIVERY_MATRIX,
  TownshipDeliveryInfo,
} from '../../../src/lib/myanmar-townships';
import {
  lookupTownshipDeliveryProposed,
  isRegionalPrepaidOnlyProposed,
} from './test_solution';

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
  } else {
    const err = errorMsg || 'Condition evaluated to false';
    assertions.push({ category, name, passed: false, error: err });
    console.error(`  [FAIL] [${category}] ${name} -> ${err}`);
  }
}

export function runFullHarness() {
  const lookupTownshipDelivery = lookupTownshipDeliveryProposed;
  const isRegionalPrepaidOnly = isRegionalPrepaidOnlyProposed;

  // CATEGORY 1: Topology
  check('Topology', 'Total delivery matrix entries is exactly 61', MYANMAR_DELIVERY_MATRIX.length === 61);
  const yangonList = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Yangon');
  check('Topology', 'Yangon has 34', yangonList.length === 34);
  check('Topology', 'Yangon COD true', yangonList.every((t) => t.codAvailable === true));
  check('Topology', 'Yangon fees 2500-5000', yangonList.every((t) => t.standardFeeMmk >= 2500 && t.standardFeeMmk <= 5000));
  const mdyList = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Mandalay');
  check('Topology', 'Mandalay has 7', mdyList.length === 7);
  check('Topology', 'Mandalay COD true', mdyList.every((t) => t.codAvailable === true));
  check('Topology', 'Mandalay fees 3000-4000', mdyList.every((t) => t.standardFeeMmk >= 3000 && t.standardFeeMmk <= 4000));
  const nptList = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Naypyitaw');
  check('Topology', 'Naypyitaw has 6', nptList.length === 6);
  check('Topology', 'Naypyitaw COD true', nptList.every((t) => t.codAvailable === true));
  check('Topology', 'Naypyitaw fees 4000-4500', nptList.every((t) => t.standardFeeMmk >= 4000 && t.standardFeeMmk <= 4500));
  const regList = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'State/Region');
  check('Topology', 'State/Region has 14', regList.length === 14);
  check('Topology', 'State/Region COD false', regList.every((t) => t.codAvailable === false));

  // CATEGORY 2: Substring Collisions
  const dagonRes = lookupTownshipDelivery('Dagon');
  check('Collision-Dagon', 'Query "Dagon" resolves to Downtown Dagon', dagonRes?.nameEn === 'Dagon' && dagonRes?.standardFeeMmk === 2500);
  const northDagonRes = lookupTownshipDelivery('North Dagon');
  check('Collision-Dagon', 'North Dagon (3500)', northDagonRes?.nameEn === 'North Dagon' && northDagonRes?.standardFeeMmk === 3500);
  const southDagonRes = lookupTownshipDelivery('South Dagon');
  check('Collision-Dagon', 'South Dagon (3500)', southDagonRes?.nameEn === 'South Dagon' && southDagonRes?.standardFeeMmk === 3500);
  const eastDagonRes = lookupTownshipDelivery('East Dagon');
  check('Collision-Dagon', 'East Dagon (4000)', eastDagonRes?.nameEn === 'East Dagon' && eastDagonRes?.standardFeeMmk === 4000);
  const dagonSeikkanRes = lookupTownshipDelivery('Dagon Seikkan');
  check('Collision-Dagon', 'Dagon Seikkan (4000)', dagonSeikkanRes?.nameEn === 'Dagon Seikkan' && dagonSeikkanRes?.standardFeeMmk === 4000);
  const dagonAyeyarRes = lookupTownshipDelivery('Dagon Ayeyar Highway Bus Terminal');
  check('Collision-Dagon', 'Dagon Ayeyar Highway Bus Terminal', dagonAyeyarRes?.nameEn === 'Dagon Ayeyar Highway Bus Terminal');
  const dagonAyeyarShortRes = lookupTownshipDelivery('Dagon Ayeyar');
  check('Collision-Dagon', 'Dagon Ayeyar', dagonAyeyarShortRes?.nameEn === 'Dagon Ayeyar Highway Bus Terminal' && dagonAyeyarShortRes?.codAvailable === false);
  const dagonAyeyarGateRes = lookupTownshipDelivery('Dagon Ayeyar Gate');
  check('Collision-Dagon', 'Dagon Ayeyar Gate', dagonAyeyarGateRes?.nameEn === 'Dagon Ayeyar Highway Bus Terminal');

  check('Collision-Dagon-MM', 'ဒဂုံ', lookupTownshipDelivery('ဒဂုံ')?.nameEn === 'Dagon');
  check('Collision-Dagon-MM', 'မြောက်ဒဂုံ', lookupTownshipDelivery('မြောက်ဒဂုံ')?.nameEn === 'North Dagon');
  check('Collision-Dagon-MM', 'ဒဂုံမြောက်', lookupTownshipDelivery('ဒဂုံမြောက်')?.nameEn === 'North Dagon');
  check('Collision-Dagon-MM', 'ဒဂုံမြို့သစ်မြောက်ပိုင်း', lookupTownshipDelivery('ဒဂုံမြို့သစ်မြောက်ပိုင်း')?.nameEn === 'North Dagon');
  check('Collision-Dagon-MM', 'တောင်ဒဂုံ', lookupTownshipDelivery('တောင်ဒဂုံ')?.nameEn === 'South Dagon');
  check('Collision-Dagon-MM', 'ဒဂုံတောင်', lookupTownshipDelivery('ဒဂုံတောင်')?.nameEn === 'South Dagon');
  check('Collision-Dagon-MM', 'ဒဂုံမြို့သစ်တောင်ပိုင်း', lookupTownshipDelivery('ဒဂုံမြို့သစ်တောင်ပိုင်း')?.nameEn === 'South Dagon');
  check('Collision-Dagon-MM', 'အရှေ့ဒဂုံ', lookupTownshipDelivery('အရှေ့ဒဂုံ')?.nameEn === 'East Dagon');
  check('Collision-Dagon-MM', 'ဒဂုံအရှေ့', lookupTownshipDelivery('ဒဂုံအရှေ့')?.nameEn === 'East Dagon');
  check('Collision-Dagon-MM', 'ဒဂုံမြို့သစ်အရှေ့ပိုင်း', lookupTownshipDelivery('ဒဂုံမြို့သစ်အရှေ့ပိုင်း')?.nameEn === 'East Dagon');
  check('Collision-Dagon-MM', 'ဒဂုံဆိပ်ကမ်း', lookupTownshipDelivery('ဒဂုံဆိပ်ကမ်း')?.nameEn === 'Dagon Seikkan');
  check('Collision-Dagon-MM', 'ဒဂုံဧရာ', lookupTownshipDelivery('ဒဂုံဧရာ')?.nameEn === 'Dagon Ayeyar Highway Bus Terminal');
  check('Collision-Dagon-MM', 'ဒဂုံဧရာ အဝေးပြေးဂိတ်', lookupTownshipDelivery('ဒဂုံဧရာ အဝေးပြေးဂိတ်')?.nameEn === 'Dagon Ayeyar Highway Bus Terminal');

  // Pathein vs Patheingyi
  const patheinEn = lookupTownshipDelivery('Pathein');
  check('Collision-Pathein', 'Pathein', patheinEn?.nameEn === 'Pathein' && patheinEn?.region === 'State/Region' && patheinEn?.codAvailable === false);
  const patheingyiEn = lookupTownshipDelivery('Patheingyi');
  check('Collision-Pathein', 'Patheingyi', patheingyiEn?.nameEn === 'Patheingyi' && patheingyiEn?.region === 'Mandalay' && patheingyiEn?.codAvailable === true);
  check('Collision-Pathein', 'Pathein Gyi', lookupTownshipDelivery('Pathein Gyi')?.nameEn === 'Patheingyi');
  check('Collision-Pathein', 'Pa Thein Gyi', lookupTownshipDelivery('Pa Thein Gyi')?.nameEn === 'Patheingyi');
  check('Collision-Pathein', 'ပုသိမ်', lookupTownshipDelivery('ပုသိမ်')?.nameEn === 'Pathein');
  check('Collision-Pathein', 'ပုသိမ်ကြီး', lookupTownshipDelivery('ပုသိမ်ကြီး')?.nameEn === 'Patheingyi');
  check('Collision-Pathein', 'ပုသိမ်မြို့', lookupTownshipDelivery('ပုသိမ်မြို့')?.nameEn === 'Pathein');
  check('Collision-Pathein', 'ပုသိမ်ကြီးမြို့နယ်', lookupTownshipDelivery('ပုသိမ်ကြီးမြို့နယ်')?.nameEn === 'Patheingyi');
  check('Collision-Pathein', 'Bassein', lookupTownshipDelivery('Bassein')?.nameEn === 'Pathein');

  // Hlaing vs Hlaingthaya
  check('Collision-Hlaing', 'Hlaing', lookupTownshipDelivery('Hlaing')?.nameEn === 'Hlaing' && lookupTownshipDelivery('Hlaing')?.standardFeeMmk === 2500);
  check('Collision-Hlaing', 'Hlaingthaya', lookupTownshipDelivery('Hlaingthaya')?.nameEn === 'Hlaingthaya' && lookupTownshipDelivery('Hlaingthaya')?.standardFeeMmk === 4000);
  check('Collision-Hlaing', 'Hlaing Tharyar', lookupTownshipDelivery('Hlaing Tharyar')?.nameEn === 'Hlaingthaya');
  check('Collision-Hlaing', 'လှိုင်', lookupTownshipDelivery('လှိုင်')?.nameEn === 'Hlaing');
  check('Collision-Hlaing', 'လှိုင်သာယာ', lookupTownshipDelivery('လှိုင်သာယာ')?.nameEn === 'Hlaingthaya');

  // Pyay vs Pyigyidagun vs Pyinmana
  const pyayRes = lookupTownshipDelivery('Pyay');
  check('Collision-Pyay', 'Pyay', pyayRes?.nameEn === 'Pyay' && pyayRes?.region === 'State/Region' && pyayRes?.codAvailable === false);
  const pyigyidagunRes = lookupTownshipDelivery('Pyigyidagun');
  check('Collision-Pyay', 'Pyigyidagun', pyigyidagunRes?.nameEn === 'Pyigyidagun' && pyigyidagunRes?.region === 'Mandalay' && pyigyidagunRes?.codAvailable === true);
  const pyinmanaRes = lookupTownshipDelivery('Pyinmana');
  check('Collision-Pyay', 'Pyinmana', pyinmanaRes?.nameEn === 'Pyinmana' && pyinmanaRes?.region === 'Naypyitaw' && pyinmanaRes?.codAvailable === true);
  check('Collision-Pyay', 'ပြည်', lookupTownshipDelivery('ပြည်')?.nameEn === 'Pyay' && lookupTownshipDelivery('ပြည်')?.codAvailable === false);
  check('Collision-Pyay', 'ပြည်ကြီးတံခွန်', lookupTownshipDelivery('ပြည်ကြီးတံခွန်')?.nameEn === 'Pyigyidagun');
  check('Collision-Pyay', 'ပျဉ်းမနား', lookupTownshipDelivery('ပျဉ်းမနား')?.nameEn === 'Pyinmana');

  // Okkalapa
  check('Collision-Okkala', 'South Okkalapa', lookupTownshipDelivery('South Okkalapa')?.nameEn === 'South Okkalapa');
  check('Collision-Okkala', 'North Okkalapa', lookupTownshipDelivery('North Okkalapa')?.nameEn === 'North Okkalapa');
  check('Collision-Okkala', 'တ/ဥ', lookupTownshipDelivery('တ/ဥ')?.nameEn === 'South Okkalapa');
  check('Collision-Okkala', 'မ/ဥ', lookupTownshipDelivery('မ/ဥ')?.nameEn === 'North Okkalapa');

  // Mingalar
  check('Collision-Mingalar', 'Mingaladon', lookupTownshipDelivery('Mingaladon')?.nameEn === 'Mingaladon');
  check('Collision-Mingalar', 'Mingalar Taung Nyunt', lookupTownshipDelivery('Mingalar Taung Nyunt')?.nameEn === 'Mingalar Taung Nyunt');
  check('Collision-Mingalar', 'Aung Mingalar Highway Bus Terminal', lookupTownshipDelivery('Aung Mingalar Highway Bus Terminal')?.nameEn === 'Aung Mingalar Highway Bus Terminal');
  check('Collision-Mingalar', 'Aung Mingalar', lookupTownshipDelivery('Aung Mingalar')?.nameEn === 'Aung Mingalar Highway Bus Terminal');

  // CATEGORY 3: Prefix/Suffix
  check('Fuzzy', 'Yangon Sanchaung', lookupTownshipDelivery('Yangon Sanchaung')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'Mandalay Chanayethazan', lookupTownshipDelivery('Mandalay Chanayethazan')?.nameEn === 'Chanayethazan');
  check('Fuzzy', 'Naypyitaw Zabuthiri', lookupTownshipDelivery('Naypyitaw Zabuthiri')?.nameEn === 'Zabuthiri');
  check('Fuzzy', 'ရန်ကုန် စမ်းချောင်း', lookupTownshipDelivery('ရန်ကုန် စမ်းချောင်း')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'မန္တလေး ချမ်းအေးသာစံ', lookupTownshipDelivery('မန္တလေး ချမ်းအေးသာစံ')?.nameEn === 'Chanayethazan');
  check('Fuzzy', 'နေပြည်တော် ဇမ္ဗူသီရိ', lookupTownshipDelivery('နေပြည်တော် ဇမ္ဗူသီရိ')?.nameEn === 'Zabuthiri');
  check('Fuzzy', 'Sanchaung Township', lookupTownshipDelivery('Sanchaung Township')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'Bahan tsp', lookupTownshipDelivery('Bahan tsp')?.nameEn === 'Bahan');
  check('Fuzzy', 'စမ်းချောင်းမြို့နယ်', lookupTownshipDelivery('စမ်းချောင်းမြို့နယ်')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'မော်လမြိုင်မြို့', lookupTownshipDelivery('မော်လမြိုင်မြို့')?.nameEn === 'Mawlamyine');
  check('Fuzzy', 'Aung Mingalar Gate', lookupTownshipDelivery('Aung Mingalar Gate')?.nameEn === 'Aung Mingalar Highway Bus Terminal');
  check('Fuzzy', 'အောင်မင်္ဂလာကားဂိတ်', lookupTownshipDelivery('အောင်မင်္ဂလာကားဂိတ်')?.nameEn === 'Aung Mingalar Highway Bus Terminal');
  check('Fuzzy', 'ဒဂုံဧရာဂိတ်', lookupTownshipDelivery('ဒဂုံဧရာဂိတ်')?.nameEn === 'Dagon Ayeyar Highway Bus Terminal');
  check('Fuzzy', 'Yangon Sanchaung Township', lookupTownshipDelivery('Yangon Sanchaung Township')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'ရန်ကုန် စမ်းချောင်းမြို့နယ်', lookupTownshipDelivery('ရန်ကုန် စမ်းချောင်းမြို့နယ်')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'မန္တလေး ချမ်းအေးသာစံမြို့နယ်', lookupTownshipDelivery('မန္တလေး ချမ်းအေးသာစံမြို့နယ်')?.nameEn === 'Chanayethazan');
  check('Zawgyi', 'ေက်ာက္တံတား', lookupTownshipDelivery('ေက်ာက္တံတား')?.nameEn === 'Kyauktada');
  check('Zawgyi', 'စမ္းေခ်ာင္း', lookupTownshipDelivery('စမ္းေခ်ာင္း')?.nameEn === 'Sanchaung');
  check('Zawgyi', 'ေတာင္ႀကီး', lookupTownshipDelivery('ေတာင္ႀကီး')?.nameEn === 'Taunggyi');
  check('Zawgyi', 'ျပည္ႀကီးတံခြန္', lookupTownshipDelivery('ျပည္ႀကီးတံခြန္')?.nameEn === 'Pyigyidagun');
  check('Zawgyi', 'မဂၤလာဒုံ', lookupTownshipDelivery('မဂၤလာဒုံ')?.nameEn === 'Mingaladon');
  check('Landmark', 'Chinatown Yangon', lookupTownshipDelivery('Chinatown Yangon')?.nameEn === 'Latha');
  check('Landmark', '8 Mile', lookupTownshipDelivery('8 Mile')?.nameEn === 'Mayangone');
  check('Landmark', '9 Mile', lookupTownshipDelivery('9 Mile')?.nameEn === 'Mayangone');
  check('Landmark', 'ဆရာစံ', lookupTownshipDelivery('ဆရာစံ')?.nameEn === 'Bahan');
  check('Landmark', 'ကျောက်မြောင်း', lookupTownshipDelivery('ကျောက်မြောင်း')?.nameEn === 'Tamwe');
  check('Landmark', 'သုဝဏ္ဏ', lookupTownshipDelivery('သုဝဏ္ဏ')?.nameEn === 'Thingangyun');
  check('Landmark', 'Moulmein', lookupTownshipDelivery('Moulmein')?.nameEn === 'Mawlamyine');
  check('Landmark', 'Pegu', lookupTownshipDelivery('Pegu')?.nameEn === 'Bago');
  check('Landmark', 'Prome', lookupTownshipDelivery('Prome')?.nameEn === 'Pyay');
  check('Landmark', 'Syriam', lookupTownshipDelivery('Syriam')?.nameEn === 'Thanlyin');
  check('Fuzzy', '  sAnChAuNg  ', lookupTownshipDelivery('  sAnChAuNg  ')?.nameEn === 'Sanchaung');
  check('Fuzzy', 'nOrTh dAgOn', lookupTownshipDelivery('nOrTh dAgOn')?.nameEn === 'North Dagon');

  // CATEGORY 4: Bus gates
  const busGates = [
    {
      nameEn: 'Aung Mingalar Highway Bus Terminal',
      aliases: ['Aung Mingalar', 'Aung Mingalar Gate', 'အောင်မင်္ဂလာ', 'အောင်မင်္ဂလာ ကားဂိတ်', 'အောင်မင်္ဂလာဂိတ်'],
    },
    {
      nameEn: 'Dagon Ayeyar Highway Bus Terminal',
      aliases: ['Dagon Ayeyar', 'Dagon Ayeyar Gate', 'ဒဂုံဧရာ', 'ဒဂုံဧရာ ကားဂိတ်', 'ဒဂုံဧရာဂိတ်'],
    },
    {
      nameEn: 'Saw Bwar Gyi Gone Bus Gate',
      aliases: ['Saw Bwar Gyi Gone', 'Sawbwa Gyi Gone', 'စော်ဘွားကြီးကုန်း', 'စော်ဘွားကြီးကုန်း ကားဂိတ်'],
    },
  ];

  for (const gate of busGates) {
    const info = lookupTownshipDelivery(gate.nameEn);
    check('BusGate', `${gate.nameEn}: fee 3500`, info?.standardFeeMmk === 3500 && info?.feeMmk === 3500);
    check('BusGate', `${gate.nameEn}: COD false`, info?.codAvailable === false && info?.isCodAvailable === false);
    check('BusGate', `${gate.nameEn}: estDays Prepaid Only`, info?.estDays?.includes('Prepaid Only') === true);
    check('BusGate', `${gate.nameEn}: isRegionalPrepaidOnly true`, isRegionalPrepaidOnly(gate.nameEn) === true);
    check('BusGate', `${gate.nameEn}: notes Drop-off fee`, info?.notes?.includes('Drop-off fee') === true);
    for (const alias of gate.aliases) {
      check('BusGate', `Alias "${alias}" maps to ${gate.nameEn}`, lookupTownshipDelivery(alias)?.nameEn === gate.nameEn);
      check('BusGate', `Alias "${alias}" triggers isRegionalPrepaidOnly === true`, isRegionalPrepaidOnly(alias) === true);
    }
  }

  // CATEGORY 5: Strict Prepaid Policy
  for (const item of yangonList) {
    check('Policy-YGN', `Yangon ${item.nameEn} false`, isRegionalPrepaidOnly(item.nameEn) === false);
    check('Policy-YGN', `Yangon ${item.nameMm} false`, isRegionalPrepaidOnly(item.nameMm) === false);
  }
  for (const item of mdyList) {
    check('Policy-MDY', `Mandalay ${item.nameEn} false`, isRegionalPrepaidOnly(item.nameEn) === false);
    check('Policy-MDY', `Mandalay ${item.nameMm} false`, isRegionalPrepaidOnly(item.nameMm) === false);
  }
  for (const item of nptList) {
    check('Policy-NPT', `Naypyitaw ${item.nameEn} false`, isRegionalPrepaidOnly(item.nameEn) === false);
    check('Policy-NPT', `Naypyitaw ${item.nameMm} false`, isRegionalPrepaidOnly(item.nameMm) === false);
  }
  for (const item of regList) {
    check('Policy-REG', `Regional/Gate ${item.nameEn} true`, isRegionalPrepaidOnly(item.nameEn) === true);
    check('Policy-REG', `Regional/Gate ${item.nameMm} true`, isRegionalPrepaidOnly(item.nameMm) === true);
  }

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
    check('Policy-Fallback', `Fallback "${kw}" true`, isRegionalPrepaidOnly(kw) === true);
  }

  const metroKeywords = ['Yangon', 'Mandalay', 'Naypyitaw', 'ရန်ကုန်', 'မန္တလေး', 'နေပြည်တော်'];
  for (const metro of metroKeywords) {
    check('Policy-Metro', `Metro indicator "${metro}" returns isRegionalPrepaidOnly === false`, isRegionalPrepaidOnly(metro) === false);
  }

  // CATEGORY 6: Dual-Aliased Contract
  let allDualAliased = true;
  for (const item of MYANMAR_DELIVERY_MATRIX) {
    const lookedUp = lookupTownshipDelivery(item.nameEn);
    if (!lookedUp) {
      allDualAliased = false;
      continue;
    }
    if (lookedUp.townshipEn !== lookedUp.nameEn) allDualAliased = false;
    if (lookedUp.townshipMm !== lookedUp.nameMm) allDualAliased = false;
    if (lookedUp.feeMmk !== lookedUp.standardFeeMmk) allDualAliased = false;
    if (lookedUp.isCodAvailable !== lookedUp.codAvailable) allDualAliased = false;
    if (lookedUp.estimatedDays !== lookedUp.estDays) allDualAliased = false;
  }
  check('Contract', 'All 61 matrix items expose 100% valid dual-aliased properties', allDualAliased);

  // CATEGORY 7: Adversarial Boundary & Collision-Pyay
  check('Negative', 'Empty string returns null', lookupTownshipDelivery('') === null);
  check('Negative', 'Whitespace returns null', lookupTownshipDelivery('   \t\n   ') === null);
  check('Negative', 'Null / undefined cast returns null', lookupTownshipDelivery(null as any) === null && lookupTownshipDelivery(undefined as any) === null);
  check('Negative', 'Number returns null', lookupTownshipDelivery(12345 as any) === null);
  check('Negative', 'Object returns null', lookupTownshipDelivery({} as any) === null);
  check('Negative', 'Tokyo returns null', lookupTownshipDelivery('Tokyo') === null);
  check('Negative', 'Bangkok returns null', lookupTownshipDelivery('Bangkok') === null);
  check('Negative', 'Singapore returns null', lookupTownshipDelivery('Singapore') === null);
  check('Negative', 'New York returns null', lookupTownshipDelivery('New York') === null);
  check('Negative', 'Gibberish returns null', lookupTownshipDelivery('xyzqwertyuiop12345') === null);

  // CRITICAL COLLISION-PYAY ASSERTIONS
  const nptRes = lookupTownshipDelivery('နေပြည်တော်');
  check('Collision-Pyay', 'Query "နေပြည်တော်" does NOT collide with Pyay (ပြည်)', nptRes?.nameEn !== 'Pyay');
  check('Collision-Pyay', 'Query "နေပြည်တော်" resolves to Zabuthiri', nptRes?.nameEn === 'Zabuthiri');

  const nptCityRes = lookupTownshipDelivery('နေပြည်တော်မြို့');
  check('Collision-Pyay', 'Query "နေပြည်တော်မြို့" does NOT collide with Pyay (ပြည်)', nptCityRes?.nameEn !== 'Pyay');
  check('Collision-Pyay', 'Query "နေပြည်တော်မြို့" resolves to Zabuthiri', nptCityRes?.nameEn === 'Zabuthiri');

  // Negative injection
  check('Negative', 'SQL injection returns null', lookupTownshipDelivery("' OR '1'='1; DROP TABLE townships;--") === null);
  check('Negative', 'HTML script injection returns null', lookupTownshipDelivery('<script>alert("hack")</script>') === null);
  check('Negative', 'Query "မြို့နယ်" alone returns null', lookupTownshipDelivery('မြို့နယ်') === null);
  check('Negative', 'Query "township" alone returns null', lookupTownshipDelivery('township') === null);
  check('Negative', 'Query "city" alone returns null', lookupTownshipDelivery('city') === null);

  const total = assertions.length;
  const passed = assertions.filter((a) => a.passed).length;
  const failed = total - passed;

  console.log(`\nTOTAL HARNESS ASSERTIONS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);

  if (failed === 0) {
    console.log('✅ ALL 100% PROPOSED HARNESS ASSERTIONS PASSED CLEANLY!');
  } else {
    console.error(`❌ ${failed} ASSERTIONS FAILED!`);
    process.exit(1);
  }
}

runFullHarness();
