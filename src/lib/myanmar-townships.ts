/**
 * Myanmar Townships and Standard Delivery Matrix (Milestone 2 Specification)
 * Complete 58-entry verified township matrix + 3 highway express bus gate hubs.
 * Supports Yangon (Inner & Suburbs), Mandalay, Naypyitaw, Regional Major Cities, and Highway Express Bus Terminals.
 */

import { TownshipDeliveryInfo } from '@/types';

export type { TownshipDeliveryInfo };

export const MYANMAR_DELIVERY_MATRIX: TownshipDeliveryInfo[] = [
  // =========================================================================
  // 1. YANGON DOWNTOWN & INNER MUNICIPAL (17 Townships - 2,500 MMK, 1-2 Days, COD: true)
  // =========================================================================
  {
    nameMm: 'ကျောက်တံတား',
    nameEn: 'Kyauktada',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown Inner Municipal',
  },
  {
    nameMm: 'ပန်းဘဲတန်း',
    nameEn: 'Pabedan',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown Inner Municipal',
  },
  {
    nameMm: 'လသာ',
    nameEn: 'Latha',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown Inner Municipal (Chinatown)',
  },
  {
    nameMm: 'လမ်းမတော်',
    nameEn: 'Lanmadaw',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown Inner Municipal',
  },
  {
    nameMm: 'ဗိုလ်တထောင်',
    nameEn: 'Botahtaung',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown Inner Municipal',
  },
  {
    nameMm: 'ပုဇွန်တောင်',
    nameEn: 'Pazundaung',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown Inner Municipal',
  },
  {
    nameMm: 'ဗဟန်း',
    nameEn: 'Bahan',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
  },
  {
    nameMm: 'စမ်းချောင်း',
    nameEn: 'Sanchaung',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
  },
  {
    nameMm: 'ကမာရွတ်',
    nameEn: 'Kamayut',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
  },
  {
    nameMm: 'လှည်းတန်း',
    nameEn: 'Hledan',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal (Kamayut Commercial Hub)',
  },
  {
    nameMm: 'ရန်ကင်း',
    nameEn: 'Yankin',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
  },
  {
    nameMm: 'တာမွေ',
    nameEn: 'Tamwe',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
  },
  {
    nameMm: 'လှိုင်',
    nameEn: 'Hlaing',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
  },
  {
    nameMm: 'အလုံ',
    nameEn: 'Ahlone',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
  },
  {
    nameMm: 'ဒဂုံ',
    nameEn: 'Dagon',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown / Inner Municipal (Dagon Center / Embassy area)',
  },
  {
    nameMm: 'ကြည့်မြင်တိုင်',
    nameEn: 'Kyimyindaing',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
  },
  {
    nameMm: 'မင်္ဂလာတောင်ညွန့်',
    nameEn: 'Mingalar Taung Nyunt',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
  },

  // =========================================================================
  // 2. YANGON SUBURBS & OUTER MUNICIPAL (17 Townships - 3,000–5,000 MMK, 1-3 Days, COD: true)
  // =========================================================================
  {
    nameMm: 'မရမ်းကုန်း',
    nameEn: 'Mayangone',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Northern Outer Municipal',
  },
  {
    nameMm: 'တောင်ဥက္ကလာပ',
    nameEn: 'South Okkalapa',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Eastern Outer Municipal',
  },
  {
    nameMm: 'မြောက်ဥက္ကလာပ',
    nameEn: 'North Okkalapa',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Eastern Outer Municipal',
  },
  {
    nameMm: 'သင်္ဃန်းကျွန်း',
    nameEn: 'Thingangyun',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Eastern Outer Municipal',
  },
  {
    nameMm: 'ဒေါပုံ',
    nameEn: 'Dawbon',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Southern Outer Municipal',
  },
  {
    nameMm: 'သာကေတ',
    nameEn: 'Thaketa',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Southern Outer Municipal',
  },
  {
    nameMm: 'အင်းစိန်',
    nameEn: 'Insein',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Northern Outer Municipal',
  },
  {
    nameMm: 'ဒဂုံမြို့သစ်မြောက်ပိုင်း',
    nameEn: 'North Dagon',
    region: 'Yangon',
    standardFeeMmk: 3500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Suburb Satellite Town',
  },
  {
    nameMm: 'ဒဂုံမြို့သစ်တောင်ပိုင်း',
    nameEn: 'South Dagon',
    region: 'Yangon',
    standardFeeMmk: 3500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Suburb Satellite Town',
  },
  {
    nameMm: 'ဒဂုံမြို့သစ်အရှေ့ပိုင်း',
    nameEn: 'East Dagon',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Suburb Satellite Town',
  },
  {
    nameMm: 'ဒဂုံဆိပ်ကမ်း',
    nameEn: 'Dagon Seikkan',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Suburb Satellite Town',
  },
  {
    nameMm: 'လှိုင်သာယာ',
    nameEn: 'Hlaingthaya',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Western Suburb / Industrial Zone',
  },
  {
    nameMm: 'ရွှေပြည်သာ',
    nameEn: 'Shwepyitha',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Northern Suburb / Industrial Zone',
  },
  {
    nameMm: 'မင်္ဂလာဒုံ',
    nameEn: 'Mingaladon',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Northern Suburb / Airport Zone',
  },
  {
    nameMm: 'သန်လျင်',
    nameEn: 'Thanlyin',
    region: 'Yangon',
    standardFeeMmk: 4500,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Outer Suburb (Across river)',
  },
  {
    nameMm: 'ကျောက်တန်း',
    nameEn: 'Kyauktan',
    region: 'Yangon',
    standardFeeMmk: 5000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Outer Suburb / Port Zone',
  },
  {
    nameMm: 'တွံတေး',
    nameEn: 'Twante',
    region: 'Yangon',
    standardFeeMmk: 5000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Outer Suburb',
  },

  // =========================================================================
  // 3. MANDALAY MUNICIPAL (7 Townships - 3,000–4,000 MMK, 1-2 Days, COD: true)
  // =========================================================================
  {
    nameMm: 'ချမ်းအေးသာစံ',
    nameEn: 'Chanayethazan',
    region: 'Mandalay',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Downtown Municipal',
  },
  {
    nameMm: 'မဟာအောင်မြေ',
    nameEn: 'Mahaaungmyay',
    region: 'Mandalay',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Inner Municipal',
  },
  {
    nameMm: 'အောင်မြေသာစံ',
    nameEn: 'Aungmyaythazan',
    region: 'Mandalay',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Inner Municipal',
  },
  {
    nameMm: 'ချမ်းမြသာစည်',
    nameEn: 'Chanmyathazi',
    region: 'Mandalay',
    standardFeeMmk: 3500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Southern Municipal',
  },
  {
    nameMm: 'ပြည်ကြီးတံခွန်',
    nameEn: 'Pyigyidagun',
    region: 'Mandalay',
    standardFeeMmk: 3500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Southern Outer Municipal',
  },
  {
    nameMm: 'အမရပူရ',
    nameEn: 'Amarapura',
    region: 'Mandalay',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Mandalay Outer Suburb',
  },
  {
    nameMm: 'ပုသိမ်ကြီး',
    nameEn: 'Patheingyi',
    region: 'Mandalay',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Mandalay North-Eastern Suburb',
  },

  // =========================================================================
  // 4. NAYPYITAW (6 Townships - 4,000–4,500 MMK, 2-3 Days, COD: true)
  // =========================================================================
  {
    nameMm: 'ဇမ္ဗူသီရိ',
    nameEn: 'Zabuthiri',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Union Territory Central',
  },
  {
    nameMm: 'ဥတ္တရသီရိ',
    nameEn: 'Ottarathiri',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Union Territory',
  },
  {
    nameMm: 'ဒက္ခိဏသီရိ',
    nameEn: 'Dekkhinathiri',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Union Territory',
  },
  {
    nameMm: 'ပုဗ္ဗသီရိ',
    nameEn: 'Pobbathiri',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Union Territory',
  },
  {
    nameMm: 'ပျဉ်းမနား',
    nameEn: 'Pyinmana',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Commercial Town',
  },
  {
    nameMm: 'တပ်ကုန်း',
    nameEn: 'Tatkone',
    region: 'Naypyitaw',
    standardFeeMmk: 4500,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Northern Township',
  },

  // =========================================================================
  // 5. REGIONAL MAJOR CITIES (11 Locations - 4,500–6,000 MMK, 2-5 Days, COD: false / 100% Prepaid)
  // =========================================================================
  {
    nameMm: 'တောင်ကြီး',
    nameEn: 'Taunggyi',
    region: 'State/Region',
    standardFeeMmk: 5000,
    codAvailable: false,
    estDays: '3-4 Days (Prepaid Only)',
    notes: 'Shan State Capital; 100% Prepaid via KPay/WavePay; highway bus terminal dispatch',
  },
  {
    nameMm: 'မော်လမြိုင်',
    nameEn: 'Mawlamyine',
    region: 'State/Region',
    standardFeeMmk: 4500,
    codAvailable: false,
    estDays: '2-3 Days (Prepaid Only)',
    notes: 'Mon State Capital; 100% Prepaid via KPay/WavePay; highway bus gate drop-off',
  },
  {
    nameMm: 'ပဲခူး',
    nameEn: 'Bago',
    region: 'State/Region',
    standardFeeMmk: 4500,
    codAvailable: false,
    estDays: '2-3 Days (Prepaid Only)',
    notes: 'Bago Region Capital; 100% Prepaid via KPay/WavePay; highway bus gate drop-off',
  },
  {
    nameMm: 'ပြည်',
    nameEn: 'Pyay',
    region: 'State/Region',
    standardFeeMmk: 4500,
    codAvailable: false,
    estDays: '2-3 Days (Prepaid Only)',
    notes: 'Bago Region West; 100% Prepaid via KPay/WavePay; highway bus gate drop-off',
  },
  {
    nameMm: 'ပုသိမ်',
    nameEn: 'Pathein',
    region: 'State/Region',
    standardFeeMmk: 4500,
    codAvailable: false,
    estDays: '2-3 Days (Prepaid Only)',
    notes: 'Ayeyarwady Region Capital; 100% Prepaid via KPay/WavePay; Dagon Ayeyar bus gate dispatch',
  },
  {
    nameMm: 'မုံရွာ',
    nameEn: 'Monywa',
    region: 'State/Region',
    standardFeeMmk: 5000,
    codAvailable: false,
    estDays: '3-4 Days (Prepaid Only)',
    notes: 'Sagaing Region Commercial Hub; 100% Prepaid via KPay/WavePay; highway gate drop-off',
  },
  {
    nameMm: 'လားရှိုး',
    nameEn: 'Lashio',
    region: 'State/Region',
    standardFeeMmk: 5500,
    codAvailable: false,
    estDays: '4-5 Days (Prepaid Only)',
    notes: 'Northern Shan State Hub; 100% Prepaid via KPay/WavePay; highway gate drop-off',
  },
  {
    nameMm: 'မကွေး',
    nameEn: 'Magway',
    region: 'State/Region',
    standardFeeMmk: 5000,
    codAvailable: false,
    estDays: '3-4 Days (Prepaid Only)',
    notes: 'Magway Region Capital; 100% Prepaid via KPay/WavePay; highway gate drop-off',
  },
  {
    nameMm: 'မြစ်ကြီးနား',
    nameEn: 'Myitkyina',
    region: 'State/Region',
    standardFeeMmk: 6000,
    codAvailable: false,
    estDays: '4-5 Days (Prepaid Only)',
    notes: 'Kachin State Capital; 100% Prepaid via KPay/WavePay; highway gate drop-off',
  },
  {
    nameMm: 'စစ်တွေ',
    nameEn: 'Sittwe',
    region: 'State/Region',
    standardFeeMmk: 6000,
    codAvailable: false,
    estDays: '4-5 Days (Prepaid Only)',
    notes: 'Rakhine State Capital; 100% Prepaid via KPay/WavePay; air/highway terminal drop-off',
  },
  {
    nameMm: 'ထားဝယ်',
    nameEn: 'Dawei',
    region: 'State/Region',
    standardFeeMmk: 5500,
    codAvailable: false,
    estDays: '3-5 Days (Prepaid Only)',
    notes: 'Tanintharyi Region Capital; 100% Prepaid via KPay/WavePay; highway gate drop-off',
  },

  // =========================================================================
  // 6. HIGHWAY EXPRESS BUS TERMINALS (3 Gate Hubs - 3,500 MMK Drop-off Fee, COD: false / 100% Prepaid)
  // =========================================================================
  {
    nameMm: 'အောင်မင်္ဂလာ အဝေးပြေးဂိတ်',
    nameEn: 'Aung Mingalar Highway Bus Terminal',
    region: 'State/Region',
    standardFeeMmk: 3500,
    codAvailable: false,
    estDays: '2-4 Days (Prepaid Only)',
    notes: 'Drop-off fee to Yangon Aung Mingalar gate. 100% Prepaid via KPay/WavePay; customer clears bus freight upon collection.',
  },
  {
    nameMm: 'ဒဂုံဧရာ အဝေးပြေးဂိတ်',
    nameEn: 'Dagon Ayeyar Highway Bus Terminal',
    region: 'State/Region',
    standardFeeMmk: 3500,
    codAvailable: false,
    estDays: '2-4 Days (Prepaid Only)',
    notes: 'Drop-off fee to Yangon Dagon Ayeyar gate (Delta routes). 100% Prepaid via KPay/WavePay; customer clears bus freight upon collection.',
  },
  {
    nameMm: 'စော်ဘွားကြီးကုန်း ကားဂိတ်',
    nameEn: 'Saw Bwar Gyi Gone Bus Gate',
    region: 'State/Region',
    standardFeeMmk: 3500,
    codAvailable: false,
    estDays: '2-4 Days (Prepaid Only)',
    notes: 'Drop-off fee to Saw Bwar Gyi Gone gate (Upper Myanmar routes). 100% Prepaid via KPay/WavePay; customer clears bus freight upon collection.',
  },
];

