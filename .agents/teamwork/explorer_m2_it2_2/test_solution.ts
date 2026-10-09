import { MYANMAR_DELIVERY_MATRIX, TownshipDeliveryInfo } from '../../../src/lib/myanmar-townships';

// Recreate the exact proposed implementation in our explorer sandbox

const TOWNSHIP_ALIASES: Record<string, string[]> = {
  // Yangon Inner
  Kyauktada: ['Kyauktadaa', 'ကျောက်တံတား', 'ေက်ာက္တံတား', 'ကျောက်တံတားမြို့နယ်'],
  Pabedan: ['Pabedaan', 'ပန်းဘဲတန်း', 'ပန္းဘဲတန္း', 'ပန်းဘဲတန်းမြို့နယ်'],
  Latha: ['Lathar', 'လသာ', 'လသာမြို့နယ်', 'Chinatown Yangon'],
  Lanmadaw: ['Lan Ma Daw', 'လမ်းမတော်', 'လမ္းမေတာ္', 'လမ်းမတော်မြို့နယ်'],
  Botahtaung: ['Botataung', 'Bo Ta Htaung', 'ဗိုလ်တထောင်', 'ဗိုလ္တေထာင္', 'ဗိုလ်တထောင်မြို့နယ်'],
  Pazundaung: ['Pazuntaung', 'Pa Zun Daung', 'ပုဇွန်တောင်', 'ပုဇြန္ေတာင္', 'ပုဇွန်တောင်မြို့နယ်'],
  Bahan: ['Ba Han', 'ဗဟန်း', 'ဗဟန္း', 'ဗဟန်းမြို့နယ်', 'ဆရာစံ', 'Sayar San'],
  Sanchaung: ['San Chaung', 'စမ်းချောင်း', 'စမ္းေခ်ာင္း', 'စမ်းချောင်းမြို့နယ်', 'ရှင်စောပု', 'Shin Saw Pu'],
  Kamayut: ['Kamaryut', 'Ka Ma Yut', 'ကမာရွတ်', 'ကမာရြတ္', 'ကမာရွတ်မြို့နယ်'],
  Hledan: ['Hle Dan', 'လှည်းတန်း', 'လွည္းတန္း', 'လှည်းတန်းဈေး', 'လှည်းတန်းလမ်းဆုံ', 'လှည်းတန်းစင်တာ'],
  Yankin: ['Yan Kin', 'ရန်ကင်း', 'ရန္ကင္း', 'ရန်ကင်းမြို့နယ်', 'ရန်ကင်းစင်တာ'],
  Tamwe: ['Tarmwe', 'Ta Mwe', 'တာမွေ', 'တာေမြ', 'တာမွေမြို့နယ်', 'ကျောက်မြောင်း', 'Kyaukmyaung'],
  Hlaing: ['Hlaing Township', 'လှိုင်', 'လိႈင္', 'လှိုင်မြို့နယ်'],
  Ahlone: ['Ahlon', 'Ah Lone', 'အလုံ', 'အလံု', 'အလုံမြို့နယ်'],
  Dagon: ['Dagon Township', 'ဒဂုံ', 'ဒဂံု', 'ဒဂုံမြို့နယ်', 'Downtown Dagon', 'မြို့ထဲဒဂုံ'],
  Kyimyindaing: ['Kyimyindine', 'Kyeemyindaing', 'ကြည့်မြင်တိုင်', 'ကြည့္ျမင္တိုင္', 'ကြည့်မြင်တိုင်မြို့နယ်', 'ကျည့်မြင်တိုင်'],
  'Mingalar Taung Nyunt': ['Mingalar Taungnyunt', 'Mingalartaungnyunt', 'မင်္ဂလာတောင်ညွန့်', 'မဂၤလာေတာင္ၫြန္႔', 'မင်္ဂလာတောင်ညွန့်မြို့နယ်', 'မင်္ဂလာဈေး'],

  // Yangon Outer
  Mayangone: ['Mayangon', 'Ma Yangone', 'မရမ်းကုန်း', 'မရမ္းကုန္း', 'မရမ်းကုန်းမြို့နယ်', '၈မိုင်', '၉မိုင်', '8 Mile', '9 Mile'],
  'South Okkalapa': ['South Okkala', 'Taung Okkalapa', 'Taung Okkala', 'တောင်ဥက္ကလာပ', 'ေတာင္ဥကၠလာပ', 'တောင်ဥက္ကလာ', 'ေတာင္ဥကၠလာ', 'တောင်ဥက္ကလာပမြို့နယ်', 'တ/ဥ'],
  'North Okkalapa': ['North Okkala', 'Myauk Okkalapa', 'Myauk Okkala', 'မြောက်ဥက္ကလာပ', 'ေျမာက္ဥကၠလာပ', 'မြောက်ဥက္ကလာ', 'ေျမာက္ဥကၠလာ', 'မြောက်ဥက္ကလာပမြို့နယ်', 'မ/ဥ'],
  Thingangyun: ['Thingankyun', 'Thin Gan Gyun', 'သင်္ဃန်းကျွန်း', 'သင္ဃန္းကြၽန္း', 'သင်္ဃန်းကျွန်းမြို့နယ်', 'သုဝဏ္ဏ', 'Thuwanna'],
  Dawbon: ['Daw Bon', 'ဒေါပုံ', 'ေဒါပုံ', 'ဒေါပုံမြို့နယ်'],
  Thaketa: ['Tharkayta', 'Tha Kay Ta', 'သာကေတ', 'သာေကတ', 'သာကေတမြို့နယ်'],
  Insein: ['In Sein', 'အင်းစိန်', 'အင္းစိန္', 'အင်းစိန်မြို့နယ်', 'ဖော့ကန်', 'Phaw Kan'],
  'North Dagon': ['Dagon Myauk', 'Myauk Dagon', 'မြောက်ဒဂုံ', 'ေျမာက္ဒဂုံ', 'ဒဂုံမြောက်', 'ဒဂုံမြို့သစ်မြောက်ပိုင်း', 'ဒဂုံမြို့သစ်မြောက်ပိုင်းမြို့နယ်'],
  'South Dagon': ['Dagon Taung', 'Taung Dagon', 'တောင်ဒဂုံ', 'ေတာင္ဒဂုံ', 'ဒဂုံတောင်', 'ဒဂုံမြို့သစ်တောင်ပိုင်း', 'ဒဂုံမြို့သစ်တောင်ပိုင်းမြို့နယ်'],
  'East Dagon': ['Dagon Ashae', 'Ashae Dagon', 'အရှေ့ဒဂုံ', 'အေရွ႕ဒဂုံ', 'ဒဂုံအရှေ့', 'ဒဂုံမြို့သစ်အရှေ့ပိုင်း', 'ဒဂုံမြို့သစ်အရှေ့ပိုင်းမြို့နယ်'],
  'Dagon Seikkan': ['Dagon Port', 'ဒဂုံဆိပ်ကမ်း', 'ဒဂုံဆိပ္ကမ္း', 'ဒဂုံဆိပ်ကမ်းမြို့နယ်'],
  Hlaingthaya: ['Hlaing Tharyar', 'Hlaing Thaya', 'လှိုင်သာယာ', 'လႈိင္သာယာ', 'လှိုင်သာယာမြို့နယ်'],
  Shwepyitha: ['Shwe Pyi Thar', 'Shwe Pyi Tha', 'ရွှေပြည်သာ', 'ေရႊျပည္သာ', 'ရွှေပြည်သာမြို့နယ်'],
  Mingaladon: ['Mingalardon', 'Min Ga La Don', 'မင်္ဂလာဒုံ', 'မဂၤလာဒုံ', 'မင်္ဂလာဒုံမြို့နယ်', 'ထောက်ကြန့်', 'Htauk Kyant'],
  Thanlyin: ['Syriam', 'Than Lyin', 'သန်လျင်', 'သန္လ်င္', 'သန်လျင်မြို့နယ်'],
  Kyauktan: ['Kyauk Tan', 'ကျောက်တန်း', 'ေက်ာက္တန္း', 'ကျောက်တန်းမြို့နယ်'],
  Twante: ['Twantay', 'Twan Te', 'တွံတေး', 'တြံေတး', 'တွံတေးမြို့နယ်'],

  // Mandalay
  Chanayethazan: ['Chan Aye Thar Zan', 'Chanayethazan Township', 'ချမ်းအေးသာစံ', 'ခ်မ္းေအးသာစံ', 'ချမ်းအေးသာစံမြို့နယ်', 'မန္တလေး ချမ်းအေးသာစံ'],
  Mahaaungmyay: ['Maha Aung Myay', 'Maha Aung Mye', 'မဟာအောင်မြေ', 'မဟာေအာင္ေျမ', 'မဟာအောင်မြေမြို့နယ်', 'မန္တလေး မဟာအောင်မြေ'],
  Aungmyaythazan: ['Aung Mye Thar Zan', 'Aung Myay Thar Zan', 'အောင်မြေသာစံ', 'ေအာင္ေျမသာစံ', 'အောင်မြေသာစံမြို့နယ်', 'မန္တလေး အောင်မြေသာစံ'],
  Chanmyathazi: ['Chan Mya Thar Si', 'Chan Mya Thazi', 'ချမ်းမြသာစည်', 'ခ်မ္းျမသာစည္', 'ချမ်းမြသာစည်မြို့နယ်', 'မန္တလေး ချမ်းမြသာစည်'],
  Pyigyidagun: ['Pyi Gyi Ta Gon', 'Pyigyitagun', 'ပြည်ကြီးတံခွန်', 'ျပည္ႀကီးတံခြန္', 'ပြည်ကြီးတံခွန်မြို့နယ်', 'မန္တလေး ပြည်ကြီးတံခွန်'],
  Amarapura: ['Amapura', 'Ama Ra Pu Ra', 'အမရပူရ', 'အမရပူရမြို့နယ်', 'တောင်သမန်', 'ဦးပိန်တံတား'],
  Patheingyi: ['Pathein Gyi', 'Pa Thein Gyi', 'ပုသိမ်ကြီး', 'ပုသိမ္ႀကီး', 'ပုသိမ်ကြီးမြို့နယ်', 'မန္တလေး ပုသိမ်ကြီး'],

  // Naypyitaw - PROPOSED FIX 1: Add standalone capital aliases to Zabuthiri
  Zabuthiri: [
    'Zabu Thiri',
    'ဇမ္ဗူသီရိ',
    'ဇမၺဴသီရိ',
    'ဇမ္ဗူသီရိမြို့နယ်',
    'နေပြည်တော် ဇမ္ဗူသီရိ',
    'နေပြည်တော်',
    'နေပြည်တော်မြို့',
    'naypyitaw',
  ],
  Ottarathiri: ['Ottara Thiri', 'ဥတ္တရသီရိ', 'ဥတၱရသီရိ', 'ဥတ္တရသီရိမြို့နယ်', 'နေပြည်တော် ဥတ္တရသီရိ'],
  Dekkhinathiri: ['Dekkhina Thiri', 'Dakkina Thiri', 'ဒက္ခိဏသီရိ', 'ဒကၡိဏသီရိ', 'ဒက္ခိဏသီရိမြို့နယ်', 'နေပြည်တော် ဒက္ခိဏသီရိ'],
  Pobbathiri: ['Pobba Thiri', 'Pubba Thiri', 'ပုဗ္ဗသီရိ', 'ပုဗၺသီရိ', 'ပုဗ္ဗသီရိမြို့နယ်', 'နေပြည်တော် ပုဗ္ဗသီရိ'],
  Pyinmana: ['Pyin Ma Na', 'ပျဉ်းမနား', 'ပ်ဥ္းမနား', 'ပျဉ်းမနားမြို့နယ်'],
  Tatkone: ['Tatkon', 'Tat Kone', 'တပ်ကုန်း', 'တပ္ကုန္း', 'တပ်ကုန်းမြို့နယ်'],

  // Regional Cities
  Taunggyi: ['Taung Gyi', 'တောင်ကြီး', 'ေတာင္ႀကီး', 'တောင်ကြီးမြို့', 'ရှမ်းတောင်'],
  Mawlamyine: ['Moulmein', 'Maw La Myine', 'မော်လမြိုင်', 'ေမာ္လၿမိဳင္', 'မော်လမြိုင်မြို့'],
  Bago: ['Pegu', 'ပဲခူး', 'ပဲခူးမြို့'],
  Pyay: ['Prome', 'ပြည်', 'ျပည္', 'ပြည်မြို့'],
  Pathein: ['Bassein', 'Pa Thein', 'ပုသိမ်', 'ပုသိမ္', 'ပုသိမ်မြို့'],
  Monywa: ['Mon Ywa', 'မုံရွာ', 'မုံရြာ', 'မုံရွာမြို့'],
  Lashio: ['La Shio', 'လားရှိုး', 'လားရိုး', 'လားရှိုးမြို့'],
  Magway: ['Magwe', 'မကွေး', 'မေကြး', 'မကွေးမြို့'],
  Myitkyina: ['Myit Kyi Na', 'မြစ်ကြီးနား', 'ျမစ္ႀကီးနား', 'မြစ်ကြီးနားမြို့'],
  Sittwe: ['Akyab', 'စစ်တွေ', 'စစ္ေတြ', 'စစ်တွေမြို့'],
  Dawei: ['Tavoy', 'ထားဝယ်', 'ထားဝယ္', 'ထားဝယ်မြို့'],

  // Bus Gates
  'Aung Mingalar Highway Bus Terminal': [
    'Aung Mingalar',
    'Aung Mingalar Gate',
    'အောင်မင်္ဂလာ',
    'ေအာင္မဂၤလာ',
    'အောင်မင်္ဂလာ အဝေးပြေး',
    'အောင်မင်္ဂလာ ကားဂိတ်',
    'အောင်မင်္ဂလာဂိတ်',
    'အောင်မင်္ဂလာအဝေးပြေးဂိတ်',
  ],
  'Dagon Ayeyar Highway Bus Terminal': [
    'Dagon Ayeyar',
    'Dagon Ayeyar Gate',
    'ဒဂုံဧရာ',
    'ဒဂုံဧရာ အဝေးပြေး',
    'ဒဂုံဧရာ ကားဂိတ်',
    'ဒဂုံဧရာဂိတ်',
    'ဒဂုံဧရာအဝေးပြေးဂိတ်',
  ],
  'Saw Bwar Gyi Gone Bus Gate': [
    'Saw Bwar Gyi Gone',
    'Sawbwa Gyi Gone',
    'စော်ဘွားကြီးကုန်း',
    'စော်ဘွားကြီးကုန်း ကားဂိတ်',
    'စော်ဘွားကြီးကုန်းဂိတ်',
    'စော်ဘွားကြီးကုန်းကားဂိတ်',
  ],
};

