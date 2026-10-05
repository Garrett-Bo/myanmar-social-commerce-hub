import { describe, it, expect } from 'vitest';
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

describe('Milestone 2: Burmese NLP, Digit Normalization & Logistics Matrix', () => {
  describe('1. Zawgyi vs Unicode Detection & Normalization', () => {
    it('detects Zawgyi text accurately', () => {
      expect(isZawgyi('ေစ်းဘယ္ေလာက္လဲ')).toBe(true);
      expect(isZawgyi('စမ္းေခ်ာင္း ပို့ခ')).toBe(true);
      expect(isZawgyi('ေရာင္းမည္')).toBe(true);
      expect(isZawgyi('မဂၤလာပါ')).toBe(true);
      expect(isZawgyi('ပစၥည္းရွိလား')).toBe(true);
    });

    it('identifies standard Unicode text without false positives', () => {
      expect(isZawgyi('ဈေးဘယ်လောက်လဲ')).toBe(false);
      expect(isZawgyi('စမ်းချောင်း မြို့နယ် ပို့ဆောင်ခ')).toBe(false);
      expect(isZawgyi('မင်္ဂလာပါရှင်')).toBe(false);
      expect(isZawgyi('ကျေးဇူးတင်ပါတယ်')).toBe(false);
      expect(isZawgyi('ချက်ချင်း ပို့ပေးပါ')).toBe(false);
      expect(isZawgyi('တက္ကသိုလ်ရိပ်သာလမ်း')).toBe(false);
      expect(isZawgyi('Glow Serum 10%')).toBe(false);
      expect(isZawgyi('')).toBe(false);
    });

    it('converts Zawgyi to Unicode cleanly', () => {
      expect(normalizeBurmese('ေစ်းဘယ္ေလာက္လဲ')).toBe('ဈေးဘယ်လောက်လဲ');
      expect(normalizeBurmese('စမ္းေခ်ာင္း ပို့ခ')).toBe('စမ်းချောင်း ပို့ခ');
      expect(normalizeBurmese('ေရာင္းမည္')).toBe('ရောင်းမည်');
      expect(normalizeBurmese('မဂၤလာပါ')).toBe('မင်္ဂလာပါ');
      expect(normalizeBurmese('ပစၥည္းရွိလား')).toBe('ပစ္စည်းရှိလား');
    });

    it('preserves Unicode Ya-pin and English text', () => {
      expect(normalizeBurmese('ကျေးဇူးတင်ပါတယ်')).toBe('ကျေးဇူးတင်ပါတယ်');
      expect(normalizeBurmese('ချက်ချင်း')).toBe('ချက်ချင်း');
      expect(normalizeBurmese('ပျော်ရွှင်')).toBe('ပျော်ရွှင်');
      expect(normalizeBurmese('Serum 1 bottle Sanchaung deli bl lout ll?')).toBe(
        'Serum 1 bottle Sanchaung deli bl lout ll?'
      );
    });
  });

  describe('2. Burmese / Thai / Shan Digit Normalization', () => {
    it('translates Burmese and Shan digits and Thai zero', () => {
      expect(convertBurmeseDigits('၀၁၂၃၄၅၆၇၈၉')).toBe('0123456789');
      expect(convertBurmeseDigits('႐႑႒႓႔႕႖႗႘႙')).toBe('0123456789');
      expect(convertBurmeseDigits('၂၈၀၀၀ ကျပ်')).toBe('28000 ကျပ်');
      expect(convertBurmeseDigits('အရေအတွက် ၃ ခု')).toBe('အရေအတွက် 3 ခု');
      expect(convertBurmeseDigits('๐၉၇၉၈၇၆၅၄၃၂')).toBe('09798765432');
    });

    it('contextually translates letter Wa in numeric strings', () => {
      expect(convertBurmeseDigits('ဝ၉၇၉၈၇၆၅၄၃၂')).toBe('09798765432');
      expect(convertBurmeseDigits('Ph: ဝ၉-၄၅၁၁၂၂၃၃၄')).toBe('Ph: 09-451122334');
      expect(convertBurmeseDigits('09-4ဝဝ-11223')).toBe('09-400-11223');
      expect(convertBurmeseDigits('၁ဝ,ဝဝဝ')).toBe('10,000');
      expect(convertBurmeseDigits('5ဝ0')).toBe('500');
      expect(convertBurmeseDigits('၂ဝ')).toBe('20');
    });

    it('preserves letter Wa in real Burmese vocabulary words', () => {
      expect(convertBurmeseDigits('ဝယ်မယ်')).toBe('ဝယ်မယ်');
      expect(convertBurmeseDigits('ဝတ်စုံ')).toBe('ဝတ်စုံ');
      expect(convertBurmeseDigits('အဝတ်အစား')).toBe('အဝတ်အစား');
      expect(convertBurmeseDigits('ဝေဒနာ')).toBe('ဝေဒနာ');
      expect(convertBurmeseDigits('အဝါရောင်')).toBe('အဝါရောင်');
      expect(convertBurmeseDigits('အဝေးပြေးဂိတ်')).toBe('အဝေးပြေးဂိတ်');
    });
  });

  describe('3. Myanmar Phone Normalization', () => {
    it('normalizes domestic, international, and typo formats to 09XXXXXXXXX', () => {
      expect(normalizeMyanmarPhone('09798765432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('09 798 765 432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('09-798-765-432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('09.798.765.432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('9798765432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('+959798765432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('+95 9 798 765 432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('959798765432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('00959798765432')).toBe('09798765432');
      expect(normalizeMyanmarPhone('၀၉၇၉၈၇၆၅၄၃၂')).toBe('09798765432');
      expect(normalizeMyanmarPhone('ဝ၉၇၉၈၇၆၅၄၃၂')).toBe('09798765432');
      expect(normalizeMyanmarPhone('ဝ၉-၄၅၁၁၂၂၃၃၄')).toBe('09451122334');
      expect(normalizeMyanmarPhone('๐၉၂၅၀၀၉၉၈၈၇')).toBe('09250099887');
      expect(normalizeMyanmarPhone('႐႙၇၉၈၇၆၅၄၃၂')).toBe('09798765432');
    });

    it('returns empty string for non-phone inputs', () => {
      expect(normalizeMyanmarPhone('')).toBe('');
      expect(normalizeMyanmarPhone('invalid')).toBe('');
      expect(normalizeMyanmarPhone('12345')).toBe('');
    });
  });

  describe('4. Canonical Tone Mark Order and Deduplication', () => {
    it('deduplicates tone marks and reorders Visarga after Dot Below', () => {
      expect(canonicalizeUnicodeDiacritics('ပြီးး')).toBe('ပြီး');
      expect(canonicalizeUnicodeDiacritics('တဲ့့')).toBe('တဲ့');
      expect(canonicalizeUnicodeDiacritics('စမ်း\u1038\u1037')).toBe('စမ်း\u1037\u1038');
      expect(canonicalizeUnicodeDiacritics('န\u1037\u1032')).toBe('န\u1032\u1037');
    });
  });

  describe('5. 58 Townships + 3 Highway Bus Gates Logistics Matrix', () => {
    it('contains all 61 verified delivery locations', () => {
      expect(MYANMAR_DELIVERY_MATRIX.length).toBe(61);
      const yangon = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Yangon');
      const mdy = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Mandalay');
      const npt = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'Naypyitaw');
      const reg = MYANMAR_DELIVERY_MATRIX.filter((t) => t.region === 'State/Region');

      expect(yangon.length).toBe(34);
      expect(mdy.length).toBe(7);
      expect(npt.length).toBe(6);
      expect(reg.length).toBe(14); // 11 regional cities + 3 bus gates
    });

    it('resolves Yangon downtown flat 2,500 MMK with COD', () => {
      const sanchaung = lookupTownshipDelivery('Sanchaung');
      expect(sanchaung).not.toBeNull();
      expect(sanchaung?.standardFeeMmk).toBe(2500);
      expect(sanchaung?.codAvailable).toBe(true);
      expect(isRegionalPrepaidOnly('Sanchaung')).toBe(false);

      const kyauktada = lookupTownshipDelivery('ကျောက်တံတား');
      expect(kyauktada?.standardFeeMmk).toBe(2500);
      expect(kyauktada?.codAvailable).toBe(true);
    });

    it('prevents substring collisions (Dagon vs North Dagon vs East Dagon)', () => {
      const dagon = lookupTownshipDelivery('Dagon');
      expect(dagon?.nameEn).toBe('Dagon');
      expect(dagon?.standardFeeMmk).toBe(2500);

      const northDagon = lookupTownshipDelivery('North Dagon');
      expect(northDagon?.nameEn).toBe('North Dagon');
      expect(northDagon?.standardFeeMmk).toBe(3500);

      const eastDagon = lookupTownshipDelivery('East Dagon');
      expect(eastDagon?.nameEn).toBe('East Dagon');
      expect(eastDagon?.standardFeeMmk).toBe(4000);

      const myaukDagonMm = lookupTownshipDelivery('မြောက်ဒဂုံ');
      expect(myaukDagonMm?.nameEn).toBe('North Dagon');
      expect(myaukDagonMm?.standardFeeMmk).toBe(3500);
    });

    it('prevents substring collision between Patheingyi (Mandalay) and Pathein (Ayeyarwady)', () => {
      const patheingyi = lookupTownshipDelivery('Patheingyi');
      expect(patheingyi?.nameEn).toBe('Patheingyi');
      expect(patheingyi?.region).toBe('Mandalay');
      expect(patheingyi?.codAvailable).toBe(true);

      const pathein = lookupTownshipDelivery('Pathein');
      expect(pathein?.nameEn).toBe('Pathein');
      expect(pathein?.region).toBe('State/Region');
      expect(pathein?.codAvailable).toBe(false);
    });

    it('enforces 100% prepaid requirement for regional cities and bus gates', () => {
      expect(isRegionalPrepaidOnly('Taunggyi')).toBe(true);
      expect(isRegionalPrepaidOnly('တောင်ကြီး')).toBe(true);
      expect(isRegionalPrepaidOnly('မော်လမြိုင်')).toBe(true);
      expect(isRegionalPrepaidOnly('Lashio')).toBe(true);
      expect(isRegionalPrepaidOnly('Aung Mingalar Highway Bus Terminal')).toBe(true);
      expect(isRegionalPrepaidOnly('အောင်မင်္ဂလာ အဝေးပြေးဂိတ်')).toBe(true);
      expect(isRegionalPrepaidOnly('Dagon Ayeyar Highway Bus Terminal')).toBe(true);
      expect(isRegionalPrepaidOnly('Saw Bwar Gyi Gone Bus Gate')).toBe(true);
    });

    it('exposes contract dual aliases seamlessly', () => {
      const info = lookupTownshipDelivery('Sanchaung');
      expect(info?.nameEn).toBe('Sanchaung');
      expect(info?.townshipEn).toBe('Sanchaung');
      expect(info?.nameMm).toBe('စမ်းချောင်း');
      expect(info?.townshipMm).toBe('စမ်းချောင်း');
      expect(info?.standardFeeMmk).toBe(2500);
      expect(info?.feeMmk).toBe(2500);
      expect(info?.codAvailable).toBe(true);
      expect(info?.isCodAvailable).toBe(true);
      expect(typeof info?.estDays).toBe('string');
      expect(typeof info?.estimatedDays).toBe('string');
    });
  });
});
