/**
 * Shared drawing primitives and the typographic system used by every certificate design.
 *
 * All renderers draw into a logical 1600 × 1000 coordinate space (CERT_WIDTH × CERT_HEIGHT).
 * Callers may scale the context (e.g. 2× for high-resolution export) without touching the renderers.
 */
import { ARCHETYPES, DIMENSION_KEYS, DIMENSION_LABELS } from '../../shared/constants';
import type { IQArchetype, IQDimensionKey, IQDimensionScore } from '../../shared/types';

export const CERT_WIDTH = 1600;
export const CERT_HEIGHT = 1000;

/**
 * Typographic system.
 *
 * - roman   → Cinzel: engraved Roman capitals with lining figures. Titles, tracked labels, ceremonial numerals.
 * - serif   → Cormorant: high-contrast Garamond revival with lining numerals. Names, phrases, the Academic score.
 * - grotesk → Archivo: neo-grotesque in the Akzidenz tradition. The Swiss design.
 * - mono    → IBM Plex Mono: reference numbers, dates, signatures.
 */
export const FONT = {
  roman: '"Cinzel", "Trajan Pro", "Times New Roman", serif',
  serif: '"Cormorant", "Cormorant Garamond", "EB Garamond", Georgia, serif',
  grotesk: '"Archivo", "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace',
} as const;

/** Build a CSS font shorthand for ctx.font. */
export function font(weight: number | string, sizePx: number, family: string, italic = false): string {
  return `${italic ? 'italic ' : ''}${weight} ${sizePx}px ${family}`;
}

/** Compact dimension names for tight layouts (strips, radar rims). */
export const DIMENSION_SHORT_LABELS: Record<IQDimensionKey, string> = {
  pattern: 'Pattern',
  spatial: 'Spatial',
  numerical: 'Numerical',
  logic: 'Logic',
  memory: 'Memory',
  planning: 'Planning',
  attention: 'Attention',
};

export function getArchetype(score: number): IQArchetype {
  for (const a of ARCHETYPES) {
    if (score <= a.max) return a;
  }
  return ARCHETYPES[ARCHETYPES.length - 1];
}

export function formatDisplayRef(id?: string): string {
  if (!id) return '2026';
  const clean = id.trim();
  // If standard UUID, format compactly as 13 chars e.g. FEEDFF53-5B67
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return clean.slice(0, 13).toUpperCase();
  }
  return clean.slice(0, 24).toUpperCase();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026.09.20" → "20 September 2026". Falls back to the raw string when unparseable. */
