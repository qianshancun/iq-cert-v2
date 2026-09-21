import { DIMENSION_LABELS } from '../../shared/constants';
import type { IQCertificatePayload } from '../../shared/types';
import { drawProgressBar, drawText, getArchetype, normalizeDimensions } from './common';
import { drawQrOnCanvas } from '../qr';

export function renderSwiss(
  ctx: CanvasRenderingContext2D,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  const archetype = getArchetype(payload.s);
  const dimensions = normalizeDimensions(payload.m);

  // 1. Dual Canvas Split
  // Left: Pure Dark
  ctx.fillStyle = '#0D0E11';
  ctx.fillRect(0, 0, 420, 630);

  // Right: Clean architectural light
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(420, 0, 780, 630);

  // Vertical boundary accent
  ctx.fillStyle = '#10B981';
  ctx.fillRect(417, 0, 3, 630);

  // ==========================================
  // LEFT COLUMN (DARK SIDE)
  // ==========================================

  // Brand Header
  drawText(
    ctx,
    'AREALME. // COGNITIVE',
    50,
    56,
    '900 22px "Inter", sans-serif',
    '#FFFFFF',
    'left'
  );

  drawText(
    ctx,
    'STANDARDIZED IQ CERTIFICATION',
    50,
    88,
    '600 12px "Inter", sans-serif',
    '#9CA3AF',
    'left'
  );

  // Big IQ Number
  drawText(
    ctx,
    String(payload.s),
    45,
    270,
    '900 160px "Inter", sans-serif',
    '#FFFFFF',
    'left'
  );

  // Emerald Percentile Badge
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fillRect(50, 375, 300, 38);
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(50, 375, 300, 38);

  drawText(
    ctx,
    `TIER: ${archetype.percentile.toUpperCase()} WORLDWIDE`,
    200,
    394,
    '800 13px "Inter", sans-serif',
    '#10B981',
    'center'
  );

  // Subtitle / Archetype
  drawText(
    ctx,
    archetype.titleEn.toUpperCase(),
    50,
    445,
    '800 18px "Inter", sans-serif',
    '#E5E7EB',
    'left',
    320
  );

  // Metadata Footer
  drawText(
    ctx,
    `ISSUED: ${payload.d}`,
    50,
    550,
    '600 12px "Inter", monospace',
    '#6B7280',
    'left'
  );

  drawText(
    ctx,
    `REF: ARM-${payload.id || '2026'}-${payload.sig || 'AUTH'}`,
    50,
    572,
    '600 12px "Inter", monospace',
    '#6B7280',
    'left'
  );

  // ==========================================
  // RIGHT COLUMN (SWISS GRID & PROFILE)
  // ==========================================

  // Header Title & Bearer
  drawText(
    ctx,
    'ACCREDITED CANDIDATE',
    470,
    56,
    '700 12px "Inter", sans-serif',
    '#6B7280',
    'left'
  );

  drawText(
    ctx,
    payload.n.toUpperCase(),
    470,
    98,
    '900 38px "Inter", "PingFang SC", sans-serif',
    '#111827',
    'left',
    500
  );

  // Swiss Black Accent Bar
  ctx.fillStyle = '#111827';
  ctx.fillRect(470, 132, 120, 6);

  drawText(
    ctx,
    '7-DIMENSIONAL COGNITIVE PROFILE MATRIX',
    470,
    165,
    '800 14px "Inter", sans-serif',
    '#111827',
    'left'
  );

  // Cognitive Matrix List
  const listStartX = 470;
  const listStartY = 195;
  const barWidth = 240;

  dimensions.forEach((dim, idx) => {
    const rowY = listStartY + idx * 36;
    const dimName = DIMENSION_LABELS.en[dim.key]?.name || dim.key;

    // Dimension Label
    drawText(
      ctx,
      dimName,
      listStartX,
      rowY,
      '700 13px "Inter", sans-serif',
      '#374151',
      'left',
      110
    );

    // Progress Bar (Swiss styling: crisp emerald & light gray)
    drawProgressBar(ctx, listStartX + 120, rowY - 5, barWidth, 10, dim.percent, '#E5E7EB', '#10B981', 2);

    // Score Value
    drawText(
      ctx,
      `${dim.percent}%`,
      listStartX + 120 + barWidth + 15,
      rowY,
      '800 13px "Inter", monospace',
      '#111827',
      'left'
    );
  });

  // QR Code Area in bottom-right
  const qrX = 990;
  const qrY = 380;
  const qrSize = 130;

  drawQrOnCanvas(ctx, verifyUrl, qrX, qrY, qrSize, {
    darkColor: '#111827',
    lightColor: '#FFFFFF',
    margin: 2,
    borderRadius: 8,
  });

  drawText(
    ctx,
    'SCAN TO VERIFY',
    qrX + qrSize / 2,
    qrY + qrSize + 20,
    '800 11px "Inter", sans-serif',
    '#111827',
    'center'
  );

  drawText(
    ctx,
    'arealme.com/cert',
    qrX + qrSize / 2,
    qrY + qrSize + 36,
    '600 11px "Inter", monospace',
    '#6B7280',
    'center'
  );

  // Swiss style bottom tagline
  drawText(
    ctx,
    'Cryptographically bound to test session · Validated by ARealMe Cognitive Analytics',
    470,
    588,
    '500 11px "Inter", sans-serif',
    '#9CA3AF',
    'left'
  );
}