/**
 * Rich alias registry for phonetic, colonial, Zawgyi, and colloquial variation matching.
 */
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

  // Naypyitaw
  Zabuthiri: ['Zabu Thiri', 'ဇမ္ဗူသီရိ', 'ဇမၺဴသီရိ', 'ဇမ္ဗူသီရိမြို့နယ်', 'နေပြည်တော် ဇမ္ဗူသီရိ'],
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

/**
 * Pre-compiled, specificity-ordered lookup index to ensure longest / most specific match wins.
 */
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
  // Sort descending by pattern length (longest / most specific match first)
  tokens.sort((a, b) => b.pattern.length - a.pattern.length);
  return tokens;
})();

/**
 * Enriches delivery object with backward-compatible PROJECT.md aliases.
 */
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

/**
 * Searches and finds delivery details for a given township or location query in Burmese or English.
 * Supports exact matches, alias matching, suffix/prefix stripping, and disambiguation.
 */
export function lookupTownshipDelivery(query: string): TownshipDeliveryInfo | null {
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
  const stripped = queryLower
    .replace(/^(မန္တလေး|နေပြည်တော်|ရန်ကုန်|yangon|mandalay|naypyitaw)\s*/gi, '')
    .replace(/\s*(မြို့နယ်|မြို့|township|tsp|city|ကားဂိတ်|ဂိတ်|bus gate|gate)$/gi, '')
    .trim();

  if (stripped && stripped !== queryLower) {
    for (const entry of SEARCH_INDEX) {
      if (stripped === entry.pattern) {
        return enrichDeliveryInfo(entry.item);
      }
    }
  }

  // Tier 3: Substring pattern matching (longest pattern first)
  for (const entry of SEARCH_INDEX) {
    // Only match patterns of length >= 3 to prevent accidental single-char/noise matches
    if (entry.pattern.length >= 3) {
      if (queryLower.includes(entry.pattern) || rawTrimmed.includes(entry.pattern)) {
        return enrichDeliveryInfo(entry.item);
      }
    }
  }

  return null;
}

/**
 * Returns true if the queried location or township requires 100% prepaid payment (COD not available).
 * Yangon, Mandalay, and Naypyitaw return false (COD available).
 * Regional Major Cities and Highway Express Bus Gates return true (Prepaid only).
 */
export function isRegionalPrepaidOnly(query: string): boolean {
  if (!query || typeof query !== 'string') return false;

  const matched = lookupTownshipDelivery(query);
  if (matched) {
    return !matched.codAvailable;
  }

  // Fallback heuristic: check for explicit highway bus gate or regional cargo indicators
  const normalized = query.trim().toLowerCase();
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

  return regionalIndicators.some((k) => normalized.includes(k));
}