export function formatLongDate(dateStr: string): string {
  const m = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/.exec((dateStr || '').trim());
  if (!m) return dateStr || '';
  const month = MONTH_NAMES[Number(m[2]) - 1];
  if (!month) return dateStr;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

export function normalizeDimensions(
  input?: IQDimensionScore[] | Record<string, number> | number[]
): IQDimensionScore[] {
  if (Array.isArray(input) && input.length === 7 && typeof input[0] === 'number') {
    return DIMENSION_KEYS.map((key, i) => ({
      key,
      label: key,
      percent: Math.min(100, Math.max(0, (input as number[])[i])),
    }));
  }

  if (Array.isArray(input)) {
    const list = input as IQDimensionScore[];
    return DIMENSION_KEYS.map((k) => {
      const found = list.find((d) => d.key === k);
      return {
        key: k,
        label: found?.label || k,
        percent: found ? Math.min(100, Math.max(0, found.percent)) : 75,
      };
    });
  }

  if (input && typeof input === 'object') {
    const map = input as Record<string, number>;
    return DIMENSION_KEYS.map((k) => ({
      key: k,
      label: k,
      percent: typeof map[k] === 'number' ? Math.min(100, Math.max(0, map[k])) : 75,
    }));
  }

  return [
    { key: 'pattern', label: 'Pattern', percent: 80 },
    { key: 'spatial', label: 'Spatial', percent: 82 },
    { key: 'numerical', label: 'Numerical', percent: 75 },
    { key: 'logic', label: 'Logic', percent: 88 },
    { key: 'memory', label: 'Memory', percent: 70 },
    { key: 'planning', label: 'Planning', percent: 85 },
    { key: 'attention', label: 'Attention', percent: 90 },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Typography primitives
// ─────────────────────────────────────────────────────────────────────────────

export type Paint = string | CanvasGradient | CanvasPattern;

export interface TypeStyle {
  font: string;
  color: Paint;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  /** Letter-spacing in em (0.3 = 30% of the font size between glyphs). */
  tracking?: number;
  /** When set, the font size shrinks (never squashes) until the run fits. */
  maxWidth?: number;
  /** Lower bound for the fit-to-width shrink, in px. */
  minSize?: number;
}

export interface TypeRun {
  text: string;
  style: Omit<TypeStyle, 'align' | 'maxWidth' | 'minSize' | 'baseline'>;
  /** Gap before this run, in px (ignored for the first run). */
  gap?: number;
}

export function parseFontPx(fontSpec: string): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(fontSpec);
  return m ? parseFloat(m[1]) : 16;
}

export function withFontPx(fontSpec: string, px: number): string {
  return fontSpec.replace(/(\d+(?:\.\d+)?)px/, `${px}px`);
}

/** Width of a run including letter-spacing (no trailing space after the last glyph). */
export function measureTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSpec: string,
  tracking: number = 0
): number {
  if (!text) return 0;
  ctx.save();
  ctx.font = fontSpec;
  const base = ctx.measureText(text).width;
  ctx.restore();
  const glyphs = Array.from(text).length;
  return base + Math.max(0, glyphs - 1) * tracking * parseFontPx(fontSpec);
}

/**
 * Draw a single line of type with optional letter-spacing and fit-to-width.
 * `y` is the alphabetic baseline unless `style.baseline` says otherwise.
 * Returns the drawn width and the (possibly reduced) font actually used.
 */
export function drawType(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: TypeStyle
): { width: number; font: string } {
  const tracking = style.tracking ?? 0;
  let fontSpec = style.font;
  let width = measureTracked(ctx, text, fontSpec, tracking);

  if (style.maxWidth && width > style.maxWidth && width > 0) {
    const px = parseFontPx(fontSpec);
    const target = Math.max(style.minSize ?? 8, Math.floor(px * (style.maxWidth / width) * 100) / 100);
    fontSpec = withFontPx(fontSpec, target);
    width = measureTracked(ctx, text, fontSpec, tracking);
  }

  const align = style.align ?? 'left';
  const startX = align === 'center' ? x - width / 2 : align === 'right' || align === 'end' ? x - width : x;

  ctx.save();
  ctx.font = fontSpec;
  ctx.fillStyle = style.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = style.baseline ?? 'alphabetic';

  if (!tracking) {
    ctx.fillText(text, startX, y);
  } else {
    // Position each glyph from the kerned width of its prefix so pair kerning survives tracking.
    const px = parseFontPx(fontSpec);
    const glyphs = Array.from(text);
    let prefix = '';
    for (let i = 0; i < glyphs.length; i++) {
      const gx = startX + ctx.measureText(prefix).width + i * tracking * px;
      ctx.fillText(glyphs[i], gx, y);
      prefix += glyphs[i];
    }
  }
  ctx.restore();
  return { width, font: fontSpec };
}

/** Draw several styled runs on one baseline, aligned as a whole. Returns total width. */
export function drawRuns(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  align: CanvasTextAlign,
  runs: TypeRun[]
): number {
  const widths = runs.map((r) => measureTracked(ctx, r.text, r.style.font, r.style.tracking ?? 0));
  const total = widths.reduce((sum, w, i) => sum + w + (i > 0 ? runs[i].gap ?? 8 : 0), 0);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' || align === 'end' ? x - total : x;
  runs.forEach((run, i) => {
    if (i > 0) cursor += run.gap ?? 8;
    drawType(ctx, run.text, cursor, y, { ...run.style, align: 'left' });
    cursor += widths[i];
  });
  return total;
}

/** Greedy word wrap for a given font and width. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSpec: string,
  maxWidth: number
): string[] {
  ctx.save();
  ctx.font = fontSpec;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines;
}

/** Legacy helper (middle baseline, uniform scale-to-fit). Prefer drawType for new work. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSpec: string,
  color: string,
  align: CanvasTextAlign = 'center',
  maxWidth: number = 0
): void {
  ctx.save();
  ctx.font = fontSpec;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  if (maxWidth > 0) {
    const metrics = ctx.measureText(text);
    if (metrics.width > maxWidth) {
      const scale = maxWidth / metrics.width;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillText(text, 0, 0);
      ctx.restore();
      return;
    }
  }

  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Legacy helper. Prefer wrapText + drawType for new work. */
export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = 'center'
): number {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  const words = text.includes(' ') ? text.split(' ') : Array.from(text);
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + (text.includes(' ') ? ' ' : '');
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + (text.includes(' ') ? ' ' : '');
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
  ctx.restore();
  return curY + lineHeight;
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometry & ornament primitives
// ─────────────────────────────────────────────────────────────────────────────

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Horizontal rule. Pass a half-pixel `y` (e.g. 120.5) for a crisp 1px line. */
export function hairline(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y: number,
  x1: number,
  color: string,
  width: number = 1
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.restore();
}

export function vline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  y1: number,
  color: string,
  width: number = 1
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.stroke();
  ctx.restore();
}

