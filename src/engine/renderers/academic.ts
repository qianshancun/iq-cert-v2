import { DIMENSION_LABELS } from '../../shared/constants';
import type { IQCertificatePayload } from '../../shared/types';
import { drawProgressBar, drawText, formatDisplayRef, getArchetype, normalizeDimensions } from './common';
import { drawQrOnCanvas } from '../qr';

export function renderAcademic(
  ctx: CanvasRenderingContext2D,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  const archetype = getArchetype(payload.s);
  const dimensions = normalizeDimensions(payload.m);
  const displayRef = formatDisplayRef(payload.id);

  // 1. Background (High Resolution 1600 x 1000)
  ctx.fillStyle = '#FCFAF5';
  ctx.fillRect(0, 0, 1600, 1000);

  // 2. Double Borders
  // Outer Navy
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#1D2D44';
  ctx.strokeRect(16, 16, 1568, 968);

  // Inner Gold
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#C5A059';
  ctx.strokeRect(40, 40, 1520, 920);

  // Corner decorations
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 3;
  const corners = [
    [48, 48],
    [1552, 48],
    [48, 952],
    [1552, 952],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Header
  drawText(
    ctx,
    'AREALME COGNITIVE ASSESSMENT COMMITTEE',
    800,
    90,
    '700 18px "Cinzel", "Times New Roman", serif',
    '#748A9D',
    'center',
    1000
  );

  drawText(
    ctx,
    'CERTIFICATE OF INTELLECTUAL EXCELLENCE',
    800,
    136,
    '700 36px "Cinzel", "Times New Roman", serif',
    '#1D2D44',
    'center',
    1100
  );

  // Divider
  ctx.beginPath();
  ctx.moveTo(560, 168);
  ctx.lineTo(1040, 168);
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. Candidate Info
  drawText(
    ctx,
    'THIS OFFICIAL DOCUMENT ACCREDITS THAT',
    800,
    205,
    'italic 17px "Libre Baskerville", "Georgia", serif',
    '#666666'
  );

  // Bearer Name
  drawText(
    ctx,
    payload.n.toUpperCase(),
    800,
    260,
    '700 46px "Cinzel", "Times New Roman", serif',
    '#0F1E36',
    'center',
    1200
  );

  // Conferred Title
  const title = archetype.titleEn.toUpperCase();
  drawText(
    ctx,
    `HAS COMPLETED THE DEFINITIVE STANDARDIZED TEST WITH DISTINCTION: ${title}`,
    800,
    312,
    '600 17px "Inter", sans-serif',
    '#C5A059',
    'center',
    1300
  );

  // 5. Left Column: Score & Details
  // Score Box Background
  const scoreBoxX = 100;
  const scoreBoxY = 370;
  const scoreBoxW = 460;
  const scoreBoxH = 470;

  ctx.fillStyle = '#F4EFE6';
  ctx.fillRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);
  ctx.strokeStyle = '#D8CBB6';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);

  drawText(
    ctx,
    'STANDARDIZED IQ SCORE',
    scoreBoxX + scoreBoxW / 2,
    425,
    '700 16px "Inter", sans-serif',
    '#748A9D'
  );

  drawText(
    ctx,
    String(payload.s),
    scoreBoxX + scoreBoxW / 2,
    535,
    '800 135px "Cinzel", "Times New Roman", serif',
    '#1D2D44'
  );

  drawText(
    ctx,
    `Ranks in the ${archetype.percentile} of Global Population`,
    scoreBoxX + scoreBoxW / 2,
    650,
    '700 17px "Inter", sans-serif',
    '#C5A059',
    'center',
    420
  );

  // Clean 2-line reference inside score box
  drawText(
    ctx,
    `VERIFICATION REF: ARM-${displayRef}`,
    scoreBoxX + scoreBoxW / 2,
    745,
    '600 13px "Inter", monospace',
    '#888888',
    'center',
    420
  );

  drawText(
    ctx,
    `DATE: ${payload.d}`,
    scoreBoxX + scoreBoxW / 2,
    775,
    '500 13px "Inter", monospace',
    '#888888',
    'center',
    420
  );

  // 6. Middle Column: 7 Cognitive Dimensions
  const startX = 610;
  const startY = 380;
  drawText(
    ctx,
    '7-DIMENSION COGNITIVE PROFILE',
    startX,
    startY,
    '700 18px "Cinzel", "Inter", sans-serif',
    '#1D2D44',
    'left'
  );

  dimensions.forEach((dim, idx) => {
    const rowY = startY + 45 + idx * 54;
    const dimName = DIMENSION_LABELS.en[dim.key]?.name || dim.key;

    // Dimension Name (allocated 200px width with no overlap)
    drawText(
      ctx,
      dimName,
      startX,
      rowY,
      '600 15px "Inter", sans-serif',
      '#374151',
      'left',
      190
    );

    // Progress Bar (starts at startX + 205, width 310)
    drawProgressBar(ctx, startX + 205, rowY - 7, 310, 14, dim.percent, '#E5DCCE', '#1D2D44', 4);

    // Percentage value
    drawText(
      ctx,
      `${dim.percent}%`,
      startX + 535,
      rowY,
      '700 15px "Inter", monospace',
      '#1D2D44',
      'left'
    );
  });

  // 7. Right Column: Wax Stamp & QR Code
  const qrX = 1320;
  const qrY = 530;
  const qrSize = 160;

  drawQrOnCanvas(ctx, verifyUrl, qrX, qrY, qrSize, {
    darkColor: '#1D2D44',
    lightColor: '#FCFAF5',
    margin: 2,
    borderRadius: 8,
  });

  drawText(
    ctx,
    'SCAN TO VERIFY',
    qrX + qrSize / 2,
    qrY + qrSize + 22,
    '700 13px "Inter", sans-serif',
    '#C5A059',
    'center'
  );

  drawText(
    ctx,
    'arealme.com',
    qrX + qrSize / 2,
    qrY + qrSize + 42,
    '500 12px "Inter", monospace',
    '#888888',
    'center'
  );

  // Academic Wax Stamp Effect
  ctx.save();
  ctx.translate(qrX + qrSize / 2, 420);
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fillStyle = '#C5A059';
  ctx.fill();
  ctx.strokeStyle = '#A8843E';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  drawText(ctx, 'SEAL', 0, -10, 'bold 12px "Cinzel", serif', '#FFF');
  drawText(ctx, '2026', 0, 10, 'bold 14px "Cinzel", serif', '#FFF');
  ctx.restore();

  // Bottom Footnote
  drawText(
    ctx,
    'Calibrated against millions of global test-taker distributions · Permanent digital certification',
    800,
    920,
    '13px "Inter", sans-serif',
    '#888888',
    'center'
  );
}
