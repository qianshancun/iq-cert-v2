/**
 * Score-driven page atmosphere.
 *
 * The Full-Scale IQ no longer only paints a medal — it selects the entire
 * verification portal theme (primary, banner, radar, bars, ambient glow).
 * The medal is just one surface that inherits the same `--primary`.
 *
 * Rarity ladder (game design):
 *   ≤99   emerald   Cognitive Explorer
 *   ≤114  sapphire  Analytical Thinker
 *   ≤129  amethyst  High Distinction Strategist
 *   ≤144  gold      Superior Intellect Visionary
 *   ≥145  ruby      Grandmaster Sovereign
 */

export type ScoreTierKey = 'emerald' | 'sapphire' | 'amethyst' | 'gold' | 'ruby';

export interface ScoreTier {
  max: number;
  key: ScoreTierKey;
  rarity: string;
}

export const SCORE_TIERS: readonly ScoreTier[] = [
  { max: 99, key: 'emerald', rarity: 'Common' },
  { max: 114, key: 'sapphire', rarity: 'Rare' },
  { max: 129, key: 'amethyst', rarity: 'Epic' },
  { max: 144, key: 'gold', rarity: 'Legendary' },
  { max: 999, key: 'ruby', rarity: 'Mythic' },
] as const;

/** @deprecated Prefer SCORE_TIERS / getScoreTier — kept as alias for callers. */
export type MedalTier = ScoreTier & {
  /** Resolved for the active light/dark mode when available; else dark primary. */
  color: string;
  glow: string;
};

export const MEDAL_TIERS = SCORE_TIERS;

/** Dark-mode primaries (used by modal / canvas helpers that cannot read CSS). */
export const TIER_PRIMARY_DARK: Record<ScoreTierKey, string> = {
  emerald: '#10B981',
  sapphire: '#60A5FA',
  amethyst: '#C084FC',
  gold: '#FBBF24',
  ruby: '#F87171',
};

export const TIER_GLOW_DARK: Record<ScoreTierKey, string> = {
  emerald: 'rgba(16, 185, 129, 0.45)',
  sapphire: 'rgba(96, 165, 250, 0.45)',
  amethyst: 'rgba(192, 132, 252, 0.45)',
  gold: 'rgba(251, 191, 36, 0.5)',
  ruby: 'rgba(248, 113, 113, 0.5)',
};

export function getScoreTier(score: number): ScoreTier {
  const s = Number.isFinite(score) ? score : 0;
  for (const tier of SCORE_TIERS) {
    if (s <= tier.max) return tier;
  }
  return SCORE_TIERS[SCORE_TIERS.length - 1];
}

/** Alias used by older call sites. */
export function getMedalTier(score: number): MedalTier {
  const tier = getScoreTier(score);
  return {
    ...tier,
    color: TIER_PRIMARY_DARK[tier.key],
    glow: TIER_GLOW_DARK[tier.key],
  };
}

/** Stamp the score atmosphere onto <html> so CSS variables cascade site-wide. */
export function applyScoreTheme(score: number, root: HTMLElement = document.documentElement): ScoreTier {
  const tier = getScoreTier(score);
  root.setAttribute('data-tier', tier.key);
  return tier;
}

/** Inline path data for the shared medal SVG template. */
const MEDAL_PATHS = `
  <path d="M239.058 82.177 199.886 7.996C197.289 3.078 192.184 0 186.622 0H68.744c-5.258 0-10.132 2.753-12.847 7.256-2.714 4.503-2.873 10.099-.417 14.749l80.412 152.281c21.606-15.713 46.419-27.269 73.264-33.461zM441.696 0H323.819c-5.64 0-10.802 3.163-13.363 8.187l-65.109 127.701c3.088-.141 6.191-.222 9.313-.222 45.599 0 87.72 15.164 121.598 40.706L455.06 21.813c2.371-4.65 2.154-10.199-.572-14.649C451.76 2.713 446.916 0 441.696 0M254.661 165.666c-95.055 0-172.388 77.333-172.388 172.388s77.333 172.388 172.388 172.388 172.388-77.333 172.388-172.388-77.333-172.388-172.388-172.388m0 286.084c-61.833 0-112.138-50.305-112.138-112.138s50.305-112.138 112.138-112.138 112.138 50.305 112.138 112.138S316.494 451.75 254.661 451.75"/>
  <circle cx="254.661" cy="339.612" r="82.138" transform="rotate(-67 254.7492 339.6438)"/>
`;

/**
 * Medal insignia. Prefer fill="currentColor" so it inherits the page
 * `--primary` from its parent (score-themed atmosphere).
 * Pass an explicit color only when rendering outside the themed page (e.g. modal).
 */
export function medalSvgHtml(scoreOrColor?: number | string, sizePx = 22): string {
  const size = Math.max(12, Math.round(sizePx));
  let fill = 'currentColor';
  let filter = 'drop-shadow(0 1px 3px var(--primary-glow, rgba(0,0,0,0.25)))';

  if (typeof scoreOrColor === 'string') {
    fill = scoreOrColor;
    filter = 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))';
  } else if (typeof scoreOrColor === 'number') {
    const tier = getMedalTier(scoreOrColor);
    fill = tier.color;
    filter = `drop-shadow(0 1px 3px ${tier.glow})`;
  }

  return `<svg class="medal-svg" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 510 510" fill="${fill}" aria-hidden="true" style="width:${size}px;height:${size}px;flex-shrink:0;filter:${filter}">${MEDAL_PATHS}</svg>`;
}
