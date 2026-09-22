/**
 * Royal — black & gold charter with the Cognitive Astrolabe.
 * Left: engraved title lockup, bearer, glowing score, charter details.
 * Right: a seven-axis astrolabe with an instrument bezel and stacked rim labels.
 */
import type { IQCertificatePayload } from '../../shared/types';
import { drawQrOnCanvas } from '../qr';
import {
  CERT_HEIGHT,
  CERT_WIDTH,
  FONT,
  drawDiamond,
  drawRadarChart,
  drawType,
  font,
  formatDisplayRef,
  formatLongDate,
  getArchetype,
  hairline,
  measureTracked,
  normalizeDimensions,
  vline,
} from './common';

const GOLD = '#D9B65C';
const GOLD_LIGHT = '#F7E7B0';
const GOLD_DEEP = '#8C6D2E';
const GOLD_MUTED = '#A58A4D';
const CREAM = '#F1E6CB';
const CREAM_SOFT = 'rgba(241, 230, 203, 0.72)';
const QR_DARK = '#15100A';

const LX = 104;
const LEFT_MAX = 616;

export function renderRoyal(
  ctx: CanvasRenderingContext2D,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  const archetype = getArchetype(payload.s);
  const dimensions = normalizeDimensions(payload.m);
  const displayRef = formatDisplayRef(payload.id);
  const name = payload.n.trim().toUpperCase();

  const astroX = 1150;
  const astroY = 498;
  const astroR = 200;

  // ── Ground ──────────────────────────────────────────────────────────────
  const ground = ctx.createRadialGradient(760, 460, 60, 800, 500, 1150);
  ground.addColorStop(0, '#221B12');
  ground.addColorStop(0.55, '#110E0B');
  ground.addColorStop(1, '#060508');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);

  ctx.save();
  ctx.beginPath();
  ctx.rect(40, 40, CERT_WIDTH - 80, CERT_HEIGHT - 80);
  ctx.clip();

  // Gold dust (deterministic)
  let seed = 7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 260; i++) {
    const px = 40 + rand() * (CERT_WIDTH - 80);
    const py = 40 + rand() * (CERT_HEIGHT - 80);
    const size = 0.8 + rand() * 1.5;
    const alpha = 0.05 + rand() * 0.32;
    ctx.fillStyle = `rgba(233, 200, 110, ${alpha.toFixed(3)})`;
    ctx.fillRect(px, py, size, size);
  }

  // Star-chart ambience around the astrolabe
  ctx.lineWidth = 1;
  [300, 356, 428].forEach((r, i) => {
    ctx.strokeStyle = `rgba(217, 182, 92, ${(0.085 - i * 0.02).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(astroX, astroY, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();

  // ── Frame ───────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = GOLD_DEEP;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, CERT_WIDTH - 56, CERT_HEIGHT - 56);
  ctx.strokeStyle = 'rgba(217, 182, 92, 0.85)';
  ctx.lineWidth = 1;
  ctx.strokeRect(38.5, 38.5, CERT_WIDTH - 77, CERT_HEIGHT - 77);
  ctx.restore();
  const corner = (x: number, y: number, sx: 1 | -1, sy: 1 | -1) => {
    drawDiamond(ctx, x, y, 6, GOLD);
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + sx * 8, y + sy * 8);
    ctx.lineTo(x + sx * 30, y + sy * 30);
    ctx.stroke();
    ctx.restore();
    drawDiamond(ctx, x + sx * 34, y + sy * 34, 2.5, GOLD);
  };
  corner(38.5, 38.5, 1, 1);
  corner(CERT_WIDTH - 38.5, 38.5, -1, 1);
  corner(38.5, CERT_HEIGHT - 38.5, 1, -1);
  corner(CERT_WIDTH - 38.5, CERT_HEIGHT - 38.5, -1, -1);

  // ── Title lockup ────────────────────────────────────────────────────────
  drawType(ctx, 'AREALME · HIGH INTELLECT COUNCIL', LX, 104, {
    font: font(500, 14, FONT.roman),
    color: GOLD_MUTED,
    tracking: 0.34,
  });
  const titleGrad = ctx.createLinearGradient(0, 128, 0, 178);
  titleGrad.addColorStop(0, '#FFF4CC');
  titleGrad.addColorStop(0.55, '#E6C56E');
  titleGrad.addColorStop(1, '#B8933F');
  drawType(ctx, 'ROYAL CHARTER', LX, 176, {
    font: font(700, 54, FONT.roman),
    color: titleGrad,
    tracking: 0.12,
    maxWidth: LEFT_MAX,
  });
  drawType(ctx, 'OF INTELLECTUAL DISTINCTION', LX, 216, {
    font: font(400, 17, FONT.roman),
    color: CREAM_SOFT,
    tracking: 0.38,
  });
  hairline(ctx, LX, 249, LX + 72, GOLD, 2);

  // ── Bearer ──────────────────────────────────────────────────────────────
  drawType(ctx, 'Conferred upon', LX, 310, {
    font: font(500, 28, FONT.serif, true),
    color: CREAM,
  });
  const nameGrad = ctx.createLinearGradient(LX, 0, LX + 600, 0);
  nameGrad.addColorStop(0, '#FFF3C4');
  nameGrad.addColorStop(0.5, '#E4C270');
  nameGrad.addColorStop(1, '#C49C48');
  drawType(ctx, name, LX, 372, {
    font: font(700, 62, FONT.roman),
    color: nameGrad,
    tracking: 0.08,
    maxWidth: LEFT_MAX,
    minSize: 34,
  });
  drawType(ctx, archetype.titleEn.toUpperCase(), LX, 420, {
    font: font(500, 18, FONT.roman),
    color: GOLD,
    tracking: 0.3,
    maxWidth: LEFT_MAX,
  });

  // ── Score ───────────────────────────────────────────────────────────────
  drawType(ctx, 'FULL SCALE IQ', LX, 504, {
    font: font(400, 14, FONT.roman),
    color: GOLD_MUTED,
    tracking: 0.34,
  });
  const scoreFont = font(700, 190, FONT.roman);
  const scoreGrad = ctx.createLinearGradient(0, 514, 0, 666);
  scoreGrad.addColorStop(0, '#FFFBEA');
  scoreGrad.addColorStop(0.55, '#F3D77C');
  scoreGrad.addColorStop(1, '#C9A24A');
  ctx.save();
  ctx.shadowColor = 'rgba(243, 215, 124, 0.45)';
  ctx.shadowBlur = 34;
  const scoreRun = drawType(ctx, String(payload.s), LX - 4, 666, {
    font: scoreFont,
    color: scoreGrad,
    tracking: 0.02,
  });
  ctx.restore();

  const tierX = LX + scoreRun.width + 46;
  vline(ctx, tierX - 22, 574, 654, 'rgba(217, 182, 92, 0.45)');
  drawType(ctx, archetype.percentile.toUpperCase(), tierX, 612, {
    font: font(600, 32, FONT.roman),
    color: GOLD_LIGHT,
  });
  drawType(ctx, 'WORLDWIDE', tierX, 642, {
    font: font(400, 13, FONT.roman),
    color: GOLD_MUTED,
    tracking: 0.34,
  });

  // ── Charter details ─────────────────────────────────────────────────────
  hairline(ctx, LX, 716.5, LX + 560, 'rgba(140, 109, 46, 0.7)');
  drawType(ctx, 'ISSUED', LX, 754, {
    font: font(400, 12, FONT.roman),
    color: GOLD_MUTED,
    tracking: 0.3,
  });
  drawType(ctx, formatLongDate(payload.d), LX, 784, {
    font: font(500, 22, FONT.serif),
    color: CREAM,
  });
  drawType(ctx, 'CHARTER NO.', LX + 290, 754, {
    font: font(400, 12, FONT.roman),
    color: GOLD_MUTED,
    tracking: 0.3,
  });
  drawType(ctx, `ARM-${displayRef}`, LX + 290, 783, {
    font: font(500, 15, FONT.mono),
    color: CREAM,
    maxWidth: 300,
  });

  // ── Registrar ───────────────────────────────────────────────────────────
  drawType(ctx, 'ARealMe Psychometrics Division', LX, 858, {
    font: font(600, 27, FONT.serif, true),
    color: CREAM,
  });
  hairline(ctx, LX, 868.5, LX + 400, 'rgba(217, 182, 92, 0.6)');
  drawType(ctx, 'REGISTRAR · DIGITALLY SIGNED', LX, 892, {
    font: font(400, 11, FONT.roman),
    color: GOLD_MUTED,
    tracking: 0.3,
  });

  // ── Astrolabe ───────────────────────────────────────────────────────────
  const captionFont = font(500, 14, FONT.roman);
  const caption = 'COGNITIVE ASTROLABE';
  const captionW = measureTracked(ctx, caption, captionFont, 0.34);
  drawType(ctx, caption, astroX, 152, {
    font: captionFont,
    color: GOLD_MUTED,
    align: 'center',
    tracking: 0.34,
  });
  drawDiamond(ctx, astroX - captionW / 2 - 22, 147, 3, GOLD_MUTED);
  drawDiamond(ctx, astroX + captionW / 2 + 22, 147, 3, GOLD_MUTED);

  drawRadarChart(ctx, astroX, astroY, astroR, dimensions, 'en', {
    gridColor: 'rgba(217, 182, 92, 0.18)',
    outerGridColor: 'rgba(217, 182, 92, 0.5)',
    axisColor: 'rgba(217, 182, 92, 0.22)',
    fillColor: 'rgba(243, 215, 124, 0.2)',
    fillGradient: ['rgba(243, 215, 124, 0.42)', 'rgba(217, 182, 92, 0.08)'],
    strokeColor: '#F3D77C',
    glowColor: 'rgba(243, 215, 124, 0.55)',
    glowBlur: 18,
    lineWidth: 2.5,
    dotRadius: 5,
    dotCoreColor: '#1A150C',
    labelColor: GOLD_MUTED,
    valueColor: GOLD_LIGHT,
    labelStyle: 'stacked',
    shortLabels: true,
    labelOffset: 66,
    labelFont: font(400, 11, FONT.roman),
    valueFont: font(600, 21, FONT.roman),
    labelTracking: 0.22,
    rings: 5,
    bezel: { color: 'rgba(217, 182, 92, 0.45)', majorColor: GOLD, radiusOffset: 34, ticks: 84 },
    centerDot: GOLD,
  });

  // ── QR ──────────────────────────────────────────────────────────────────
  const qrSize = 160;
  const qrX = CERT_WIDTH - 88 - qrSize;
  const qrY = CERT_HEIGHT - 64 - qrSize;
  drawQrOnCanvas(ctx, verifyUrl, qrX, qrY, qrSize, {
    darkColor: QR_DARK,
    lightColor: CREAM,
    margin: 2,
    borderRadius: 4,
  });
  drawType(ctx, 'SCAN TO VERIFY', qrX - 26, qrY + 60, {
    font: font(500, 12, FONT.roman),
    color: GOLD,
    align: 'right',
    tracking: 0.3,
  });
  drawType(ctx, 'arealme.com/iq/cert', qrX - 26, qrY + 86, {
    font: font(400, 13, FONT.mono),
    color: GOLD_MUTED,
    align: 'right',
  });
  drawType(ctx, 'Signed & tamper-evident', qrX - 26, qrY + 110, {
    font: font(500, 15, FONT.serif, true),
    color: GOLD_MUTED,
    align: 'right',
  });

  // ── Footnote ────────────────────────────────────────────────────────────
  drawType(
    ctx,
    'Accredited by the ARealMe Psychometrics Division · Cryptographically sealed and verifiable',
    LX,
    938,
    { font: font(500, 16, FONT.serif, true), color: GOLD_MUTED, maxWidth: 800 }
  );
}
