/**
 * Myanmar Zawgyi & Unicode Detector and Converter Utility
 * Ensures incoming messages from Facebook Messenger & TikTok are normalized to Unicode
 * so the AI Agent can reason accurately and reply with clean Unicode text.
 */

// Regex patterns to detect Zawgyi characteristics
const ZAWGYI_REGEX = /[\u1031\u103b\u103c\u103d\u103e\u103f\u1060-\u1097]/;
const ZAWGYI_SPECIFIC_PATTERNS = [
  /\u1031[\u1000-\u1021]/, // E-vowel before consonant (Zawgyi storage order)
  /[\u1000-\u1021]\u103b/, // Consonant + ya-yit
  /\u1039[\u1000-\u1021]/, // Virama usage in Zawgyi
  /\u1064|\u108a|\u108b|\u108c|\u108d/, // Special Zawgyi code points
];

/**
 * Detects whether a string is likely Zawgyi font encoded.
 */
export function isZawgyi(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  // Check if contains Myanmar Unicode range
  if (!/[\u1000-\u109F]/.test(text)) {
    return false; // Not Burmese or mostly English
  }

  let score = 0;
  for (const pattern of ZAWGYI_SPECIFIC_PATTERNS) {
    if (pattern.test(text)) {
      score += 1;
    }
  }

  return score >= 1;
}

/**
 * Common Zawgyi to Unicode character mapping rules
 */
const ZAWGYI_TO_UNICODE_MAP: [RegExp, string][] = [
  // Reorder E-vowel (\u1031) stored before consonant in Zawgyi
  [/(\u1031)([\u1000-\u1021])/g, '$2$1'],
  
  // Medials
  [/\u103b/g, '\u103c'], // Ya-yit variants
  [/\u107d/g, '\u103d'], // Wa-swae
  [/\u107e/g, '\u103e'], // Ha-hto
  [/\u108a/g, '\u103d\u103e'],
  [/\u103a/g, '\u103a'], // Asat
  [/\u1037/g, '\u1037'], // Anusvara
  [/\u1038/g, '\u1038'], // Visarga
  [/\u1064/g, '\u1044'], // Digit 4
];

/**
 * Normalizes input text into standard Myanmar Unicode.
 * If text is English or already Unicode, returns as-is.
 */
export function normalizeBurmese(input: string): string {
  if (!input) return '';
  
  let text = input.trim();
  
  if (isZawgyi(text)) {
    for (const [pattern, replacement] of ZAWGYI_TO_UNICODE_MAP) {
      text = text.replace(pattern, replacement);
    }
  }

  return text;
}

/**
 * Myanmar phone number normalizer
 * Converts '09xxxxxxxxx', '+959xxxxxxxxx', '959xxxxxxxxx' to standardized '09xxxxxxxxx'
 */
export function normalizeMyanmarPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+959')) {
    return '09' + cleaned.slice(4);
  }
  if (cleaned.startsWith('959')) {
    return '09' + cleaned.slice(3);
  }
  if (cleaned.startsWith('9') && cleaned.length === 9) {
    return '0' + cleaned;
  }
  return cleaned;
}
