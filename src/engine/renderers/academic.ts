import { DIMENSION_LABELS } from '../../shared/constants';
import type { IQCertificatePayload } from '../../shared/types';
import { drawProgressBar, drawText, getArchetype, normalizeDimensions } from './common';
import { drawQrOnCanvas } from '../qr';

export function renderAcademic(
  ctx: CanvasRenderingContext2D,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  const archetype = getArchetype(payload.s);
  const dimensions = normalizeDimensions(payload.m);

  // 1. Background
  ctx.fillStyle = '#FCFAF5';
  ctx.fillRect(0, 0, 1200, 630);

  // 2. Double Borders
  // Outer Navy
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#1D2D44';
  ctx.strokeRect(12, 12, 1176, 606);

  // Inner Gold
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#C5A059';
  ctx.strokeRect(32, 32, 1136, 566);

  // Corner decorations
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 3;
  const corners = [
    [38, 38],
    [1162, 38],
    [38, 592],
    [1162, 592],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Header
  drawText(
    ctx,
    'AREALME COGNITIVE ASSESSMENT COMMITTEE',
    600,
    68,
    '700 15px "Cinzel", "Times New Roman", serif',
    '#748A9D',
    'center',
    800
  );

  drawText(
    ctx,
    'CERTIFICATE OF INTELLECTUAL EXCELLENCE',
    600,
    100,
    '700 28px "Cinzel", "Times New Roman", serif',
    '#1D2D44',
    'center',
    900
  );

  // Divider
  ctx.beginPath();
  ctx.moveTo(420, 122);
  ctx.lineTo(780, 122);
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. Candidate Info
  drawText(
    ctx,
    'THIS OFFICIAL DOCUMENT ACCREDITS THAT',
    600,
    148,
    'italic 14px "Libre Baskerville", "Georgia", serif',
    '#666666'
  );

  // Bearer Name
  drawText(
    ctx,
    payload.n.toUpperCase(),
    600,
    188,
    '700 36px "Cinzel", "Times New Roman", "PingFang SC", serif',
    '#0F1E36',
    'center',
    900
  );

  // Conferred Title
  const title = archetype.titleEn.toUpperCase();
  drawText(
    ctx,
    `HAS COMPLETED THE DEFINITIVE STANDARDIZED TEST WITH DISTINCTION: ${title}`,
    600,
    224,
    '600 15px "Inter", sans-serif',
    '#C5A059',
    'center',
    960
  );

  // 5. Left Column: Score & Details
  // Score Box Background
  ctx.fillStyle = '#F4EFE6';
  ctx.fillRect(80, 260, 420, 260);
  ctx.strokeStyle = '#D8CBB6';
  ctx.lineWidth = 1;
  ctx.strokeRect(80, 260, 420, 260);

  drawText(
    ctx,
    'STANDARDIZED IQ SCORE',
    290,
    294,
    '700 14px "Inter", sans-serif',
    '#748A9D'
  );

  drawText(
    ctx,
    String(payload.s),
    290,
    370,
    '800 96px "Cinzel", "Times New Roman", serif',
    '#1D2D44'
  );

  drawText(
    ctx,
    `Ranks in the ${archetype.percentile} of Global Population`,
    290,
    444,
    '700 15px "Inter", sans-serif',
    '#C5A059'
  );

  drawText(
    ctx,
    `VERIFICATION REF: ARM-${payload.id || '2026'} · DATE: ${payload.d}`,
    290,
    490,
    '500 12px "Inter", monospace',
    '#888888'
  );

  // 6. Right Column: 7 Cognitive Dimensions
  const startX = 540;
  const startY = 270;
  drawText(
    ctx,
    '7-DIMENSION COGNITIVE PROFILE',
    startX,
    startY,
    '700 15px "Cinzel", "Inter", sans-serif',
    '#1D2D44',
    'left'
  );

  dimensions.forEach((dim, idx) => {
    const rowY = startY + 32 + idx * 31;
    const dimName = DIMENSION_LABELS.en[dim.key]?.name || dim.key;

    // Dimension Name
    drawText(
      ctx,
      dimName,
      startX,
      rowY,
      '600 13px "Inter", sans-serif',
      '#444444',
      'left',
      120
    );

    // Progress Bar
    drawProgressBar(ctx, startX + 115, rowY - 5, 220, 10, dim.percent, '#E5DCce', '#1D2D44', 3);

    // Percentage value
    drawText(
      ctx,
      `${dim.percent}%`,
      startX + 355,
      rowY,
      '700 13px "Inter", monospace',
      '#1D2D44',
      'left'
    );
  });

  // 7. QR Code & Seal in bottom right
  const qrX = 1000;
  const qrY = 320;
  const qrSize = 120;

  drawQrOnCanvas(ctx, verifyUrl, qrX, qrY, qrSize, {
    darkColor: '#1D2D44',
    lightColor: '#FCFAF5',
    margin: 2,
    borderRadius: 6,
  });

  drawText(
    ctx,
    'SCAN TO VERIFY',
    qrX + qrSize / 2,
    qrY + qrSize + 18,
    '700 11px "Inter", sans-serif',
    '#C5A059',
    'center'
  );

  drawText(
    ctx,
    'arealme.com/cert',
    qrX + qrSize / 2,
    qrY + qrSize + 34,
    '500 11px "Inter", monospace',
    '#888888',
    'center'
  );

  // Academic Wax Stamp Effect
  ctx.save();
  ctx.translate(1060, 270);
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#C5A059';
  ctx.fill();
  ctx.strokeStyle = '#A8843E';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'SEAL', 0, -8, 'bold 10px "Cinzel", serif', '#FFF');
  drawText(ctx, '2026', 0, 8, 'bold 11px "Cinzel", serif', '#FFF');
  ctx.restore();

  // Bottom Footnote
  drawText(
    ctx,
    'Calibrated against millions of global test-taker distributions · Permanent digital certification',
    600,
    574,
    '12px "Inter", sans-serif',
    '#999999',
    'center'
  );
}
