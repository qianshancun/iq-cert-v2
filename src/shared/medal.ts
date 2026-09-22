/**
 * Tiered medal insignia for IQ archetypes.
 *
 * Color ladder follows classic game-rarity progression
 * (common → rare → epic → legendary → mythic):
 *
 *   ≤99   Emerald Green   Cognitive Explorer
 *   ≤114  Sapphire Blue   Analytical Thinker
 *   ≤129  Amethyst Purple High Distinction Strategist
 *   ≤144  Amber Gold      Superior Intellect Visionary
 *   ≥145  Ruby Crimson    Grandmaster Sovereign
 */

export interface MedalTier {
  /** Inclusive upper bound for this tier (last tier uses 999). */
  max: number;
  /** Fill color for the medal SVG + matching title tint. */
  color: string;
  /** Soft glow / shadow companion for the fill. */
  glow: string;
  /** Short rarity label (for tooling / a11y). */
  rarity: string;
  /** Stable key used in CSS class names. */
  key: 'emerald' | 'sapphire' | 'amethyst' | 'gold' | 'ruby';
}

export const MEDAL_TIERS: readonly MedalTier[] = [
  { max: 99, color: '#10B981', glow: 'rgba(16, 185, 129, 0.45)', rarity: 'Common', key: 'emerald' },
  { max: 114, color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.45)', rarity: 'Rare', key: 'sapphire' },
  { max: 129, color: '#A855F7', glow: 'rgba(168, 85, 247, 0.45)', rarity: 'Epic', key: 'amethyst' },
  { max: 144, color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)', rarity: 'Legendary', key: 'gold' },
  { max: 999, color: '#EF4444', glow: 'rgba(239, 68, 68, 0.5)', rarity: 'Mythic', key: 'ruby' },
] as const;

/** Inline path data for the shared medal SVG template. */
const MEDAL_PATHS = `
  <path d="M239.058 82.177 199.886 7.996C197.289 3.078 192.184 0 186.622 0H68.744c-5.258 0-10.132 2.753-12.847 7.256-2.714 4.503-2.873 10.099-.417 14.749l80.412 152.281c21.606-15.713 46.419-27.269 73.264-33.461zM441.696 0H323.819c-5.64 0-10.802 3.163-13.363 8.187l-65.109 127.701c3.088-.141 6.191-.222 9.313-.222 45.599 0 87.72 15.164 121.598 40.706L455.06 21.813c2.371-4.65 2.154-10.199-.572-14.649C451.76 2.713 446.916 0 441.696 0M254.661 165.666c-95.055 0-172.388 77.333-172.388 172.388s77.333 172.388 172.388 172.388 172.388-77.333 172.388-172.388-77.333-172.388-172.388-172.388m0 286.084c-61.833 0-112.138-50.305-112.138-112.138s50.305-112.138 112.138-112.138 112.138 50.305 112.138 112.138S316.494 451.75 254.661 451.75"/>
  <circle cx="254.661" cy="339.612" r="82.138" transform="rotate(-67 254.7492 339.6438)"/>
`;

export function getMedalTier(score: number): MedalTier {
  const s = Number.isFinite(score) ? score : 0;
  for (const tier of MEDAL_TIERS) {
    if (s <= tier.max) return tier;
  }
  return MEDAL_TIERS[MEDAL_TIERS.length - 1];
}

/**
 * Render the medal insignia as an inline SVG string.
 * Uses the provided color (defaults to the tier color for `score`).
 */
export function medalSvgHtml(scoreOrColor: number | string, sizePx = 22): string {
  const tier = typeof scoreOrColor === 'number' ? getMedalTier(scoreOrColor) : null;
  const color = typeof scoreOrColor === 'string' ? scoreOrColor : tier!.color;
  const glow = tier?.glow || 'rgba(0,0,0,0.2)';
  const size = Math.max(12, Math.round(sizePx));

  return `<svg class="medal-svg" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 510 510" fill="${color}" aria-hidden="true" style="width:${size}px;height:${size}px;flex-shrink:0;filter:drop-shadow(0 1px 3px ${glow})">${MEDAL_PATHS}</svg>`;
}
