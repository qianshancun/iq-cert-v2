/**
 * Swiss — International Typographic Style.
 * A black score panel against warm paper, one grotesque family at a strict scale,
 * hairline grid, numbered data table, a single emerald accent.
 */
import { DIMENSION_LABELS } from '../../shared/constants';
import type { IQCertificatePayload } from '../../shared/types';
import { drawQrOnCanvas } from '../qr';
import {
  CERT_HEIGHT,
  CERT_WIDTH,
  FONT,
  drawType,
  font,
  formatDisplayRef,
  getArchetype,
  hairline,
  measureTracked,
  normalizeDimensions,
  wrapText,
} from './common';

const BLACK = '#0B0B0C';
const PAPER = '#F2F1EC';
const WHITE = '#FFFFFF';
const INK = '#111111';
const INK_SOFT = '#3B3B39';
const GREY = '#77776F';
const SILVER = '#9C9C95';
const RULE = '#D6D5CE';
const RULE_DARK = 'rgba(255, 255, 255, 0.16)';
const TRACK = '#DDDCD5';
const ACCENT = '#10B981';

const SPLIT = 600;
const LX = 72;
const LW = SPLIT - LX * 2; // 456
const RX = SPLIT + 64; // 664
const RR = CERT_WIDTH - 72; // 1528

