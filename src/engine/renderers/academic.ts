/**
 * Academic — a classical diploma.
 * Centered axis, engraved Roman capitals over a Garamond text face, ivory paper,
 * navy ink and restrained gold. Rosette seal left, framed verification QR right,
 * seven-tile cognitive profile strip, single-line footer.
 */
import type { IQCertificatePayload } from '../../shared/types';
import { drawQrOnCanvas } from '../qr';
import {
  CERT_HEIGHT,
  CERT_WIDTH,
  DIMENSION_SHORT_LABELS,
  FONT,
  drawCornerBracket,
  drawDiamond,
  drawDivider,
  drawRuns,
  drawSeal,
  drawType,
  font,
  formatDisplayRef,
  formatLongDate,
  getArchetype,
  hairline,
  measureTracked,
  normalizeDimensions,
} from './common';

const PAPER = '#FBF8F1';
const INK = '#1B2A41';
const INK_SOFT = '#4B5566';
const MUTED = '#7C7568';
const GOLD = '#B18E3F';
const GOLD_LIGHT = '#E7D18C';
const GOLD_DEEP = '#8B6D2B';
const RULE = '#DAD1BF';
const TRACK = '#E9E2D4';

export function renderAcademic(
  ctx: CanvasRenderingContext2D,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  const archetype = getArchetype(payload.s);
  const dimensions = normalizeDimensions(payload.m);
  const displayRef = formatDisplayRef(payload.id);
  const name = payload.n.trim().toUpperCase();
  const CX = CERT_WIDTH / 2;

  // ── Paper ───────────────────────────────────────────────────────────────
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);
  const vignette = ctx.createRadialGradient(CX, 480, 260, CX, 500, 1050);
  vignette.addColorStop(0, 'rgba(160, 130, 70, 0)');
  vignette.addColorStop(1, 'rgba(160, 130, 70, 0.11)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);

  // ── Frame: navy band, double gold hairline, corner brackets ────────────
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(30.5, 30.5, CERT_WIDTH - 61, CERT_HEIGHT - 61);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.strokeRect(43.5, 43.5, CERT_WIDTH - 87, CERT_HEIGHT - 87);
  ctx.strokeRect(49.5, 49.5, CERT_WIDTH - 99, CERT_HEIGHT - 99);
  ctx.restore();

  const inset = 68;
  drawCornerBracket(ctx, inset, inset, 1, 1, 34, GOLD);
  drawCornerBracket(ctx, CERT_WIDTH - inset, inset, -1, 1, 34, GOLD);
  drawCornerBracket(ctx, inset, CERT_HEIGHT - inset, 1, -1, 34, GOLD);
  drawCornerBracket(ctx, CERT_WIDTH - inset, CERT_HEIGHT - inset, -1, -1, 34, GOLD);

  // ── Header lockup ───────────────────────────────────────────────────────
  drawType(ctx, 'AREALME COGNITIVE ASSESSMENT COMMITTEE', CX, 104, {
    font: font(500, 15, FONT.roman),
    color: GOLD,
    align: 'center',
    tracking: 0.32,
  });
  drawType(ctx, 'CERTIFICATE', CX, 176, {
    font: font(700, 74, FONT.roman),
    color: INK,
    align: 'center',
    tracking: 0.16,
  });
  drawType(ctx, 'OF INTELLECTUAL EXCELLENCE', CX, 216, {
    font: font(400, 19, FONT.roman),
    color: INK_SOFT,
    align: 'center',
    tracking: 0.42,
  });
  drawDivider(ctx, CX, 246.5, 300, GOLD);

  // ── Bearer ──────────────────────────────────────────────────────────────
  drawType(ctx, 'This is to certify that', CX, 290, {
    font: font(500, 28, FONT.serif, true),
    color: MUTED,
    align: 'center',
  });

  const nameRun = drawType(ctx, name, CX, 372, {
    font: font(600, 90, FONT.serif),
    color: INK,
    align: 'center',
    tracking: 0.06,
    maxWidth: 1180,
    minSize: 48,
  });
  const ruleW = Math.min(1100, Math.max(460, nameRun.width + 160));
  hairline(ctx, CX - ruleW / 2, 404.5, CX + ruleW / 2, GOLD);
  drawDiamond(ctx, CX - ruleW / 2, 404.5, 3.5, GOLD);
  drawDiamond(ctx, CX + ruleW / 2, 404.5, 3.5, GOLD);

  drawType(
    ctx,
    'has successfully completed the ARealMe Standardized IQ Assessment and attained the distinction of',
    CX,
    448,
    { font: font(500, 25, FONT.serif), color: INK_SOFT, align: 'center', maxWidth: 1300 }
  );
  drawType(ctx, archetype.titleEn.toUpperCase(), CX, 492, {
    font: font(600, 28, FONT.roman),
    color: GOLD,
    align: 'center',
    tracking: 0.22,
    maxWidth: 1100,
  });

  // ── Score band: seal · score · QR ───────────────────────────────────────
  drawSeal(ctx, 300, 618, 72, {
    light: GOLD_LIGHT,
    mid: '#C9A653',
    deep: GOLD_DEEP,
    ink: INK,
    topText: 'AREALME',
    bottomText: 'CERTIFIED',
    monogram: 'IQ',
  });

  drawType(ctx, 'FULL SCALE IQ', CX, 548, {
    font: font(500, 14, FONT.roman),
    color: MUTED,
    align: 'center',
    tracking: 0.34,
  });
  const scoreFont = font(600, 152, FONT.serif);
  const scoreBaseline = 664;
  drawType(ctx, String(payload.s), CX, scoreBaseline, {
    font: scoreFont,
    color: INK,
    align: 'center',
    tracking: 0.01,
  });
  // Cormorant's 3/5/7/9 carry descenders — keep the percentile line clear of them.
  ctx.save();
  ctx.font = scoreFont;
  const scoreDescent = ctx.measureText(String(payload.s)).actualBoundingBoxDescent || 0;
  ctx.restore();
  drawRuns(ctx, CX, Math.max(702, scoreBaseline + scoreDescent + 24), 'center', [
    {
      text: archetype.percentile.toUpperCase(),
      style: { font: font(600, 15, FONT.roman), color: GOLD, tracking: 0.3 },
    },
    {
      text: 'OF THE GLOBAL POPULATION',
      style: { font: font(500, 15, FONT.roman), color: INK_SOFT, tracking: 0.3 },
      gap: 12,
    },
  ]);

  const qrSize = 170;
  const qrCX = CERT_WIDTH - 300;
  const qrX = qrCX - qrSize / 2;
  const qrY = 525;
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.strokeRect(qrX - 10.5, qrY - 10.5, qrSize + 21, qrSize + 21);
  ctx.restore();
  drawQrOnCanvas(ctx, verifyUrl, qrX, qrY, qrSize, {
    darkColor: INK,
    lightColor: PAPER,
    margin: 2,
    borderRadius: 0,
  });
  drawType(ctx, 'SCAN TO VERIFY', qrCX, 724, {
    font: font(500, 12, FONT.roman),
    color: MUTED,
    align: 'center',
    tracking: 0.3,
  });

  // ── Cognitive profile strip ─────────────────────────────────────────────
  const stripLeft = 240;
  const stripRight = CERT_WIDTH - 240;
  const tileW = (stripRight - stripLeft) / dimensions.length;
  const titleY = 752.5;
  hairline(ctx, stripLeft, titleY, stripRight, RULE);
  const stripTitle = 'COGNITIVE PROFILE';
  const stripTitleFont = font(500, 13, FONT.roman);
  const stripTitleW = measureTracked(ctx, stripTitle, stripTitleFont, 0.34);
  ctx.fillStyle = PAPER;
  ctx.fillRect(CX - stripTitleW / 2 - 20, titleY - 11, stripTitleW + 40, 22);
  drawType(ctx, stripTitle, CX, titleY + 4.5, {
    font: stripTitleFont,
    color: MUTED,
    align: 'center',
    tracking: 0.34,
  });

  dimensions.forEach((dim, i) => {
    const cx = stripLeft + tileW * i + tileW / 2;
    drawRuns(ctx, cx, 800, 'center', [
      { text: String(dim.percent), style: { font: font(600, 40, FONT.serif), color: INK } },
      { text: '%', style: { font: font(500, 17, FONT.serif), color: MUTED }, gap: 2 },
    ]);
    const barW = 112;
    const barY = 819;
    ctx.fillStyle = TRACK;
    ctx.fillRect(cx - barW / 2, barY, barW, 3);
    ctx.fillStyle = INK;
    ctx.fillRect(cx - barW / 2, barY, (barW * dim.percent) / 100, 3);
    drawType(ctx, (DIMENSION_SHORT_LABELS[dim.key] || dim.key).toUpperCase(), cx, 848, {
      font: font(400, 12, FONT.roman),
      color: MUTED,
      align: 'center',
      tracking: 0.2,
    });
  });

  // ── Footer ──────────────────────────────────────────────────────────────
  const footerLeft = 120;
  const footerRight = CERT_WIDTH - 120;
  hairline(ctx, footerLeft, 878.5, footerRight, RULE);

  const label = (text: string) => ({
    text,
    style: { font: font(500, 12, FONT.roman), color: MUTED, tracking: 0.3 },
  });
  drawRuns(ctx, footerLeft, 906, 'left', [
    label('ISSUED'),
    { text: formatLongDate(payload.d), style: { font: font(500, 21, FONT.serif), color: INK }, gap: 14 },
  ]);
  drawRuns(ctx, CX, 906, 'center', [
    label('CERTIFICATE NO.'),
    { text: `ARM-${displayRef}`, style: { font: font(500, 14, FONT.mono), color: INK }, gap: 14 },
  ]);
  drawRuns(ctx, footerRight, 906, 'right', [
    label('VERIFY AT'),
    { text: 'AREALME.COM/IQ/CERT', style: { font: font(500, 13, FONT.roman), color: INK, tracking: 0.12 }, gap: 14 },
  ]);

  drawType(
    ctx,
    'Calibrated against global test-taker distributions · Cryptographically signed · Permanent digital record',
    CX,
    934,
    { font: font(500, 16, FONT.serif, true), color: MUTED, align: 'center', maxWidth: 1200 }
  );
}
