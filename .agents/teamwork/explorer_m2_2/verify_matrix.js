// Verification Script for Myanmar Township Logistics Matrix (Milestone 2)
// explorer_m2_2 scratch verification

const MYANMAR_DELIVERY_MATRIX = [
  // --- YANGON DOWNTOWN & INNER MUNICIPAL (17 Townships - 2,500 MMK, 1-2 Days, COD: true) ---
  {
    nameMm: 'ကျောက်တံတား',
    nameEn: 'Kyauktada',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown / Inner Municipal',
    aliases: ['Kyauktada', 'Kyauktadaa', 'ကျောက်တံတား', 'ေက်ာက္တံတား', 'ကျောက်တံတားမြို့နယ်']
  },
  {
    nameMm: 'ပန်းဘဲတန်း',
    nameEn: 'Pabedan',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown / Inner Municipal',
    aliases: ['Pabedan', 'Pabedaan', 'ပန်းဘဲတန်း', 'ပန္းဘဲတန္း', 'ပန်းဘဲတန်းမြို့နယ်']
  },
  {
    nameMm: 'လသာ',
    nameEn: 'Latha',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown / Inner Municipal',
    aliases: ['Latha', 'Lathar', 'လသာ', 'လသာမြို့နယ်', 'Chinatown Yangon']
  },
  {
    nameMm: 'လမ်းမတော်',
    nameEn: 'Lanmadaw',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown / Inner Municipal',
    aliases: ['Lanmadaw', 'Lan Ma Daw', 'လမ်းမတော်', 'လမ္းမေတာ္', 'လမ်းမတော်မြို့နယ်']
  },
  {
    nameMm: 'ဗိုလ်တထောင်',
    nameEn: 'Botahtaung',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown / Inner Municipal',
    aliases: ['Botahtaung', 'Botataung', 'Bo Ta Htaung', 'ဗိုလ်တထောင်', 'ဗိုလ္တေထာင္', 'ဗိုလ်တထောင်မြို့နယ်']
  },
  {
    nameMm: 'ပုဇွန်တောင်',
    nameEn: 'Pazundaung',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown / Inner Municipal',
    aliases: ['Pazundaung', 'Pazuntaung', 'Pa Zun Daung', 'ပုဇွန်တောင်', 'ပုဇြန္ေတာင္', 'ပုဇွန်တောင်မြို့နယ်']
  },
  {
    nameMm: 'ဗဟန်း',
    nameEn: 'Bahan',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
    aliases: ['Bahan', 'Ba Han', 'ဗဟန်း', 'ဗဟန္း', 'ဗဟန်းမြို့နယ်', 'ဆရာစံ', 'Sayar San']
  },
  {
    nameMm: 'စမ်းချောင်း',
    nameEn: 'Sanchaung',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
    aliases: ['Sanchaung', 'San Chaung', 'စမ်းချောင်း', 'စမ္းေခ်ာင္း', 'စမ်းချောင်းမြို့နယ်', 'ရှင်စောပု', 'Shin Saw Pu']
  },
  {
    nameMm: 'ကမာရွတ်',
    nameEn: 'Kamayut',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
    aliases: ['Kamayut', 'Kamaryut', 'Ka Ma Yut', 'ကမာရွတ်', 'ကမာရြတ္', 'ကမာရွတ်မြို့နယ်', 'လှည်းတန်းစင်တာ']
  },
  {
    nameMm: 'လှည်းတန်း',
    nameEn: 'Hledan',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal (Kamayut Commercial Hub)',
    aliases: ['Hledan', 'Hle Dan', 'လှည်းတန်း', 'လွည္းတန္း', 'လှည်းတန်းဈေး', 'လှည်းတန်းလမ်းဆုံ']
  },
  {
    nameMm: 'ရန်ကင်း',
    nameEn: 'Yankin',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
    aliases: ['Yankin', 'Yan Kin', 'ရန်ကင်း', 'ရန္ကင္း', 'ရန်ကင်းမြို့နယ်', 'ရန်ကင်းစင်တာ']
  },
  {
    nameMm: 'တာမွေ',
    nameEn: 'Tamwe',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
    aliases: ['Tamwe', 'Tarmwe', 'Ta Mwe', 'တာမွေ', 'တာေမြ', 'တာမွေမြို့နယ်', 'ကျောက်မြောင်း', 'Kyaukmyaung']
  },
  {
    nameMm: 'လှိုင်',
    nameEn: 'Hlaing',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
    aliases: ['Hlaing', 'Hlaing Township', 'လှိုင်', 'လိႈင္', 'လှိုင်မြို့နယ်']
  },
  {
    nameMm: 'အလုံ',
    nameEn: 'Ahlone',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
    aliases: ['Ahlone', 'Ahlon', 'Ah Lone', 'အလုံ', 'အလံု', 'အလုံမြို့နယ်']
  },
  {
    nameMm: 'ဒဂုံ',
    nameEn: 'Dagon',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Downtown / Inner Municipal (Dagon Center / Embassy area)',
    aliases: ['Dagon', 'Dagon Township', 'ဒဂုံ', 'ဒဂံု', 'ဒဂုံမြို့နယ်', 'Downtown Dagon', 'မြို့ထဲဒဂုံ']
  },
  {
    nameMm: 'ကြည့်မြင်တိုင်',
    nameEn: 'Kyimyindaing',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
    aliases: ['Kyimyindaing', 'Kyimyindine', 'Kyeemyindaing', 'ကြည့်မြင်တိုင်', 'ကြည့္ျမင္တိုင္', 'ကြည့်မြင်တိုင်မြို့နယ်', 'ကျည့်မြင်တိုင်']
  },
  {
    nameMm: 'မင်္ဂလာတောင်ညွန့်',
    nameEn: 'Mingalar Taung Nyunt',
    region: 'Yangon',
    standardFeeMmk: 2500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Inner Municipal',
    aliases: ['Mingalar Taung Nyunt', 'Mingalar Taungnyunt', 'Mingalartaungnyunt', 'မင်္ဂလာတောင်ညွန့်', 'မဂၤလာေတာင္ၫြန္႔', 'မင်္ဂလာတောင်ညွန့်မြို့နယ်', 'မင်္ဂလာဈေး']
  },

  // --- YANGON SUBURBS & OUTER MUNICIPAL (17 Townships - 3,000–5,000 MMK, 1-3 Days, COD: true) ---
  {
    nameMm: 'မရမ်းကုန်း',
    nameEn: 'Mayangone',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Northern Outer Municipal',
    aliases: ['Mayangone', 'Mayangon', 'Ma Yangone', 'မရမ်းကုန်း', 'မရမ္းကုန္း', 'မရမ်းကုန်းမြို့နယ်', '၈မိုင်', '၉မိုင်', '8 Mile', '9 Mile']
  },
  {
    nameMm: 'တောင်ဥက္ကလာပ',
    nameEn: 'South Okkalapa',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Eastern Outer Municipal',
    aliases: ['South Okkalapa', 'South Okkala', 'Taung Okkalapa', 'Taung Okkala', 'တောင်ဥက္ကလာပ', 'ေတာင္ဥကၠလာပ', 'တောင်ဥက္ကလာ', 'ေတာင္ဥကၠလာ', 'တောင်ဥက္ကလာပမြို့နယ်', 'တ/ဥ']
  },
  {
    nameMm: 'မြောက်ဥက္ကလာပ',
    nameEn: 'North Okkalapa',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Eastern Outer Municipal',
    aliases: ['North Okkalapa', 'North Okkala', 'Myauk Okkalapa', 'Myauk Okkala', 'မြောက်ဥက္ကလာပ', 'ေျမာက္ဥကၠလာပ', 'မြောက်ဥက္ကလာ', 'ေျမာက္ဥကၠလာ', 'မြောက်ဥက္ကလာပမြို့နယ်', 'မ/ဥ']
  },
  {
    nameMm: 'သင်္ဃန်းကျွန်း',
    nameEn: 'Thingangyun',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Eastern Outer Municipal',
    aliases: ['Thingangyun', 'Thingankyun', 'Thin Gan Gyun', 'သင်္ဃန်းကျွန်း', 'သင္ဃန္းကြၽန္း', 'သင်္ဃန်းကျွန်းမြို့နယ်', 'သုဝဏ္ဏ', 'Thuwanna']
  },
  {
    nameMm: 'ဒေါပုံ',
    nameEn: 'Dawbon',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Southern Outer Municipal',
    aliases: ['Dawbon', 'Daw Bon', 'ဒေါပုံ', 'ေဒါပုံ', 'ဒေါပုံမြို့နယ်']
  },
  {
    nameMm: 'သာကေတ',
    nameEn: 'Thaketa',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Southern Outer Municipal',
    aliases: ['Thaketa', 'Tharkayta', 'Tha Kay Ta', 'သာကေတ', 'သာေကတ', 'သာကေတမြို့နယ်']
  },
  {
    nameMm: 'အင်းစိန်',
    nameEn: 'Insein',
    region: 'Yangon',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Northern Outer Municipal',
    aliases: ['Insein', 'In Sein', 'အင်းစိန်', 'အင္းစိန္', 'အင်းစိန်မြို့နယ်', 'ဖော့ကန်', 'Phaw Kan']
  },
  {
    nameMm: 'ဒဂုံမြို့သစ်မြောက်ပိုင်း',
    nameEn: 'North Dagon',
    region: 'Yangon',
    standardFeeMmk: 3500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Suburb Satellite Town',
    aliases: ['North Dagon', 'Dagon Myauk', 'Myauk Dagon', 'မြောက်ဒဂုံ', 'ေျမာက္ဒဂုံ', 'ဒဂုံမြောက်', 'ဒဂုံမြို့သစ်မြောက်ပိုင်း', 'ဒဂုံမြို့သစ်မြောက်ပိုင်းမြို့နယ်']
  },
  {
    nameMm: 'ဒဂုံမြို့သစ်တောင်ပိုင်း',
    nameEn: 'South Dagon',
    region: 'Yangon',
    standardFeeMmk: 3500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Yangon Suburb Satellite Town',
    aliases: ['South Dagon', 'Dagon Taung', 'Taung Dagon', 'တောင်ဒဂုံ', 'ေတာင္ဒဂုံ', 'ဒဂုံတောင်', 'ဒဂုံမြို့သစ်တောင်ပိုင်း', 'ဒဂုံမြို့သစ်တောင်ပိုင်းမြို့နယ်']
  },
  {
    nameMm: 'ဒဂုံမြို့သစ်အရှေ့ပိုင်း',
    nameEn: 'East Dagon',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Suburb Satellite Town',
    aliases: ['East Dagon', 'Dagon Ashae', 'Ashae Dagon', 'အရှေ့ဒဂုံ', 'အေရွ႕ဒဂုံ', 'ဒဂုံအရှေ့', 'ဒဂုံမြို့သစ်အရှေ့ပိုင်း', 'ဒဂုံမြို့သစ်အရှေ့ပိုင်းမြို့နယ်']
  },
  {
    nameMm: 'ဒဂုံဆိပ်ကမ်း',
    nameEn: 'Dagon Seikkan',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Suburb Satellite Town',
    aliases: ['Dagon Seikkan', 'Dagon Port', 'ဒဂုံဆိပ်ကမ်း', 'ဒဂုံဆိပ္ကမ္း', 'ဒဂုံဆိပ်ကမ်းမြို့နယ်']
  },
  {
    nameMm: 'လှိုင်သာယာ',
    nameEn: 'Hlaingthaya',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Western Suburb / Industrial Zone',
    aliases: ['Hlaingthaya', 'Hlaing Tharyar', 'Hlaing Thaya', 'လှိုင်သာယာ', 'လႈိင္သာယာ', 'လှိုင်သာယာမြို့နယ်']
  },
  {
    nameMm: 'ရွှေပြည်သာ',
    nameEn: 'Shwepyitha',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Northern Suburb / Industrial Zone',
    aliases: ['Shwepyitha', 'Shwe Pyi Thar', 'Shwe Pyi Tha', 'ရွှေပြည်သာ', 'ေရႊျပည္သာ', 'ရွှေပြည်သာမြို့နယ်']
  },
  {
    nameMm: 'မင်္ဂလာဒုံ',
    nameEn: 'Mingaladon',
    region: 'Yangon',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Northern Suburb / Airport Zone',
    aliases: ['Mingaladon', 'Mingalardon', 'Min Ga La Don', 'မင်္ဂလာဒုံ', 'မဂၤလာဒုံ', 'မင်္ဂလာဒုံမြို့နယ်', 'ထောက်ကြန့်', 'Htauk Kyant']
  },
  {
    nameMm: 'သန်လျင်',
    nameEn: 'Thanlyin',
    region: 'Yangon',
    standardFeeMmk: 4500,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Outer Suburb (Across river)',
    aliases: ['Thanlyin', 'Syriam', 'Than Lyin', 'သန်လျင်', 'သန္လ်င္', 'သန်လျင်မြို့နယ်']
  },
  {
    nameMm: 'ကျောက်တန်း',
    nameEn: 'Kyauktan',
    region: 'Yangon',
    standardFeeMmk: 5000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Outer Suburb / Port Zone',
    aliases: ['Kyauktan', 'Kyauk Tan', 'ကျောက်တန်း', 'ေက်ာက္တန္း', 'ကျောက်တန်းမြို့နယ်']
  },
  {
    nameMm: 'တွံတေး',
    nameEn: 'Twante',
    region: 'Yangon',
    standardFeeMmk: 5000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Yangon Outer Suburb',
    aliases: ['Twante', 'Twantay', 'Twan Te', 'တွံတေး', 'တြံေတး', 'တွံတေးမြို့နယ်']
  },

  // --- MANDALAY MUNICIPAL (7 Townships - 3,000–4,000 MMK, 1-2 Days, COD: true) ---
  {
    nameMm: 'ချမ်းအေးသာစံ',
    nameEn: 'Chanayethazan',
    region: 'Mandalay',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Downtown Municipal',
    aliases: ['Chanayethazan', 'Chan Aye Thar Zan', 'Chanayethazan Township', 'ချမ်းအေးသာစံ', 'ခ်မ္းေအးသာစံ', 'ချမ်းအေးသာစံမြို့နယ်', 'မန္တလေး ချမ်းအေးသာစံ']
  },
  {
    nameMm: 'မဟာအောင်မြေ',
    nameEn: 'Mahaaungmyay',
    region: 'Mandalay',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Inner Municipal',
    aliases: ['Mahaaungmyay', 'Maha Aung Myay', 'Maha Aung Mye', 'မဟာအောင်မြေ', 'မဟာေအာင္ေျမ', 'မဟာအောင်မြေမြို့နယ်', 'မန္တလေး မဟာအောင်မြေ']
  },
  {
    nameMm: 'အောင်မြေသာစံ',
    nameEn: 'Aungmyaythazan',
    region: 'Mandalay',
    standardFeeMmk: 3000,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Inner Municipal',
    aliases: ['Aungmyaythazan', 'Aung Mye Thar Zan', 'Aung Myay Thar Zan', 'အောင်မြေသာစံ', 'ေအာင္ေျမသာစံ', 'အောင်မြေသာစံမြို့နယ်', 'မန္တလေး အောင်မြေသာစံ']
  },
  {
    nameMm: 'ချမ်းမြသာစည်',
    nameEn: 'Chanmyathazi',
    region: 'Mandalay',
    standardFeeMmk: 3500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Southern Municipal',
    aliases: ['Chanmyathazi', 'Chan Mya Thar Si', 'Chan Mya Thazi', 'ချမ်းမြသာစည်', 'ခ်မ္းျမသာစည္', 'ချမ်းမြသာစည်မြို့နယ်', 'မန္တလေး ချမ်းမြသာစည်']
  },
  {
    nameMm: 'ပြည်ကြီးတံခွန်',
    nameEn: 'Pyigyidagun',
    region: 'Mandalay',
    standardFeeMmk: 3500,
    codAvailable: true,
    estDays: '1-2 Days',
    notes: 'Mandalay Southern Outer Municipal',
    aliases: ['Pyigyidagun', 'Pyi Gyi Ta Gon', 'Pyigyitagun', 'ပြည်ကြီးတံခွန်', 'ျပည္ႀကီးတံခြန္', 'ပြည်ကြီးတံခွန်မြို့နယ်', 'မန္တလေး ပြည်ကြီးတံခွန်']
  },
  {
    nameMm: 'အမရပူရ',
    nameEn: 'Amarapura',
    region: 'Mandalay',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Mandalay Outer Suburb',
    aliases: ['Amarapura', 'Amapura', 'Ama Ra Pu Ra', 'အမရပူရ', 'အမရပူရမြို့နယ်', 'တောင်သမန်', 'ဦးပိန်တံတား']
  },
  {
    nameMm: 'ပုသိမ်ကြီး',
    nameEn: 'Patheingyi',
    region: 'Mandalay',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Mandalay North-Eastern Suburb',
    aliases: ['Patheingyi', 'Pathein Gyi', 'Pa Thein Gyi', 'ပုသိမ်ကြီး', 'ပုသိမ္ႀကီး', 'ပုသိမ်ကြီးမြို့နယ်', 'မန္တလေး ပုသိမ်ကြီး']
  },

  // --- NAYPYITAW (6 Townships - 4,000–4,500 MMK, 2-3 Days, COD: true) ---
  {
    nameMm: 'ဇမ္ဗူသီရိ',
    nameEn: 'Zabuthiri',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Union Territory Central',
    aliases: ['Zabuthiri', 'Zabu Thiri', 'ဇမ္ဗူသီရိ', 'ဇမၺဴသီရိ', 'ဇမ္ဗူသီရိမြို့နယ်', 'နေပြည်တော် ဇမ္ဗူသီရိ']
  },
  {
    nameMm: 'ဥတ္တရသီရိ',
    nameEn: 'Ottarathiri',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Union Territory',
    aliases: ['Ottarathiri', 'Ottara Thiri', 'ဥတ္တရသီရိ', 'ဥတၱရသီရိ', 'ဥတ္တရသီရိမြို့နယ်', 'နေပြည်တော် ဥတ္တရသီရိ']
  },
  {
    nameMm: 'ဒက္ခိဏသီရိ',
    nameEn: 'Dekkhinathiri',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Union Territory',
    aliases: ['Dekkhinathiri', 'Dekkhina Thiri', 'Dakkina Thiri', 'ဒက္ခိဏသီရိ', 'ဒကၡိဏသီရိ', 'ဒက္ခိဏသီရိမြို့နယ်', 'နေပြည်တော် ဒက္ခိဏသီရိ']
  },
  {
    nameMm: 'ပုဗ္ဗသီရိ',
    nameEn: 'Pobbathiri',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Union Territory',
    aliases: ['Pobbathiri', 'Pobba Thiri', 'Pubba Thiri', 'ပုဗ္ဗသီရိ', 'ပုဗၺသီရိ', 'ပုဗ္ဗသီရိမြို့နယ်', 'နေပြည်တော် ပုဗ္ဗသီရိ']
  },
  {
    nameMm: 'ပျဉ်းမနား',
    nameEn: 'Pyinmana',
    region: 'Naypyitaw',
    standardFeeMmk: 4000,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Commercial Town',
    aliases: ['Pyinmana', 'Pyin Ma Na', 'ပျဉ်းမနား', 'ပ်ဥ္းမနား', 'ပျဉ်းမနားမြို့နယ်']
  },
  {
    nameMm: 'တပ်ကုန်း',
    nameEn: 'Tatkone',
    region: 'Naypyitaw',
    standardFeeMmk: 4500,
    codAvailable: true,
    estDays: '2-3 Days',
    notes: 'Naypyitaw Northern Township',
    aliases: ['Tatkone', 'Tatkon', 'Tat Kone', 'တပ်ကုန်း', 'တပ္ကုန္း', 'တပ်ကုန်းမြို့နယ်']
  },

  // --- REGIONAL MAJOR CITIES (11 Locations - 4,500–6,000 MMK, 2-5 Days, COD: false / 100% Prepaid) ---
  {
    nameMm: 'တောင်ကြီး',
    nameEn: 'Taunggyi',
    region: 'State/Region',
    standardFeeMmk: 5000,
    codAvailable: false,
    estDays: '3-4 Days (Prepaid Only)',
    notes: 'Shan State Capital; 100% Prepaid via KPay/WavePay; highway bus terminal dispatch',
    aliases: ['Taunggyi', 'Taung Gyi', 'တောင်ကြီး', 'ေတာင္ႀကီး', 'တောင်ကြီးမြို့', 'ရှမ်းတောင်']
  },
  {
    nameMm: 'မော်လမြိုင်',
    nameEn: 'Mawlamyine',
    region: 'State/Region',
    standardFeeMmk: 4500,
    codAvailable: false,
    estDays: '2-3 Days (Prepaid Only)',
    notes: 'Mon State Capital; 100% Prepaid via KPay/WavePay; highway bus gate drop-off',
    aliases: ['Mawlamyine', 'Moulmein', 'Maw La Myine', 'မော်လမြိုင်', 'ေမာ္လၿမိဳင္', 'မော်လမြိုင်မြို့']
  },
  {
    nameMm: 'ပဲခူး',
    nameEn: 'Bago',
    region: 'State/Region',
    standardFeeMmk: 4500,
    codAvailable: false,
    estDays: '2-3 Days (Prepaid Only)',
    notes: 'Bago Region Capital; 100% Prepaid via KPay/WavePay; highway bus gate drop-off',
    aliases: ['Bago', 'Pegu', 'ပဲခူး', 'ပဲခူးမြို့']
  },
  {
    nameMm: 'ပြည်',
    nameEn: 'Pyay',
    region: 'State/Region',
    standardFeeMmk: 4500,
    codAvailable: false,
    estDays: '2-3 Days (Prepaid Only)',
    notes: 'Bago Region West; 100% Prepaid via KPay/WavePay; highway bus gate drop-off',
    aliases: ['Pyay', 'Prome', 'ပြည်', 'ျပည္', 'ပြည်မြို့']
  },
  {
    nameMm: 'ပုသိမ်',
    nameEn: 'Pathein',
    region: 'State/Region',
    standardFeeMmk: 4500,
    codAvailable: false,
    estDays: '2-3 Days (Prepaid Only)',
    notes: 'Ayeyarwady Region Capital; 100% Prepaid via KPay/WavePay; Dagon Ayeyar bus gate dispatch',
    aliases: ['Pathein', 'Bassein', 'Pa Thein', 'ပုသိမ်', 'ပုသိမ္', 'ပုသိမ်မြို့']
  },
  {
    nameMm: 'မုံရွာ',
    nameEn: 'Monywa',
    region: 'State/Region',
    standardFeeMmk: 5000,
    codAvailable: false,
    estDays: '3-4 Days (Prepaid Only)',
    notes: 'Sagaing Region Commercial Hub; 100% Prepaid via KPay/WavePay; highway gate drop-off',
    aliases: ['Monywa', 'Mon Ywa', 'မုံရွာ', 'မုံရြာ', 'မုံရွာမြို့']
  },
  {
    nameMm: 'လားရှိုး',
    nameEn: 'Lashio',
    region: 'State/Region',
    standardFeeMmk: 5500,
    codAvailable: false,
    estDays: '4-5 Days (Prepaid Only)',
    notes: 'Northern Shan State Hub; 100% Prepaid via KPay/WavePay; highway gate drop-off',
    aliases: ['Lashio', 'La Shio', 'လားရှိုး', 'လားရိုး', 'လားရှိုးမြို့']
  },
  {
    nameMm: 'မကွေး',
    nameEn: 'Magway',
    region: 'State/Region',
    standardFeeMmk: 5000,
    codAvailable: false,
    estDays: '3-4 Days (Prepaid Only)',
    notes: 'Magway Region Capital; 100% Prepaid via KPay/WavePay; highway gate drop-off',
    aliases: ['Magway', 'Magwe', 'မကွေး', 'မေကြး', 'မကွေးမြို့']
  },
  {
    nameMm: 'မြစ်ကြီးနား',
    nameEn: 'Myitkyina',
    region: 'State/Region',
    standardFeeMmk: 6000,
    codAvailable: false,
    estDays: '4-5 Days (Prepaid Only)',
    notes: 'Kachin State Capital; 100% Prepaid via KPay/WavePay; highway gate drop-off',
    aliases: ['Myitkyina', 'Myit Kyi Na', 'မြစ်ကြီးနား', 'ျမစ္ႀကီးနား', 'မြစ်ကြီးနားမြို့']
  },
  {
    nameMm: 'စစ်တွေ',
    nameEn: 'Sittwe',
    region: 'State/Region',
    standardFeeMmk: 6000,
    codAvailable: false,
    estDays: '4-5 Days (Prepaid Only)',
    notes: 'Rakhine State Capital; 100% Prepaid via KPay/WavePay; air/highway terminal drop-off',
    aliases: ['Sittwe', 'Akyab', 'စစ်တွေ', 'စစ္ေတြ', 'စစ်တွေမြို့']
  },
  {
    nameMm: 'ထားဝယ်',
    nameEn: 'Dawei',
    region: 'State/Region',
    standardFeeMmk: 5500,
    codAvailable: false,
    estDays: '3-5 Days (Prepaid Only)',
    notes: 'Tanintharyi Region Capital; 100% Prepaid via KPay/WavePay; highway gate drop-off',
    aliases: ['Dawei', 'Tavoy', 'ထားဝယ်', 'ထားဝယ္', 'ထားဝယ်မြို့']
  },

  // --- HIGHWAY EXPRESS BUS TERMINALS (3 Gate Hubs - 3,500 MMK Drop-off Fee, COD: false / 100% Prepaid) ---
  {
    nameMm: 'အောင်မင်္ဂလာ အဝေးပြေးဂိတ်',
    nameEn: 'Aung Mingalar Highway Bus Terminal',
    region: 'State/Region',
    standardFeeMmk: 3500,
    codAvailable: false,
    estDays: '2-4 Days (Prepaid Only)',
    notes: 'Drop-off fee to Yangon Aung Mingalar gate. 100% Prepaid via KPay/WavePay; customer clears bus freight upon collection.',
    aliases: ['Aung Mingalar', 'Aung Mingalar Highway Bus Terminal', 'Aung Mingalar Gate', 'အောင်မင်္ဂလာ', 'ေအာင္မဂၤလာ', 'အောင်မင်္ဂလာ အဝေးပြေး', 'အောင်မင်္ဂလာ ကားဂိတ်', 'အောင်မင်္ဂလာဂိတ်', 'အောင်မင်္ဂလာအဝေးပြေးဂိတ်']
  },
  {
    nameMm: 'ဒဂုံဧရာ အဝေးပြေးဂိတ်',
    nameEn: 'Dagon Ayeyar Highway Bus Terminal',
    region: 'State/Region',
    standardFeeMmk: 3500,
    codAvailable: false,
    estDays: '2-4 Days (Prepaid Only)',
    notes: 'Drop-off fee to Yangon Dagon Ayeyar gate (Delta routes). 100% Prepaid via KPay/WavePay; customer clears bus freight upon collection.',
    aliases: ['Dagon Ayeyar', 'Dagon Ayeyar Highway Bus Terminal', 'Dagon Ayeyar Gate', 'ဒဂုံဧရာ', 'ဒဂုံဧရာ အဝေးပြေး', 'ဒဂုံဧရာ ကားဂိတ်', 'ဒဂုံဧရာဂိတ်', 'ဒဂုံဧရာအဝေးပြေးဂိတ်']
  },
  {
    nameMm: 'စော်ဘွားကြီးကုန်း ကားဂိတ်',
    nameEn: 'Saw Bwar Gyi Gone Bus Gate',
    region: 'State/Region',
    standardFeeMmk: 3500,
    codAvailable: false,
    estDays: '2-4 Days (Prepaid Only)',
    notes: 'Drop-off fee to Saw Bwar Gyi Gone gate (Upper Myanmar routes). 100% Prepaid via KPay/WavePay; customer clears bus freight upon collection.',
    aliases: ['Saw Bwar Gyi Gone', 'Saw Bwar Gyi Gone Bus Gate', 'Sawbwa Gyi Gone', 'စော်ဘွားကြီးကုန်း', 'စော်ဘွားကြီးကုန်း ကားဂိတ်', 'စော်ဘွားကြီးကုန်းဂိတ်', 'စော်ဘွားကြီးကုန်းကားဂိတ်']
  }
];

