/**
 * Sensitive word filter & normalizer for certificate initials/names.
 *
 * Design principles:
 * 1. Fold diacritics / accents (e.g. José -> Jose, Müller -> Muller) & normalize to uppercase.
 * 2. Short words (≤4 letters) and common words MUST be matched as whole words to avoid
 *    false positives on legitimate global names (e.g. Hassan, Abdullah, Fukuda, Chiara, Nigel).
 * 3. High-impact long phrases / compounds (e.g. Hitler, XiJinping, Tiananmen) match compactly (without spaces).
 * 4. When detected, the caller shadowbans the submission by silently substituting a default name ('User')
 *    without displaying an error message or alerting the user.
 */

export function normalizeInputName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compact / Substring blacklist:
 * Stripped of all spaces/punctuation, compared against input stripped of all spaces/punctuation.
 * Only distinctive terms that should NEVER appear anywhere in a user name.
 */
export const COMPACT_BLACKLIST = [
  // Extreme slurs & profanity
  'FUCK',
  'NIGGER',
  'NIGGA',
  'CHINK',
  'BITCH',
  'CUNT',
  'MOTHERFUCKER',

  // Core Chinese & Cross-strait political figures and events
  'XIJINPING',
  'XIDADA',
  'XIPENGZE',
  'PENGLIYUAN',
  'MAOZEDONG',
  'MAOTSETUNG',
  'DENGXIAOPING',
  'JIANGZEMIN',
  'HUJINTAO',
  'TIANANMEN',
  '64TIANANMEN',
  'FALUNGONG',
  'FALUNDAFA',
  'LIHONGZHI',
  'FREETIBET',
  'FREEHK',
  'FREEHONGKONG',
  'TAIWANINDEP',

  // Historical dictators & violent extremism
  'HITLER',
  'ADOLFHITLER',
  'HEILHITLER',
  'NAZISM',
  'NAZIST',
  'FASCIST',
  'HOLOCAUST',
  'GENOCIDE',

  // Global terrorism & regional extremist entities
  'ALQAEDA',
  'AL-QAEDA',
  'BINLADEN',
  'OSAMABINLADEN',
  'DAESH',
  'TALIBAN',
  'BOKOHARAM',
  'KHOMEINI',
  'KHAMENEI',

  // Blasphemy compounds (explicit insults directed at deities/prophets)
  'FUCKALLAH',
  'PIGALLAH',
  'FUCKISLAM',
  'FUCKMOHAMMED',
  'FUCKJESUS',
  'FUCKGOD',

  // Official platform spoofing & impersonation
  'AREALME',
  'AREALMECERT',
  'OFFICIALAREALME',
];

/**
 * Word blacklist:
 * Matched strictly as standalone words (or exact input) to avoid Scunthorpe problem:
 * - 'ASS' must not match 'Hassan', 'Nasser', 'Bassam', 'Cassidy'
 * - 'ALLAH' must not match 'Abdullah'
 * - 'FUK' / 'FUC' must not match 'Fukuda', 'Fukuoka'
 * - 'NIG' must not match 'Nigel', 'Nigeria'
 * - 'CHI' was removed because it broke 'Chiara', 'Shinichi', 'Chi'
 * - 'GOD' must not match 'Godfrey', 'Godwin'
 */
export const WORD_BLACKLIST = [
  // Profanity & acronyms
  'ASS',
  'FUK',
  'FUC',
  'CNT',
  'KKK',
  'WAP',
  'WTF',
  'JAP',
  'SB',
  'CNM',
  'NMSL',
  'NIG',
  'GAY',
  'SEX',
  'SHIT',
  'DICK',
  'PUSSY',
  'COCK',
  'WHORE',
  'SLUT',
  'PENIS',
  'VAGINA',
  'TIT',
  'BOOB',

  // Supreme religious deities & concepts (prohibited as standalone personal names)
  'ALLAH',
  'GOD',
  'KHUDA',
  'YAHWEH',
  'SATAN',
  'LUCIFER',
  'ANTICHRIST',
  'DEVIL',
  'JIHAD',
  'ISIS',
  'ISIL',

  // Official platform roles & fake credentials
  'ADMIN',
  'ADMINISTRATOR',
  'MODERATOR',
  'SYSOP',
  'OFFICIAL',
  'CERTIFIED',
  'MENSA',

  // Political parties / militaries
  'CCP',
  'CPC',
  'PLA',
  'NAZI',
];

/**
 * Returns true if the raw input contains any sensitive, political, religious,
 * or abusive keywords.
 */
export function isSensitiveName(rawName: string): boolean {
  if (!rawName) return false;
  const norm = normalizeInputName(rawName);
  if (!norm) return false;

  // 1. Check compact / substring blacklist (strip all whitespace and punctuation)
  const compact = norm.replace(/[\s\-_.]/g, '');
  if (COMPACT_BLACKLIST.some((term) => compact.includes(term))) {
    return true;
  }

  // 2. Check whole word matches
  const words = norm.split(/[\s\-_.]+/).filter(Boolean);
  for (const word of words) {
    if (WORD_BLACKLIST.includes(word)) {
      return true;
    }
  }

  // 3. Check entire input equality against word blacklist
  if (WORD_BLACKLIST.includes(compact)) {
    return true;
  }

  return false;
}