interface SearchToken {
  pattern: string;
  item: TownshipDeliveryInfo;
}

const SEARCH_INDEX: SearchToken[] = (() => {
  const tokens: SearchToken[] = [];
  for (const item of MYANMAR_DELIVERY_MATRIX) {
    const rawAliases = TOWNSHIP_ALIASES[item.nameEn] || [];
    const patterns = new Set([
      item.nameMm,
      item.nameEn.toLowerCase(),
      ...rawAliases.map((a) => a.toLowerCase().trim()),
    ]);
    for (const p of patterns) {
      if (p) {
        tokens.push({ pattern: p, item });
      }
    }
  }
  tokens.sort((a, b) => b.pattern.length - a.pattern.length);
  return tokens;
})();

function enrichDeliveryInfo(entry: TownshipDeliveryInfo): TownshipDeliveryInfo {
  return {
    ...entry,
    townshipMm: entry.nameMm,
    townshipEn: entry.nameEn,
    feeMmk: entry.standardFeeMmk,
    isCodAvailable: entry.codAvailable,
    estimatedDays: entry.estDays,
  };
}

export function lookupTownshipDeliveryProposed(query: string): TownshipDeliveryInfo | null {
  if (!query || typeof query !== 'string') return null;
  const rawTrimmed = query.trim();
  const queryLower = rawTrimmed.toLowerCase();

  // Tier 1: Exact matches against name or aliases
  for (const entry of SEARCH_INDEX) {
    if (queryLower === entry.pattern || rawTrimmed === entry.pattern) {
      return enrichDeliveryInfo(entry.item);
    }
  }

  // Tier 2: Strip common prefixes and suffixes
  // First, strip common suffixes (e.g. "စမ်းချောင်းမြို့နယ်", "မော်လမြိုင်မြို့", "နေပြည်တော်မြို့")
  const suffixStripped = queryLower
    .replace(/\s*(မြို့နယ်|မြို့|township|tsp|city|ကားဂိတ်|ဂိတ်|bus gate|gate)$/gi, '')
    .trim();

  if (suffixStripped && suffixStripped !== queryLower) {
    for (const entry of SEARCH_INDEX) {
      if (suffixStripped === entry.pattern) {
        return enrichDeliveryInfo(entry.item);
      }
    }
  }

  // Next, strip metro prefixes (e.g. "Yangon Sanchaung", "ရန်ကုန် စမ်းချောင်း")
  const targetForPrefix = suffixStripped || queryLower;
  const prefixStripped = targetForPrefix
    .replace(/^(မန္တလေး|နေပြည်တော်|ရန်ကုန်|yangon|mandalay|naypyitaw)\s*/gi, '')
    .trim();

  if (prefixStripped) {
    if (prefixStripped !== queryLower) {
      for (const entry of SEARCH_INDEX) {
        if (prefixStripped === entry.pattern) {
          return enrichDeliveryInfo(entry.item);
        }
      }
    }
  } else {
    // Prefix stripping collapsed the query to "" (i.e. query was purely a metro name like "Yangon", "မန္တလေး", "နေပြည်တော်")
    // If it's a known metro that maps to a township (e.g. Naypyitaw -> Zabuthiri), try matching the metro token itself.
    // Otherwise, it's a generic metro query (Yangon/Mandalay) without a township, so return null immediately
    // rather than falling through to Tier 3 substring search.
    const metroToken = queryLower.match(/^(မန္တလေး|နေပြည်တော်|ရန်ကုန်|yangon|mandalay|naypyitaw)/i)?.[0];
    if (metroToken) {
      for (const entry of SEARCH_INDEX) {
        if (metroToken === entry.pattern) {
          return enrichDeliveryInfo(entry.item);
        }
      }
      return null;
    }
  }

  // Tier 3: Substring pattern matching (longest pattern first)
  for (const entry of SEARCH_INDEX) {
    if (entry.pattern.length >= 3) {
      if (queryLower.includes(entry.pattern) || rawTrimmed.includes(entry.pattern)) {
        return enrichDeliveryInfo(entry.item);
      }
    }
  }

  return null;
}

