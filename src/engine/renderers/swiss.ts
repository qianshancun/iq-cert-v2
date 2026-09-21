import { DIMENSION_LABELS } from '../../shared/constants';
import type { IQCertificatePayload } from '../../shared/types';
import { drawProgressBar, drawText, formatDisplayRef, getArchetype, normalizeDimensions } from './common';
import { drawQrOnCanvas } from '../qr';

export function renderSwiss(
  ctx: CanvasRenderingContext2D,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  const archetype = getArchetype(payload.s);
  const dimensions = normalizeDimensions(payload.m);
  const displayRef = formatDisplayRef(payload.id);

  // 1. Dual Canvas Split (1600 x 1000)
  // Left: Pure Dark (540px wide)
  ctx.fillStyle = '#0D0E11';
  ctx.fillRect(0, 0, 540, 1000);

  // Right: Clean architectural light (1060px wide)
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(540, 0, 1060, 1000);

  // Vertical boundary accent
  ctx.fillStyle = '#10B981';
  ctx.fillRect(536, 0, 4, 1000);

  // ==========================================
  // LEFT COLUMN (DARK SIDE)
  // ==========================================

  // Brand Header
  drawText(
    ctx,
    'AREALME. // COGNITIVE',
    60,
    75,
    '900 26px "Inter", sans-serif',
    '#FFFFFF',
    'left'
  );

  drawText(
    ctx,
    'STANDARDIZED IQ CERTIFICATION',
    60,
    115,
    '600 13px "Inter", sans-serif',
    '#9CA3AF',
    'left'
  );

  // Big IQ Number
  drawText(
    ctx,
    String(payload.s),
    55,
    370,
    '900 210px "Inter", sans-serif',
    '#FFFFFF',
    'left'
  );

  // Emerald Percentile Badge
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fillRect(60, 510, 420, 52);
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 510, 420, 52);

  drawText(
    ctx,
    `TIER: ${archetype.percentile.toUpperCase()} WORLDWIDE`,
    270,
    536,
    '800 16px "Inter", sans-serif',
    '#10B981',
    'center'
  );

  // Subtitle / Archetype
  drawText(
    ctx,
    archetype.titleEn.toUpperCase(),
    60,
    610,
    '800 22px "Inter", sans-serif',
    '#E5E7EB',
    'left',
    420
  );

  // Metadata Footer (contained within 420px, never crossing boundary line)
  drawText(
    ctx,
    `ISSUED: ${payload.d}`,
    60,
    865,
    '600 14px "Inter", monospace',
    '#9CA3AF',
    'left',
    420
  );

  drawText(
    ctx,
    `REF: ARM-${displayRef}`,
    60,
    900,
    '600 14px "Inter", monospace',
    '#9CA3AF',
    'left',
    420
  );

  // ==========================================
  // RIGHT COLUMN (SWISS GRID & PROFILE)
  // ==========================================

  // Header Title & Bearer
  const rightX = 610;

  drawText(
    ctx,
    'ACCREDITED CANDIDATE',
    rightX,
    80,
    '700 14px "Inter", sans-serif',
    '#6B7280',
    'left'
  );

  drawText(
    ctx,
    payload.n.toUpperCase(),
    rightX,
    140,
    '900 52px "Inter", sans-serif',
    '#111827',
    'left',
    880
  );

  // Underline bar
  ctx.fillStyle = '#111827';
  ctx.fillRect(rightX, 180, 140, 5);

  // 7 Dimensions Matrix Header
  drawText(
    ctx,
    '7-DIMENSIONAL COGNITIVE PROFILE MATRIX',
    rightX,
    250,
    '800 16px "Inter", sans-serif',
    '#374151',
    'left'
  );

  // 7 Dimensions Rows
  const startY = 270;
  dimensions.forEach((dim, idx) => {
    const rowY = startY + 45 + idx * 56;
    const dimName = DIMENSION_LABELS.en[dim.key]?.name || dim.key;

    // Dimension Label (allocated 210px)
    drawText(
      ctx,
      dimName,
      rightX,
      rowY,
      '700 15px "Inter", sans-serif',
      '#1F2937',
      'left',
      200
    );

    // Modern Swiss Progress Bar
    drawProgressBar(ctx, rightX + 215, rowY - 7, 430, 14, dim.percent, '#E5E7EB', '#10B981', 4);

    // Percentage
    drawText(
      ctx,
      `${dim.percent}%`,
      rightX + 665,
      rowY,
      '800 15px "Inter", monospace',
      '#111827',
      'left'
    );
  });

  // QR Code in bottom right of light side
  const qrX = 1350;
  const qrY = 720;
  const qrSize = 160;

  drawQrOnCanvas(ctx, verifyUrl, qrX, qrY, qrSize, {
    darkColor: '#0D0E11',
    lightColor: '#FFFFFF',
    margin: 2,
    borderRadius: 8,
  });

  drawText(
    ctx,
    'SCAN TO VERIFY',
    qrX + qrSize / 2,
    qrY + qrSize + 22,
    '800 12px "Inter", sans-serif',
    '#374151',
    'center'
  );

  drawText(
    ctx,
    'arealme.com',
    qrX + qrSize / 2,
    qrY + qrSize + 42,
    '600 12px "Inter", monospace',
    '#6B7280',
    'center'
  );

  // Footnote
  drawText(
    ctx,
    'Cryptographically bound to test session · Validated by ARealMe Cognitive Analytics',
    rightX,
    930,
    '13px "Inter", sans-serif',
    '#6B7280',
    'left',
    700
  );
}
