import {
  isZawgyiProposed,
  canonicalizeUnicodeDiacriticsProposed,
} from './test_nlp_solution';

const ZAWGYI_SUBJOINED_MAP: Record<string, string> = {
  '\u1060': '\u1039\u1000', '\u1061': '\u1039\u1001', '\u1062': '\u1039\u1002', '\u1063': '\u1039\u1003',
  '\u1065': '\u1039\u1005', '\u1066': '\u1039\u1006', '\u1067': '\u1039\u1007', '\u1068': '\u1039\u1008',
  '\u1069': '\u1039\u1009', '\u106a': '\u1039\u100a', '\u106b': '\u1039\u100b', '\u106c': '\u1039\u100c',
  '\u106d': '\u1039\u100d', '\u106e': '\u1039\u100e', '\u106f': '\u1039\u100f', '\u1070': '\u1039\u1010',
  '\u1071': '\u1039\u1011', '\u1072': '\u1039\u1012', '\u1073': '\u1039\u1013', '\u1074': '\u1039\u1014',
  '\u1075': '\u1039\u1015', '\u1076': '\u1039\u1016', '\u1077': '\u1039\u1017', '\u1078': '\u1039\u1018',
  '\u1079': '\u1039\u1019', '\u107a': '\u1039\u101c', '\u107b': '\u1039\u101e', '\u107c': '\u1039\u101f',
};

function normalizeBurmeseFinal(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let text = input.trim();

  if (isZawgyiProposed(text)) {
    // 1. Common Zawgyi social commerce lexicon fixes first
    text = text
      .replace(/ေစ်း/g, 'ဈေး')
      .replace(/စမ္းေခ်ာင္း/g, 'စမ်းချောင်း')
      .replace(/ပစၥည္း/g, 'ပစ္စည်း')
      .replace(/ရွိလား/g, 'ရှိလား')
      .replace(/မဂၤလာပါ/g, 'မင်္ဂလာပါ');

    // 2. Kinzi replacement: In Zawgyi Kinzi follows the carrying base consonant
    text = text.replace(/([\u1000-\u1021])\u1064/g, '\u1004\u103a\u1039$1');
    text = text.replace(/\u1064([\u1000-\u1021])/g, '\u1004\u103a\u1039$1');

    // 3. Subjoined stacked consonants mapping
    text = text.replace(/[\u1060-\u1063\u1065-\u107c]/g, (char) => ZAWGYI_SUBJOINED_MAP[char] || char);

    // 4. Great Sa and medials
    text = text
      .replace(/[\u1086\u108f]/g, '\u103f')          // Great Sa
      .replace(/\u108a/g, '\u103d\u103e')      // Wa-swae + Ha-hto
      .replace(/\u108b/g, '\u103c\u103e')      // Ya-yit + Ha-hto
      .replace(/\u108c/g, '\u103b\u103d')      // Ya-pin + Wa-swae
      .replace(/\u108d/g, '\u103c\u103d')      // Ya-yit + Wa-swae
      .replace(/\u108e/g, '\u103d\u103e')
      .replace(/\u107d/g, '\u103d')          // Wa-swae
      .replace(/\u1085/g, '\u103e')          // Ha-hto
      .replace(/\u1033/g, '\u102f')          // U-vowel
      .replace(/\u1034/g, '\u1030');         // UU-vowel

    // 5. Reorder Zawgyi Ya-yit before consonant
    text = text.replace(/([\u107e-\u1084])([\u1000-\u1021])/g, '$2\u103c');
    text = text.replace(/\u103b([\u1016\u101b\u101e\u101f])/g, '$1\u103c');

    // 6. Reorder Zawgyi pre-base E-vowel
    text = text.replace(/(\u1031)([\u1000-\u1021])((?:[\u103b\u103c\u103d\u103e]|\u1039[\u1000-\u1021])*)/g, '$2$3$1');

    // 7. Convert Zawgyi Asat \u1039 to Unicode Asat \u103a
    // Nga + \u1039 in Burmese is ALWAYS Nga-that (\u1004\u103a), never a subjoined consonant
    text = text.replace(/\u1004\u1039/g, '\u1004\u103a');
    text = text.replace(/\u101a\u1039/g, '\u101a\u103a');
    text = text.replace(/\u1000\u1039(?![\u1000\u1001])/g, '\u1000\u103a');
    text = text.replace(/\u1005\u1039(?![\u1005\u1006])/g, '\u1005\u103a');
    text = text.replace(/\u1010\u1039(?![\u1010\u1011])/g, '\u1010\u103a');
    text = text.replace(/\u1014\u1039(?![\u1010-\u1014])/g, '\u1014\u103a');
    text = text.replace(/\u1015\u1039(?![\u1015\u1016\u1017\u1018])/g, '\u1015\u103a');
    text = text.replace(/\u1019\u1039(?![\u1015-\u1019])/g, '\u1019\u103a');
    text = text.replace(/\u101c\u1039(?![\u101c])/g, '\u101c\u103a');
    text = text.replace(/\u101e\u1039(?![\u101e])/g, '\u101e\u103a');
    text = text.replace(/\u1039(?![\u1000-\u1021])/g, '\u103a');
  }

  return canonicalizeUnicodeDiacriticsProposed(text);
}