export function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Ornamental divider: line — ◆ — line, centered on (cx, y). */
export function drawDivider(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  width: number,
  color: string
): void {
  const gap = 16;
  const half = width / 2;
  hairline(ctx, cx - half, y, cx - gap, color);
  hairline(ctx, cx + gap, y, cx + half, color);
  drawDiamond(ctx, cx, y, 5, color);
  drawDiamond(ctx, cx - half, y, 2.5, color);
  drawDiamond(ctx, cx + half, y, 2.5, color);
}

/**
 * Corner bracket: two short lines meeting at (x, y) and running `len` px inward
 * along dirX / dirY (each +1 or −1), with a small diamond at the vertex.
 */
export function drawCornerBracket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dirX: 1 | -1,
  dirY: 1 | -1,
  len: number,
  color: string,
  width: number = 1.5
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + dirX * len, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + dirY * len);
  ctx.stroke();
  ctx.restore();
  drawDiamond(ctx, x, y, 4, color);
}

/**
 * Text set along a circular arc.
 * `centerAngle` is the angle (radians, canvas convention) of the middle of the run.
 * Outward text (top of a seal) has glyph tops pointing away from the center;
 * `inward` text (bottom of a seal) still reads left→right with tops toward the center.
 * `radius` is the baseline radius.
 */
