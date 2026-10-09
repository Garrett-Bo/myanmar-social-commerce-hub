/**
 * Adversarial M2 NLP, Normalization & Logistics Stress-Test Probe
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
import { processCustomerMessage, AgentContext } from '../src/lib/gemini-agent';

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

export async function runAdversarialM2Probe() {
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS-TEST PROBE: BURMESE NLP & LOGISTICS');
  console.log('================================================================\n');

  // ----------------------------------------------------------------------------
  // SECTION 1: Zawgyi vs Unicode False Positive / False Negative Stress-Testing
  // ----------------------------------------------------------------------------
  console.log('--- SECTION 1: Zawgyi vs Unicode Discrimination Stress-Test ---');

  // 1.1 Heavy Pali subjoined stacked consonants in Unicode MUST NEVER be classified as Zawgyi
  const complexUnicodePali = [
    'ဗုဒ္ဓဘာသာ',     // Buddha (Da-dwe + Dha-zin-du)
    'ကဏ္ဍ',          // Kanda (Na-gyi + Da-yin-kauk)
    'သမ္မတ',         // President (Ma + Ma)
    'ဥက္ကဋ္ဌ',        // Chairman (Ka + Ka, Tta + Ttha)
    'ပစ္စည်း',        // Goods (Sa + Sa)
    'အန္တရာယ်',       // Danger (Na + Ta)
    'သန္နိဋ္ဌာန်',      // Determination
    'သိပ္ပံပညာ',      // Science (Pa + Sa-lone)
    'အင်္ဂါနေ့',       // Tuesday (Kinzi)
    'အဋ္ဌမ',         // Eighth
    'မင်္ဂလာပါ',       // Auspicious greeting
    'သင်္ဘော',        // Ship (Kinzi)
    'တက္ကသိုလ်',      // University (Ka + Ka)
  ];

  for (const text of complexUnicodePali) {
    assert(!isZawgyi(text), `Unicode Pali "${text}" is NOT detected as Zawgyi`);
    assert(normalizeBurmese(text) === text, `normalizeBurmese preserves Unicode Pali "${text}"`);
  }

  // 1.2 Common mixed English, Burglish, symbols and emojis
  const mixedPhrases = [
    'Order 1 item please Sanchaung deli bl lout ll?',
    'KPay no. 09-123456789 ပါ',
    'Hello 🌸 မင်္ဂလာပါ 📦 In-stock ရှိပါသလား?',
    'Lipstick #01 Red (12,000 MMK) မှာချင်လို့ပါ',
    'COD ရလားရှင့်?',
  ];

  for (const phrase of mixedPhrases) {
    assert(!isZawgyi(phrase), `Mixed phrase "${phrase}" is NOT Zawgyi`);
  }

  // 1.3 Genuine Zawgyi text must be identified
  const genuineZawgyi = [
    'ေစ်းဘယ္ေလာက္လဲ',
    'စမ္းေခ်ာင္း ပို့ခ',
    'ေရာင္းမည္',
    'မဂၤလာပါ',
    'ပစၥည္းရွိလား',
  ];
  for (const z of genuineZawgyi) {
    assert(isZawgyi(z), `Genuine Zawgyi "${z}" is detected as Zawgyi`);
  }

  // ----------------------------------------------------------------------------
  // SECTION 2: Lexical Letter Wa (ဝ) vs Numeric Zero (၀) Disambiguation
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Letter Wa vs Numeric Zero Disambiguation ---');

  // Lexical words where Wa (U+101D) is a consonant MUST NOT become digit 0
  const lexicalWaWords = [
    'ဝယ်မယ်',
    'ဝယ်ယူမည်',
    'ဝတ်စုံ',
    'ဝေဒနာ',
    'အဝတ်အစား',
    'အဝေးပြေးဂိတ်',
    'သဘာဝ',
    'ဘဝ',
    'ဝါဆို',
    'ဝက်သား',
    'ဝိညာဉ်',
    'ဝေဖန်ချက်',
  ];

  for (const word of lexicalWaWords) {
    const converted = convertBurmeseDigits(word);
    assert(converted === word, `Lexical word "${word}" preserves consonant Wa (got "${converted}")`);
    assert(!converted.includes('0'), `Lexical word "${word}" does not contain digit 0`);
  }

  // Complex sentences containing BOTH lexical Wa and numeric Wa
  const mixedWaSentence1 = 'ဝယ်ယူသူ ၁ဝ ယောက်အတွက် ဝတ်စုံ ဝယ်မယ်';
  const converted1 = convertBurmeseDigits(mixedWaSentence1);
  assert(converted1 === 'ဝယ်ယူသူ 10 ယောက်အတွက် ဝတ်စုံ ဝယ်မယ်', 'Correctly converts numeric "၁ဝ" to "10" while preserving "ဝယ်ယူသူ", "ဝတ်စုံ", "ဝယ်မယ်"');

  const mixedWaSentence2 = 'ပစ္စည်းဖိုး ၂ဝ,ဝဝဝ ကျပ် ကို ဝ၉-၇၉၈၇၆၅၄၃၂ သို့ KPay လွှဲပါ';
  const converted2 = convertBurmeseDigits(mixedWaSentence2);
  assert(converted2 === 'ပစ္စည်းဖိုး 20,000 ကျပ် ကို 09-798765432 သို့ KPay လွှဲပါ', 'Converts "၂ဝ,ဝဝဝ" to "20,000" and "ဝ၉-..." to "09-..."');

  const mixedWaSentence3 = 'အဝေးပြေးဂိတ်သို့ ပို့ခ ၃,၅ဝဝ ကျပ်';
  const converted3 = convertBurmeseDigits(mixedWaSentence3);
  assert(converted3 === 'အဝေးပြေးဂိတ်သို့ ပို့ခ 3,500 ကျပ်', 'Converts "၃,၅ဝဝ" to "3,500" while preserving "အဝေးပြေးဂိတ်"');

  // ----------------------------------------------------------------------------
  // SECTION 3: Myanmar Phone Number Normalizer Adversarial Cases
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Phone Normalizer Adversarial Testing ---');

  // Valid formats that must resolve to 09798765432
  const validFormats = [
    '09798765432',
    '09 798 765 432',
    '09-798-765-432',
    '09.798.765.432',
    '(09) 798 765 432',
    '+959798765432',
    '+95 9 798 765 432',
    '+95-9-798-765-432',
    '959798765432',
    '00959798765432',
    '+9509798765432',
    '9798765432',
    '၀၉၇၉၈၇၆၅၄၃၂',
    'ဝ၉၇၉၈၇၆၅၄၃၂',
    '၀၉-၇၉၈-၇၆၅-၄၃၂',
    'ဝ၉-၇၉၈-၇၆၅-၄၃၂',
    '๐၉၇၉၈၇၆၅၄၃၂',
    '႐႙၇၉၈၇၆၅၄၃၂',
    'Ph: 09 798 765 432',
    'ဖုန်းနံပါတ် 09-798-765-432 ပါ',
  ];

  for (const fmt of validFormats) {
    const normalized = normalizeMyanmarPhone(fmt);
    assert(normalized === '09798765432', `Phone input "${fmt}" normalizes to "09798765432" (got "${normalized}")`);
  }

  // Invalid formats that must return ''
  const invalidPhones = [
    '',
    '   ',
    'hello world',
    '12345',                  // too short
    '09123',                  // too short
    '0912345678901234',       // too long
    '+1 212 555 1234',        // US phone
    '+66 81 234 5678',        // Thai phone
    'KPay: 123456',           // random string
  ];

  for (const inv of invalidPhones) {
    const res = normalizeMyanmarPhone(inv);
    assert(res === '', `Invalid phone "${inv}" correctly rejected (got "${res}")`);
  }

  // ----------------------------------------------------------------------------
  // SECTION 4: Logistics Matrix & Disambiguation / Colonial Aliases
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Logistics Matrix Disambiguation & Aliases ---');

  // 4.1 Substring disambiguation
  const dagonTests = [
    { query: 'Dagon', expectedName: 'Dagon', fee: 2500, cod: true },
    { query: 'North Dagon', expectedName: 'North Dagon', fee: 3500, cod: true },
    { query: 'South Dagon', expectedName: 'South Dagon', fee: 3500, cod: true },
    { query: 'East Dagon', expectedName: 'East Dagon', fee: 4000, cod: true },
    { query: 'Dagon Seikkan', expectedName: 'Dagon Seikkan', fee: 4000, cod: true },
    { query: 'ဒဂုံ', expectedName: 'Dagon', fee: 2500, cod: true },
    { query: 'မြောက်ဒဂုံ', expectedName: 'North Dagon', fee: 3500, cod: true },
    { query: 'တောင်ဒဂုံ', expectedName: 'South Dagon', fee: 3500, cod: true },
    { query: 'အရှေ့ဒဂုံ', expectedName: 'East Dagon', fee: 4000, cod: true },
  ];

  for (const dt of dagonTests) {
    const res = lookupTownshipDelivery(dt.query);
    assert(
      res !== null && res.nameEn === dt.expectedName && res.standardFeeMmk === dt.fee && res.codAvailable === dt.cod,
      `Disambiguation "${dt.query}" -> ${dt.expectedName} (${dt.fee} MMK, COD: ${dt.cod})`
    );
  }

  // 4.2 Pathein vs Patheingyi
  const p1 = lookupTownshipDelivery('Pathein');
  assert(p1 !== null && p1.nameEn === 'Pathein' && p1.region === 'State/Region' && p1.codAvailable === false, 'Pathein -> Ayeyarwady (COD: false)');

  const p2 = lookupTownshipDelivery('Patheingyi');
  assert(p2 !== null && p2.nameEn === 'Patheingyi' && p2.region === 'Mandalay' && p2.codAvailable === true, 'Patheingyi -> Mandalay (COD: true)');

  // 4.3 Colonial aliases
  const colonialTests = [
    { query: 'Syriam', expected: 'Thanlyin' },
    { query: 'Pegu', expected: 'Bago' },
    { query: 'Prome', expected: 'Pyay' },
    { query: 'Bassein', expected: 'Pathein' },
    { query: 'Moulmein', expected: 'Mawlamyine' },
    { query: 'Akyab', expected: 'Sittwe' },
    { query: 'Tavoy', expected: 'Dawei' },
  ];

  for (const ct of colonialTests) {
    const res = lookupTownshipDelivery(ct.query);
    assert(res !== null && res.nameEn === ct.expected, `Colonial alias "${ct.query}" -> ${ct.expected}`);
  }

  // 4.4 Highway Express Bus Terminals
  const gates = [
    'Aung Mingalar Highway Bus Terminal',
    'အောင်မင်္ဂလာ',
    'ေအာင္မဂၤလာ',
    'အောင်မင်္ဂလာ ကားဂိတ်',
    'Dagon Ayeyar Highway Bus Terminal',
    'ဒဂုံဧရာ',
    'ဒဂုံဧရာ ကားဂိတ်',
    'Saw Bwar Gyi Gone Bus Gate',
    'စော်ဘွားကြီးကုန်း ကားဂိတ်',
  ];

  for (const g of gates) {
    const res = lookupTownshipDelivery(g);
    assert(res !== null && res.standardFeeMmk === 3500 && res.codAvailable === false, `Bus gate "${g}" -> 3,500 MMK, COD: false`);
    assert(isRegionalPrepaidOnly(g) === true, `isRegionalPrepaidOnly("${g}") is true`);
  }

  // ----------------------------------------------------------------------------
  // SECTION 5: Gemini Agent Integration Verification
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Gemini Agent Process Customer Message Integration ---');

  const mockShop = {
    id: 'shop-test-1',
    name: 'Glow Beauty House',
    ownerEmail: 'shop@test.com',
    kpayNumber: '09798765432',
    kpayName: 'Daw Mya Mya',
    waveNumber: '09798765432',
    waveName: 'Daw Mya Mya',
  };

  const mockProducts = [
    {
      id: 'prod-1',
      shopId: 'shop-test-1',
      sku: 'SKU-SERUM',
      nameMm: 'ဗီတာမင်စီ ဆီရမ်',
      nameEn: 'Vitamin C Serum',
      category: 'Skincare',
      priceMmk: 28000,
      stockQuantity: 15,
      imageUrl: 'https://example.com/serum.jpg',
      isAvailable: true,
    },
    {
      id: 'prod-2',
      shopId: 'shop-test-1',
      sku: 'SKU-LIPTINT',
      nameMm: 'နှုတ်ခမ်းနီ',
      nameEn: 'Lip Tint Velvet',
      category: 'Cosmetics',
      priceMmk: 12000,
      stockQuantity: 0,
      imageUrl: 'https://example.com/lip.jpg',
      isAvailable: false,
    },
  ];

  const agentContext: AgentContext = {
    shop: mockShop,
    products: mockProducts,
    customerName: 'Ko Aung',
    conversationHistory: [],
  };

  // 5.1 Test Inbound Message with Product + Township inquiry
  const customerMsg = 'မင်္ဂလာပါ ဆီရမ် စမ်းချောင်း ပို့ခ ဘယ်လောက်လဲရှင့်?';
  const response1 = await processCustomerMessage(customerMsg, agentContext);

  assert(response1.detectedTownship === 'Sanchaung', 'Agent detects township: Sanchaung');
  assert(response1.deliveryFeeMmk === 2500, 'Agent returns delivery fee: 2,500 MMK');
  assert(response1.detectedItems?.length === 1 && response1.detectedItems[0].productId === 'prod-1', 'Agent detects product: Vitamin C Serum');
  assert(response1.replyTextMm.includes('2,500 ကျပ်'), 'Reply contains delivery fee in MMK');
  assert(response1.replyTextMm.includes('စမ်းချောင်း'), 'Reply contains township name');

  // 5.2 Test Order Intent + Phone extraction
  const orderMsg = 'ဆီရမ် ၁ ဘူး ဝယ်မယ်။ ဖုန်း ၀၉-၇၉၈-၇၆၅-၄၃၂ ပါ။ စမ်းချောင်း';
  const response2 = await processCustomerMessage(orderMsg, agentContext);

  assert(response2.isOrderIntent === true, 'Agent recognizes order intent ("ဝယ်မယ်")');
  assert(response2.orderDraft !== undefined, 'Agent creates order draft');
  assert(response2.orderDraft?.customerPhone === '09798765432', 'Agent extracts normalized phone: 09798765432');
  assert(response2.orderDraft?.township === 'Sanchaung', 'Agent sets orderDraft.township: Sanchaung');
  assert(response2.orderDraft?.deliveryFeeMmk === 2500, 'Agent sets orderDraft.deliveryFeeMmk: 2,500');

  // 5.3 Test Regional Highway Gate Inquiry with COD check
  const regionalMsg = 'တောင်ကြီး ကားဂိတ် ပို့ပေးလား COD ရလား?';
  const response3 = await processCustomerMessage(regionalMsg, agentContext);

  assert(response3.detectedTownship === 'Taunggyi', 'Agent detects regional city: Taunggyi');
  assert(response3.deliveryFeeMmk === 5000, 'Agent returns regional delivery fee: 5,000 MMK');
  assert(response3.replyTextMm.includes('Prepaid Only') || response3.replyTextMm.includes('ကြိုလွှဲ'), 'Reply indicates prepaid only for regional dispatch');

  console.log('\n================================================================');
  console.log(`TOTAL ADVERSARIAL CHECKS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('\n>>> ADVERSARIAL STRESS PROBE: 100% CLEAN APPROVAL! <<<');
    process.exit(0);
  } else {
    console.error('\n>>> ADVERSARIAL STRESS PROBE FAILED! <<<');
    process.exit(1);
  }
}

runAdversarialM2Probe().catch((err) => {
  console.error('Adversarial probe execution error:', err);
  process.exit(1);
});
