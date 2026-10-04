/**
 * Myanmar Townships and Standard Delivery Matrix
 * Supports Yangon (Downtown, Municipal, Suburbs), Mandalay, Naypyitaw, and Regional Highway Gates.
 */

export interface TownshipDeliveryInfo {
  nameMm: string;
  nameEn: string;
  region: 'Yangon' | 'Mandalay' | 'Naypyitaw' | 'State/Region';
  standardFeeMmk: number;
  codAvailable: boolean;
  estDays: string;
}

export const MYANMAR_DELIVERY_MATRIX: TownshipDeliveryInfo[] = [
  // --- YANGON DOWNTOWN & INNER MUNICIPAL ---
  { nameMm: 'ကျောက်တံတား', nameEn: 'Kyauktada', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ပန်းဘဲတန်း', nameEn: 'Pabedan', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'လသာ', nameEn: 'Latha', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'လမ်းမတော်', nameEn: 'Lanmadaw', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ဗိုလ်တထောင်', nameEn: 'Botahtaung', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ပုဇွန်တောင်', nameEn: 'Pazundaung', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ဗဟန်း', nameEn: 'Bahan', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'စမ်းချောင်း', nameEn: 'Sanchaung', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ကမာရွတ်', nameEn: 'Kamayut', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'လှည်းတန်း', nameEn: 'Hledan', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ရန်ကင်း', nameEn: 'Yankin', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'တာမွေ', nameEn: 'Tamwe', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'မရမ်းကုန်း', nameEn: 'Mayangone', region: 'Yangon', standardFeeMmk: 3000, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'လှိုင်', nameEn: 'Hlaing', region: 'Yangon', standardFeeMmk: 2500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'တောင်ဥက္ကလာပ', nameEn: 'South Okkalapa', region: 'Yangon', standardFeeMmk: 3000, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'မြောက်ဥက္ကလာပ', nameEn: 'North Okkalapa', region: 'Yangon', standardFeeMmk: 3000, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'သင်္ဃန်းကျွန်း', nameEn: 'Thingangyun', region: 'Yangon', standardFeeMmk: 3000, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ဒဂုံမြို့သစ်မြောက်ပိုင်း', nameEn: 'North Dagon', region: 'Yangon', standardFeeMmk: 3500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ဒဂုံမြို့သစ်တောင်ပိုင်း', nameEn: 'South Dagon', region: 'Yangon', standardFeeMmk: 3500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ဒဂုံမြို့သစ်အရှေ့ပိုင်း', nameEn: 'East Dagon', region: 'Yangon', standardFeeMmk: 4000, codAvailable: true, estDays: '2-3 Days' },
  { nameMm: 'အင်းစိန်', nameEn: 'Insein', region: 'Yangon', standardFeeMmk: 3000, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'လှိုင်သာယာ', nameEn: 'Hlaingthaya', region: 'Yangon', standardFeeMmk: 4000, codAvailable: true, estDays: '2-3 Days' },
  { nameMm: 'ရွှေပြည်သာ', nameEn: 'Shwepyitha', region: 'Yangon', standardFeeMmk: 4000, codAvailable: true, estDays: '2-3 Days' },
  { nameMm: 'သန်လျင်', nameEn: 'Thanlyin', region: 'Yangon', standardFeeMmk: 4500, codAvailable: true, estDays: '2-3 Days' },

  // --- MANDALAY ---
  { nameMm: 'ချမ်းအေးသာစံ', nameEn: 'Chanayethazan', region: 'Mandalay', standardFeeMmk: 3000, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'မဟာအောင်မြေ', nameEn: 'Mahaaungmyay', region: 'Mandalay', standardFeeMmk: 3000, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'အောင်မြေသာစံ', nameEn: 'Aungmyaythazan', region: 'Mandalay', standardFeeMmk: 3000, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ချမ်းမြသာစည်', nameEn: 'Chanmyathazi', region: 'Mandalay', standardFeeMmk: 3500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'ပြည်ကြီးတံခွန်', nameEn: 'Pyigyidagun', region: 'Mandalay', standardFeeMmk: 3500, codAvailable: true, estDays: '1-2 Days' },
  { nameMm: 'အမရပူရ', nameEn: 'Amarapura', region: 'Mandalay', standardFeeMmk: 4000, codAvailable: true, estDays: '2-3 Days' },

  // --- NAYPYITAW ---
  { nameMm: 'ဇမ္ဗူသီရိ', nameEn: 'Zabuthiri', region: 'Naypyitaw', standardFeeMmk: 4000, codAvailable: true, estDays: '2-3 Days' },
  { nameMm: 'ဥတ္တရသီရိ', nameEn: 'Ottarathiri', region: 'Naypyitaw', standardFeeMmk: 4000, codAvailable: true, estDays: '2-3 Days' },
  { nameMm: 'ပျဉ်းမနား', nameEn: 'Pyinmana', region: 'Naypyitaw', standardFeeMmk: 4000, codAvailable: true, estDays: '2-3 Days' },

  // --- REGIONAL HIGHWAY EXPRESS GATES (နယ်ဝေး ကားဂိတ်ပို့) ---
  { nameMm: 'အောင်မင်္ဂလာ အဝေးပြေးဂိတ်', nameEn: 'Aung Mingalar Highway Bus Terminal', region: 'State/Region', standardFeeMmk: 3500, codAvailable: false, estDays: '2-4 Days (Prepaid Only)' },
  { nameMm: 'ဒဂုံဧရာ အဝေးပြေးဂိတ်', nameEn: 'Dagon Ayeyar Highway Bus Terminal', region: 'State/Region', standardFeeMmk: 3500, codAvailable: false, estDays: '2-4 Days (Prepaid Only)' },
  { nameMm: 'တောင်ကြီး', nameEn: 'Taunggyi', region: 'State/Region', standardFeeMmk: 5000, codAvailable: false, estDays: '3-4 Days (Royal/MGL Express)' },
  { nameMm: 'မော်လမြိုင်', nameEn: 'Mawlamyine', region: 'State/Region', standardFeeMmk: 4500, codAvailable: false, estDays: '2-3 Days (Kyeepwar Express)' },
  { nameMm: 'လားရှိုး', nameEn: 'Lashio', region: 'State/Region', standardFeeMmk: 5500, codAvailable: false, estDays: '4-5 Days (Highway Gate)' },
];

/**
 * Searches and finds delivery details for a given township or location query in Burmese or English.
 */
export function lookupTownshipDelivery(query: string): TownshipDeliveryInfo | null {
  if (!query) return null;
  const normalized = query.trim().toLowerCase();

  return (
    MYANMAR_DELIVERY_MATRIX.find(
      (item) =>
        item.nameEn.toLowerCase().includes(normalized) ||
        item.nameMm.includes(query.trim()) ||
        normalized.includes(item.nameEn.toLowerCase()) ||
        query.trim().includes(item.nameMm)
    ) || null
  );
}