// Attach PROJECT.md contract aliases to each entry
function formatDeliveryInfo(entry) {
  if (!entry) return null;
  return {
    ...entry,
    townshipMm: entry.nameMm,
    townshipEn: entry.nameEn,
    feeMmk: entry.standardFeeMmk,
    isCodAvailable: entry.codAvailable,
    estimatedDays: entry.estDays
  };
}

// Build specificity-ordered search table
const SEARCH_ENTRIES = [];
for (const item of MYANMAR_DELIVERY_MATRIX) {
  const patterns = new Set([
    item.nameMm,
    item.nameEn.toLowerCase(),
    ...(item.aliases || []).map(a => a.toLowerCase().trim())
  ]);
  for (const p of patterns) {
    if (p) {
      SEARCH_ENTRIES.push({ pattern: p, item });
    }
  }
}
// Sort by pattern length descending for maximum specificity match
SEARCH_ENTRIES.sort((a, b) => b.pattern.length - a.pattern.length);

function lookupTownshipDelivery(query) {
  if (!query || typeof query !== 'string') return null;
  const rawTrimmed = query.trim();
  const queryLower = rawTrimmed.toLowerCase();

  // Tier 1: Exact matches against name or aliases
  for (const entry of SEARCH_ENTRIES) {
    if (queryLower === entry.pattern || rawTrimmed === entry.pattern) {
      return formatDeliveryInfo(entry.item);
    }
  }

  // Tier 2: Strip common prefixes and suffixes
  const stripped = queryLower
    .replace(/^(မန္တလေး|နေပြည်တော်|ရန်ကုန်|yangon|mandalay|naypyitaw)\s*/gi, '')
    .replace(/\s*(မြို့နယ်|မြို့|township|tsp|city|ကားဂိတ်|ဂိတ်|bus gate|gate)$/gi, '')
    .trim();

  if (stripped && stripped !== queryLower) {
    for (const entry of SEARCH_ENTRIES) {
      if (stripped === entry.pattern) {
        return formatDeliveryInfo(entry.item);
      }
    }
  }

  // Tier 3: Substring pattern matching (longest pattern first)
  for (const entry of SEARCH_ENTRIES) {
    // Only match patterns of length >= 3 to prevent accidental single-char/noise matches
    if (entry.pattern.length >= 3) {
      if (queryLower.includes(entry.pattern) || rawTrimmed.includes(entry.pattern)) {
        return formatDeliveryInfo(entry.item);
      }
    }
  }

  return null;
}