export function drawTextOnArc(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  centerAngle: number,
  style: { font: string; color: Paint; tracking?: number; inward?: boolean }
): void {
  const glyphs = Array.from(text);
  if (!glyphs.length) return;
  ctx.save();
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const px = parseFontPx(style.font);
  const track = (style.tracking ?? 0) * px;
  const widths = glyphs.map((g) => ctx.measureText(g).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (glyphs.length - 1);
  const dir = style.inward ? -1 : 1;
  let angle = centerAngle - (dir * total) / 2 / radius;

  for (let i = 0; i < glyphs.length; i++) {
    const half = widths[i] / 2 / radius;
    angle += dir * half;
    const gx = cx + Math.cos(angle) * radius;
    const gy = cy + Math.sin(angle) * radius;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(angle + (style.inward ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(glyphs[i], 0, 0);
    ctx.restore();
    angle += dir * (half + track / radius);
  }
  ctx.restore();
}

export interface SealOptions {
  light: string;
  mid: string;
  deep: string;
  ink: string;
  topText: string;
  bottomText: string;
  monogram: string;
}

/** Embossed rosette seal with scalloped edge, ring text and a central monogram. */
export function drawSeal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  o: SealOptions
): void {
  const bump = R * 0.075;
  const disc = R - bump;
  const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  grad.addColorStop(0, o.light);
  grad.addColorStop(0.55, o.mid);
  grad.addColorStop(1, o.deep);

  ctx.save();
  // Soft drop shadow under the body
  ctx.shadowColor = 'rgba(60, 40, 10, 0.28)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, disc, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = grad;
  const scallops = 44;
  for (let i = 0; i < scallops; i++) {
    const a = (i / scallops) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * disc, cy + Math.sin(a) * disc, bump, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, disc, 0, Math.PI * 2);
  ctx.fill();

  // Embossed rings
  ctx.strokeStyle = o.deep;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.47, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = o.light;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.8 - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  const ringFont = font(600, Math.round(R * 0.145), FONT.roman);
  drawTextOnArc(ctx, o.topText, cx, cy, R * 0.585, -Math.PI / 2, { font: ringFont, color: o.ink, tracking: 0.22 });
  drawTextOnArc(ctx, o.bottomText, cx, cy, R * 0.62, Math.PI / 2, { font: ringFont, color: o.ink, tracking: 0.22, inward: true });
  drawDiamond(ctx, cx - R * 0.635, cy, R * 0.035, o.ink);
  drawDiamond(ctx, cx + R * 0.635, cy, R * 0.035, o.ink);

  drawType(ctx, o.monogram, cx, cy + R * 0.16, {
    font: font(700, Math.round(R * 0.48), FONT.roman),
    color: o.ink,
    align: 'center',
    tracking: 0.04,
  });
}

/** Legacy progress bar (kept for compatibility). */
export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  percent: number,
  trackColor: string,
  barColor: string,
  borderRadius: number = 4
): void {
  ctx.save();
  ctx.fillStyle = trackColor;
  roundRectPath(ctx, x, y, width, height, borderRadius);
  ctx.fill();
  const fillWidth = Math.max(0, Math.min(width, (width * percent) / 100));
  if (fillWidth > 0) {
    ctx.fillStyle = barColor;
    roundRectPath(ctx, x, y, fillWidth, height, borderRadius);
    ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Radar / astrolabe
// ─────────────────────────────────────────────────────────────────────────────

export interface RadarTheme {
  gridColor: string;
  axisColor: string;
  fillColor: string;
  strokeColor: string;
  labelColor: string;
  valueColor: string;
  /** Font for inline labels or the stacked label line. */
  labelFont?: string;
  /** Font for the stacked value line. */
  valueFont?: string;
  labelTracking?: number;
  /** 'inline' → "Name 79%" on one line; 'stacked' → value above a short name. */
  labelStyle?: 'inline' | 'stacked';
  shortLabels?: boolean;
  /** Distance from the 100% ring to the label anchor. */
  labelOffset?: number;
  /** Number of concentric grid polygons. */
  rings?: number;
  outerGridColor?: string;
  lineWidth?: number;
  dotRadius?: number;
  dotCoreColor?: string;
  glowColor?: string;
  glowBlur?: number;
  /** Radial fill gradient [center, edge]; overrides fillColor when set. */
  fillGradient?: [string, string];
  /** Instrument bezel drawn outside the 100% ring. `ticks` should be a multiple of the axis count. */
  bezel?: { color: string; majorColor: string; radiusOffset: number; ticks: number };
  centerDot?: string;
}

/**
 * 7-axis radar chart. The theme's six required colors keep the legacy call sites working;
 * the optional fields turn it into the Royal "astrolabe".
 */
export function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  dimensions: IQDimensionScore[],
  _lang: string,
  theme: RadarTheme
): void {
  const count = dimensions.length;
  if (count < 3) return;

  const angleStep = (Math.PI * 2) / count;
  const startAngle = -Math.PI / 2;
  const point = (i: number, r: number) => ({
    x: centerX + Math.cos(startAngle + i * angleStep) * r,
    y: centerY + Math.sin(startAngle + i * angleStep) * r,
  });

  ctx.save();

  // Bezel
  if (theme.bezel) {
    const b = theme.bezel;
    const r0 = radius + b.radiusOffset;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r0 + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const perAxis = Math.max(1, Math.round(b.ticks / count));
    for (let t = 0; t < b.ticks; t++) {
      const a = startAngle + (t / b.ticks) * Math.PI * 2;
      const major = t % perAxis === 0;
      const rIn = major ? r0 - 7 : r0 + 1.5;
      const rOut = major ? r0 + 7 : r0 + 5.5;
      ctx.strokeStyle = major ? b.majorColor : b.color;
      ctx.lineWidth = major ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(a) * rIn, centerY + Math.sin(a) * rIn);
      ctx.lineTo(centerX + Math.cos(a) * rOut, centerY + Math.sin(a) * rOut);
      ctx.stroke();
    }
  }

  // Concentric grid polygons
  const rings = theme.rings ?? 4;
  for (let k = 1; k <= rings; k++) {
    const r = (radius * k) / rings;
    const outer = k === rings;
    ctx.strokeStyle = outer ? theme.outerGridColor || theme.gridColor : theme.gridColor;
    ctx.lineWidth = outer ? 1.25 : 1;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const p = point(i, r);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = theme.axisColor;
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const p = point(i, radius);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // Data polygon
  const points = dimensions.map((d, i) => point(i, radius * Math.max(0.06, Math.min(1, d.percent / 100))));
  const tracePolygon = () => {
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  };

  if (theme.fillGradient) {
    const g = ctx.createRadialGradient(centerX, centerY, radius * 0.05, centerX, centerY, radius);
    g.addColorStop(0, theme.fillGradient[0]);
    g.addColorStop(1, theme.fillGradient[1]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = theme.fillColor;
  }
  tracePolygon();
  ctx.fill();

  ctx.save();
  if (theme.glowColor) {
    ctx.shadowColor = theme.glowColor;
    ctx.shadowBlur = theme.glowBlur ?? 16;
  }
  ctx.strokeStyle = theme.strokeColor;
  ctx.lineWidth = theme.lineWidth ?? 2.5;
  ctx.lineJoin = 'round';
  tracePolygon();
  ctx.stroke();
  ctx.restore();

  // Vertex dots
  const dotR = theme.dotRadius ?? 4.5;
  for (const p of points) {
    ctx.fillStyle = theme.strokeColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
    ctx.fill();
    if (theme.dotCoreColor) {
      ctx.fillStyle = theme.dotCoreColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, dotR * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (theme.centerDot) {
    ctx.fillStyle = theme.centerDot;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Labels (always English on certificates)
  const labelDist = radius + (theme.labelOffset ?? 26);
  const labelFont = theme.labelFont || font(600, 13, FONT.grotesk);
  const valueFont = theme.valueFont || font(600, 20, FONT.roman);
  const stacked = theme.labelStyle === 'stacked';

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const lx = centerX + Math.cos(angle) * labelDist;
    const ly = centerY + Math.sin(angle) * labelDist;
    const key = dimensions[i].key;
    const name = theme.shortLabels
      ? DIMENSION_SHORT_LABELS[key] || key
      : DIMENSION_LABELS.en[key]?.name || key;

    let align: CanvasTextAlign = 'center';
    if (Math.cos(angle) > 0.3) align = 'left';
    else if (Math.cos(angle) < -0.3) align = 'right';

    if (stacked) {
      const value = `${dimensions[i].percent}%`;
      drawType(ctx, value, lx, ly - 3, { font: valueFont, color: theme.valueColor, align });
      drawType(ctx, name.toUpperCase(), lx, ly + 16, {
        font: labelFont,
        color: theme.labelColor,
        align,
        tracking: theme.labelTracking ?? 0.18,
      });
    } else {
      drawType(ctx, `${name} ${dimensions[i].percent}%`, lx, ly, {
        font: labelFont,
        color: theme.labelColor,
        align,
        baseline: 'middle',
      });
    }
  }

  ctx.restore();
}