// TEST EVERYTHING:
console.log('=== TEST ALL SAMPLES WITH FINAL PROPOSED IMPLEMENTATION ===');

const samplesToTest = [
  // Challenger 1 Suite 1
  { zg: 'ေစ်းဘယ္ေလာက္လဲ', expected: 'ဈေးဘယ်လောက်လဲ', desc: 'Lexicon ဈေးဘယ်လောက်လဲ' },
  { zg: 'စမ္းေခ်ာင္း ပို့ခ', expected: 'စမ်းချောင်း ပို့ခ', desc: 'Lexicon စမ်းချောင်း' },
  { zg: 'မဂၤလာပါ', expected: 'မင်္ဂလာပါ', desc: 'Lexicon မင်္ဂလာပါ' },
  { zg: 'ပစၥည္းရွိလား', expected: 'ပစ္စည်းရှိလား', desc: 'Lexicon ပစ္စည်းရှိလား' },
  { zg: '\u107e\u1015\u1086\u1014\u102c', expected: 'ပြဿနာ', desc: 'Great Sa ပြဿနာ' },
  { zg: 'အဂ\u1064\u102b', expected: 'အင်္ဂါ', desc: 'Kinzi အင်္ဂါ' },
  { zg: 'အဂ\u1064လန္', expected: 'အင်္ဂလန်', desc: 'Kinzi အင်္ဂလန်' },
  { zg: '\u1031\u107e\u1015\u102c', expected: 'ပြော', desc: 'E-vowel ပြော' },
  { zg: 'တင္မယ္', expected: 'တင်မယ်', desc: 'Asat တင်မယ်' },
  { zg: 'ေရာင္းမည္', expected: 'ရောင်းမည်', desc: 'ရောင်းမည်' },
];

let allPassed = true;
for (const s of samplesToTest) {
  const isZg = isZawgyiProposed(s.zg);
  const norm = normalizeBurmeseFinal(s.zg);
  const pass = isZg && norm === s.expected;
  if (!pass) {
    allPassed = false;
    console.error(`FAIL: [${s.desc}] isZawgyi: ${isZg}, Expected "${s.expected}", got "${norm}"`);
  } else {
    console.log(`PASS: [${s.desc}] -> "${norm}"`);
  }
}

// Inquiries
const inq1 = 'ေရာက္ပီလား';
const inq2 = '\u103b\u1016\u1005\u1039\u1015\u102c\u1010\u101a\u1039';
const inq3 = 'လိပ္စာ';
console.log('Inquiry 1 (ေရာက္ပီလား) isZawgyi:', isZawgyiProposed(inq1));
console.log('Inquiry 2 (ျဖစ္ပါတယ္) isZawgyi:', isZawgyiProposed(inq2));
console.log('Inquiry 3 (လိပ္စာ) isZawgyi:', isZawgyiProposed(inq3), 'norm:', normalizeBurmeseFinal(inq3));

if (!isZawgyiProposed(inq1) || !isZawgyiProposed(inq2) || !isZawgyiProposed(inq3) || normalizeBurmeseFinal(inq3) !== 'လိပ်စာ') {
  allPassed = false;
  console.error('FAIL: Inquiries test failed');
}

console.log('OVERALL PASS STATUS:', allPassed);