export function renderSwiss(
  ctx: CanvasRenderingContext2D,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  const archetype = getArchetype(payload.s);
  const dimensions = normalizeDimensions(payload.m);
  const displayRef = formatDisplayRef(payload.id);
  const name = payload.n.trim().toUpperCase();
  const year = /^\d{4}/.exec(payload.d || '')?.[0] || String(new Date().getFullYear());

  // ── Panels ──────────────────────────────────────────────────────────────
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, SPLIT, CERT_HEIGHT);
  ctx.fillStyle = PAPER;
  ctx.fillRect(SPLIT, 0, CERT_WIDTH - SPLIT, CERT_HEIGHT);

  // ── Left: identity, score, QR ───────────────────────────────────────────
  ctx.fillStyle = ACCENT;
  ctx.fillRect(LX, 86, 22, 22);
  drawType(ctx, 'AREALME', LX + 36, 105, {
    font: font(800, 26, FONT.grotesk),
    color: WHITE,
    tracking: 0.06,
  });
  drawType(ctx, `COGNITIVE ASSESSMENT · ${year}`, LX, 140, {
    font: font(500, 12, FONT.grotesk),
    color: SILVER,
    tracking: 0.22,
  });
  hairline(ctx, LX, 168.5, LX + LW, RULE_DARK);

  drawType(ctx, 'FULL SCALE IQ', LX, 318, {
    font: font(600, 13, FONT.grotesk),
    color: SILVER,
    tracking: 0.26,
  });
  drawType(ctx, String(payload.s), LX - 8, 540, {
    font: font(900, 280, FONT.grotesk),
    color: WHITE,
    tracking: -0.035,
    maxWidth: LW + 8,
    minSize: 120,
  });

  const tagText = `${archetype.percentile.toUpperCase()} WORLDWIDE`;
  const tagFont = font(700, 14, FONT.grotesk);
  const tagW = measureTracked(ctx, tagText, tagFont, 0.16) + 36;
  ctx.fillStyle = ACCENT;
  ctx.fillRect(LX, 578, tagW, 38);
  drawType(ctx, tagText, LX + 18, 603, { font: tagFont, color: BLACK, tracking: 0.16 });

  drawType(ctx, archetype.titleEn, LX, 664, {
    font: font(600, 24, FONT.grotesk),
    color: WHITE,
    maxWidth: LW,
  });
  const blurbFont = font(400, 15, FONT.grotesk);
  wrapText(ctx, archetype.subtitleEn, blurbFont, LW)
    .slice(0, 2)
    .forEach((line, i) => {
      drawType(ctx, line, LX, 694 + i * 24, { font: blurbFont, color: SILVER });
    });

  const qrSize = 168;
  const qrY = CERT_HEIGHT - 72 - qrSize;
  drawQrOnCanvas(ctx, verifyUrl, LX, qrY, qrSize, {
    darkColor: BLACK,
    lightColor: WHITE,
    margin: 2,
    borderRadius: 4,
  });
  const qrTextX = LX + qrSize + 28;
  drawType(ctx, 'SCAN TO VERIFY', qrTextX, qrY + 44, {
    font: font(600, 12, FONT.grotesk),
    color: WHITE,
    tracking: 0.24,
  });
  drawType(ctx, 'arealme.com/iq/cert', qrTextX, qrY + 70, {
    font: font(400, 14, FONT.mono),
    color: SILVER,
  });
  hairline(ctx, qrTextX, qrY + 92.5, LX + LW, RULE_DARK);
  drawType(ctx, 'Signed token · tamper-evident', qrTextX, qrY + 116, {
    font: font(400, 12, FONT.grotesk),
    color: SILVER,
  });

  // ── Right: header row ───────────────────────────────────────────────────
  drawType(ctx, 'CERTIFICATE OF COGNITIVE ASSESSMENT', RX, 108, {
    font: font(600, 13, FONT.grotesk),
    color: INK,
    tracking: 0.24,
  });
  drawType(ctx, 'STANDARDIZED IQ ASSESSMENT', RR, 108, {
    font: font(500, 13, FONT.grotesk),
    color: GREY,
    align: 'right',
    tracking: 0.24,
  });
  hairline(ctx, RX, 136.5, RR, RULE);

  // ── Right: bearer ───────────────────────────────────────────────────────
  drawType(ctx, 'Certified to', RX, 198, { font: font(400, 16, FONT.grotesk), color: GREY });
  drawType(ctx, name, RX - 4, 282, {
    font: font(800, 88, FONT.grotesk),
    color: INK,
    tracking: -0.015,
    maxWidth: RR - RX + 4,
    minSize: 44,
  });
  drawType(
    ctx,
    'has completed the ARealMe Standardized IQ Assessment and is classified as',
    RX,
    332,
    { font: font(400, 18, FONT.grotesk), color: INK_SOFT, maxWidth: RR - RX }
  );
  drawType(ctx, archetype.titleEn, RX, 374, {
    font: font(600, 26, FONT.grotesk),
    color: INK,
    maxWidth: RR - RX,
  });
  hairline(ctx, RX, 418.5, RR, RULE);

  // ── Right: cognitive profile table ──────────────────────────────────────
  drawType(ctx, 'COGNITIVE PROFILE', RX, 456, {
    font: font(600, 13, FONT.grotesk),
    color: INK,
    tracking: 0.24,
  });
  drawType(ctx, 'SCORE / 100', RR, 456, {
    font: font(500, 13, FONT.grotesk),
    color: GREY,
    align: 'right',
    tracking: 0.24,
  });

  const tableTop = 504;
  const pitch = 44;
  const barX0 = RX + 344;
  const barX1 = RR - 104;
  dimensions.forEach((dim, i) => {
    const y = tableTop + i * pitch;
    drawType(ctx, String(i + 1).padStart(2, '0'), RX, y, {
      font: font(400, 13, FONT.mono),
      color: GREY,
    });
    drawType(ctx, DIMENSION_LABELS.en[dim.key]?.name || dim.key, RX + 44, y, {
      font: font(500, 20, FONT.grotesk),
      color: INK,
    });
    const fillW = ((barX1 - barX0) * dim.percent) / 100;
    ctx.fillStyle = TRACK;
    ctx.fillRect(barX0, y - 11, barX1 - barX0, 6);
    ctx.fillStyle = INK;
    ctx.fillRect(barX0, y - 11, fillW, 6);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(barX0 + fillW - 1.5, y - 16, 3, 16);
    drawType(ctx, String(dim.percent), RR, y, {
      font: font(600, 20, FONT.grotesk),
      color: INK,
      align: 'right',
    });
    hairline(ctx, RX, y + 20.5, RR, RULE);
  });

  // ── Right: footer ───────────────────────────────────────────────────────
  const footLabelY = 858;
  const footValueY = 884;
  const footLabel = (text: string, x: number, align: CanvasTextAlign = 'left') =>
    drawType(ctx, text, x, footLabelY, {
      font: font(500, 11, FONT.grotesk),
      color: GREY,
      align,
      tracking: 0.24,
    });
  const footValue = (text: string, x: number, align: CanvasTextAlign = 'left', color = INK) =>
    drawType(ctx, text, x, footValueY, { font: font(500, 15, FONT.mono), color, align });

  hairline(ctx, RX, 826.5, RR, INK, 1.5);
  footLabel('ISSUED', RX);
  footValue(payload.d, RX);
  footLabel('CERTIFICATE NO.', RX + 200);
  footValue(`ARM-${displayRef}`, RX + 200);
  if (payload.sig) {
    footLabel('SIGNATURE', RX + 520);
    footValue(payload.sig.toUpperCase(), RX + 520);
  }
  footLabel('VERIFY AT', RR, 'right');
  footValue('arealme.com/iq/cert', RR, 'right', GREY);

  drawType(
    ctx,
    'Cryptographically bound to the test session · Validated by ARealMe Cognitive Analytics',
    RX,
    930,
    { font: font(400, 13, FONT.grotesk), color: GREY, maxWidth: RR - RX }
  );
}