function isRegionalPrepaidOnly(query) {
  if (!query || typeof query !== 'string') return false;
  const matched = lookupTownshipDelivery(query);
  if (matched) {
    return !matched.codAvailable;
  }
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
  return regionalIndicators.some(k => normalized.includes(k));
}

// Verification Tests
function runTests() {
  console.log('--- Running Myanmar Townships Matrix Verification ---');
  let failures = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`FAIL: ${message}`);
      failures++;
    } else {
      console.log(`PASS: ${message}`);
    }
  }

  // Count checks
  assert(MYANMAR_DELIVERY_MATRIX.length === 61, `Total entries should be 61 (58 townships + 3 bus gates), got ${MYANMAR_DELIVERY_MATRIX.length}`);

  const yangon = MYANMAR_DELIVERY_MATRIX.filter(t => t.region === 'Yangon');
  assert(yangon.length === 34, `Yangon should have 34 entries, got ${yangon.length}`);

  const yangonInner = yangon.filter(t => t.standardFeeMmk === 2500);
  assert(yangonInner.length === 17, `Yangon Inner should have 17 entries at 2,500 MMK, got ${yangonInner.length}`);

  const yangonOuter = yangon.filter(t => t.standardFeeMmk > 2500);
  assert(yangonOuter.length === 17, `Yangon Outer should have 17 entries > 2,500 MMK, got ${yangonOuter.length}`);

  const mandalay = MYANMAR_DELIVERY_MATRIX.filter(t => t.region === 'Mandalay');
  assert(mandalay.length === 7, `Mandalay should have 7 entries, got ${mandalay.length}`);
  assert(mandalay.every(t => t.codAvailable === true), 'All Mandalay entries must have codAvailable === true');

  const naypyitaw = MYANMAR_DELIVERY_MATRIX.filter(t => t.region === 'Naypyitaw');
  assert(naypyitaw.length === 6, `Naypyitaw should have 6 entries, got ${naypyitaw.length}`);
  assert(naypyitaw.every(t => t.codAvailable === true), 'All Naypyitaw entries must have codAvailable === true');

  const regional = MYANMAR_DELIVERY_MATRIX.filter(t => t.region === 'State/Region');
  assert(regional.length === 14, `State/Region should have 14 entries (11 cities + 3 gates), got ${regional.length}`);
  assert(regional.every(t => t.codAvailable === false), 'All State/Region entries must have codAvailable === false');

  // Disambiguation tests
  const dagonMatch = lookupTownshipDelivery('Dagon');
  assert(dagonMatch && dagonMatch.nameEn === 'Dagon' && dagonMatch.standardFeeMmk === 2500, `Dagon should match Downtown Dagon (2,500 MMK), got ${dagonMatch?.nameEn} (${dagonMatch?.standardFeeMmk})`);

  const eastDagonMatch = lookupTownshipDelivery('East Dagon');
  assert(eastDagonMatch && eastDagonMatch.nameEn === 'East Dagon' && eastDagonMatch.standardFeeMmk === 4000, `East Dagon should match East Dagon (4,000 MMK), got ${eastDagonMatch?.nameEn} (${eastDagonMatch?.standardFeeMmk})`);

  const northDagonMatch = lookupTownshipDelivery('မြောက်ဒဂုံ');
  assert(northDagonMatch && northDagonMatch.nameEn === 'North Dagon' && northDagonMatch.standardFeeMmk === 3500, `မြောက်ဒဂုံ should match North Dagon (3,500 MMK), got ${northDagonMatch?.nameEn}`);

  const patheingyiMatch = lookupTownshipDelivery('Patheingyi');
  assert(patheingyiMatch && patheingyiMatch.nameEn === 'Patheingyi' && patheingyiMatch.region === 'Mandalay' && patheingyiMatch.codAvailable === true, `Patheingyi must match Mandalay with COD true, got ${patheingyiMatch?.nameEn} in ${patheingyiMatch?.region}`);

  const patheinMatch = lookupTownshipDelivery('Pathein');
  assert(patheinMatch && patheinMatch.nameEn === 'Pathein' && patheinMatch.region === 'State/Region' && patheinMatch.codAvailable === false, `Pathein must match Regional with COD false, got ${patheinMatch?.nameEn} in ${patheinMatch?.region}`);

  // Bus gate tests
  const aungMingalarMatch = lookupTownshipDelivery('အောင်မင်္ဂလာ အဝေးပြေးဂိတ်');
  assert(aungMingalarMatch && aungMingalarMatch.nameEn === 'Aung Mingalar Highway Bus Terminal' && aungMingalarMatch.standardFeeMmk === 3500 && aungMingalarMatch.codAvailable === false, 'Aung Mingalar bus gate lookup accurate');

  const dagonAyeyarMatch = lookupTownshipDelivery('Dagon Ayeyar');
  assert(dagonAyeyarMatch && dagonAyeyarMatch.nameEn === 'Dagon Ayeyar Highway Bus Terminal' && dagonAyeyarMatch.standardFeeMmk === 3500, 'Dagon Ayeyar bus gate lookup accurate');

  const sawBwarMatch = lookupTownshipDelivery('စော်ဘွားကြီးကုန်း');
  assert(sawBwarMatch && sawBwarMatch.nameEn === 'Saw Bwar Gyi Gone Bus Gate' && sawBwarMatch.standardFeeMmk === 3500, 'Saw Bwar Gyi Gone bus gate lookup accurate');

  // Prepaid check tests
  assert(isRegionalPrepaidOnly('Taunggyi') === true, 'Taunggyi is regional prepaid only');
  assert(isRegionalPrepaidOnly('တောင်ကြီး') === true, 'တောင်ကြီး is regional prepaid only');
  assert(isRegionalPrepaidOnly('Mawlamyine') === true, 'Mawlamyine is regional prepaid only');
  assert(isRegionalPrepaidOnly('အောင်မင်္ဂလာ') === true, 'အောင်မင်္ဂလာ is regional prepaid only');
  assert(isRegionalPrepaidOnly('Sanchaung') === false, 'Sanchaung is COD available (not prepaid only)');
  assert(isRegionalPrepaidOnly('စမ်းချောင်း') === false, 'စမ်းချောင်း is COD available (not prepaid only)');
  assert(isRegionalPrepaidOnly('မန္တလေး ချမ်းအေးသာစံ') === false, 'Chanayethazan is COD available');
  assert(isRegionalPrepaidOnly('နေပြည်တော် ဇမ္ဗူသီရိ') === false, 'Zabuthiri is COD available');
  assert(isRegionalPrepaidOnly('နယ်ဝေး ကားဂိတ်ပို့') === true, 'Generic bus gate query is prepaid only');

  // PROJECT.md contract aliases test
  const sanchaungInfo = lookupTownshipDelivery('စမ်းချောင်း');
  assert(sanchaungInfo.townshipMm === 'စမ်းချောင်း', 'contract alias townshipMm works');
  assert(sanchaungInfo.townshipEn === 'Sanchaung', 'contract alias townshipEn works');
  assert(sanchaungInfo.feeMmk === 2500, 'contract alias feeMmk works');
  assert(sanchaungInfo.isCodAvailable === true, 'contract alias isCodAvailable works');
  assert(sanchaungInfo.estimatedDays === '1-2 Days', 'contract alias estimatedDays works');

  if (failures === 0) {
    console.log('\n>>> ALL 26 TESTS PASSED CLEANLY! <<<');
  } else {
    console.error(`\n>>> ${failures} TESTS FAILED <<<`);
  }
}

runTests();