export function isRegionalPrepaidOnlyProposed(query: string): boolean {
  if (!query || typeof query !== 'string') return false;

  const matched = lookupTownshipDeliveryProposed(query);
  if (matched) {
    return !matched.codAvailable;
  }

  const normalized = query.trim().toLowerCase();

  // Highway bus gate or regional cargo indicators ALWAYS require prepaid
  const regionalIndicators = [
    'ကားဂိတ်',
    'အဝေးပြေး',
    'ဂိတ်ချ',
    'တန်ဆာခ',
    'နယ်ဝေး',
    'နယ်စုံ',
    'highway',
    'express gate',
    'bus gate',
    'bus terminal',
    'prepaid only',
  ];

  if (regionalIndicators.some((k) => normalized.includes(k))) {
    return true;
  }

  // Pure metro region indicators (Yangon, Mandalay, Naypyitaw) support COD -> return false
  const metroIndicators = ['yangon', 'mandalay', 'naypyitaw', 'ရန်ကုန်', 'မန္တလေး', 'နေပြည်တော်'];
  if (metroIndicators.some((k) => normalized.includes(k))) {
    return false;
  }

  return false;
}

console.log('--- TESTING PROPOSED SOLUTION ---');
const metroQueries = ['Yangon', 'Mandalay', 'Naypyitaw', 'ရန်ကုန်', 'မန္တလေး', 'နေပြည်တော်', 'နေပြည်တော်မြို့'];
for (const q of metroQueries) {
  const looked = lookupTownshipDeliveryProposed(q);
  const prepaid = isRegionalPrepaidOnlyProposed(q);
  console.log(`Query "${q}" -> Township: ${looked?.nameEn} (${looked?.region}), PrepaidOnly: ${prepaid}`);
}

console.log('--- TESTING PYAY AND GATES ---');
const testQueries = ['Pyay', 'ပြည်', 'ပြည်မြို့', 'Pyinmana', 'ပျဉ်းမနား', 'Pyigyidagun', 'ပြည်ကြီးတံခွန်', 'Aung Mingalar Gate', 'မန္တလေး အဝေးပြေးကားဂိတ်'];
for (const q of testQueries) {
  const looked = lookupTownshipDeliveryProposed(q);
  const prepaid = isRegionalPrepaidOnlyProposed(q);
  console.log(`Query "${q}" -> Township: ${looked?.nameEn} (${looked?.region}), PrepaidOnly: ${prepaid}`);
}
