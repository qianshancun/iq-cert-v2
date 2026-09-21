import type { IQCertificatePayload } from '../../shared/types';
import { drawRadarChart, drawText, formatDisplayRef, getArchetype, normalizeDimensions } from './common';
import { drawQrOnCanvas } from '../qr';

export function renderRoyal(
  ctx: CanvasRenderingContext2D,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  const archetype = getArchetype(payload.s);
  const dimensions = normalizeDimensions(payload.m);
  const displayRef = formatDisplayRef(payload.id);

  // 1. Radial Background (1600 x 1000)
  const grad = ctx.createRadialGradient(800, 500, 80, 800, 500, 950);
  grad.addColorStop(0, '#241F18');
  grad.addColorStop(1, '#080706');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1600, 1000);

  // 2. Gold Dust Particles
  ctx.save();
  for (let i = 0; i < 350; i++) {
    const px = ((i * 12345 + 6789) % 1540) + 30;
    const py = ((i * 54321 + 9876) % 940) + 30;
    const sz = (i % 3) * 0.9 + 0.6;
    const alpha = ((i % 5) + 2) * 0.12;
    ctx.fillStyle = `rgba(234, 179, 8, ${alpha})`;
    ctx.fillRect(px, py, sz, sz);
  }
  ctx.restore();

  // 3. Royal Gold Borders
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#D4AF37';
  ctx.strokeRect(24, 24, 1552, 952);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#856A28';
  ctx.strokeRect(34, 34, 1532, 932);

  // Corner Gold Knots
  const corners = [
    [34, 34],
    [1566, 34],
    [34, 966],
    [1566, 966],
  ];
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.5;
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Header Titles
  drawText(
    ctx,
    'AREALME HIGH INTELLECT COUNCIL · IMPERIAL CHARTER',
    800,
    75,
    '700 16px "Cinzel", "Times New Roman", serif',
    '#C5A059',
    'center',
    1200
  );

  drawText(
    ctx,
    'CONFERMENT OF SUPREME INTELLECTUAL DIGNITY',
    800,
    120,
    '700 32px "Cinzel", "Times New Roman", serif',
    '#F5E6BE',
    'center',
    1300
  );

  // Divider Line
  ctx.strokeStyle = '#856A28';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(480, 146);
  ctx.lineTo(1120, 146);
  ctx.stroke();

  // 5. Left Column: Bearer Info & Score
  const leftX = 90;

  drawText(
    ctx,
    'ACCREDITED CANDIDATE',
    leftX,
    195,
    '600 14px "Inter", sans-serif',
    '#A1824A',
    'left'
  );

  // Gold Shimmering Bearer Name
  const nameGrad = ctx.createLinearGradient(leftX, 230, leftX + 500, 230);
  nameGrad.addColorStop(0, '#FFF5D0');
  nameGrad.addColorStop(0.5, '#EAB308');
  nameGrad.addColorStop(1, '#CA8A04');

  drawText(
    ctx,
    payload.n.toUpperCase(),
    leftX,
    250,
    '800 48px "Cinzel", "Times New Roman", serif',
    nameGrad as unknown as string,
    'left',
    560
  );

  // Conferred Title
  const title = archetype.titleEn.toUpperCase();
  drawText(
    ctx,
    `CONFERRED TITLE OF ROYAL DISTINCTION: ${title}`,
    leftX,
    305,
    '700 16px "Inter", sans-serif',
    '#E6CA85',
    'left',
    580
  );

  // Royal Score Box (ends at x = 570)
  const scoreBoxW = 480;
  const scoreBoxH = 470;
  const scoreBoxY = 350;

  ctx.fillStyle = 'rgba(25, 20, 12, 0.75)';
  ctx.fillRect(leftX, scoreBoxY, scoreBoxW, scoreBoxH);
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 2;
  ctx.strokeRect(leftX, scoreBoxY, scoreBoxW, scoreBoxH);

  drawText(
    ctx,
    'OFFICIAL STANDARDIZED IQ RATING',
    leftX + scoreBoxW / 2,
    395,
    '700 15px "Inter", sans-serif',
    '#A1824A',
    'center'
  );

  // Glowing IQ number
  const scoreGrad = ctx.createLinearGradient(0, 430, 0, 560);
  scoreGrad.addColorStop(0, '#FFFFFF');
  scoreGrad.addColorStop(0.5, '#FDE047');
  scoreGrad.addColorStop(1, '#CA8A04');

  ctx.save();
  ctx.shadowColor = 'rgba(234, 179, 8, 0.45)';
  ctx.shadowBlur = 30;
  drawText(
    ctx,
    String(payload.s),
    leftX + scoreBoxW / 2,
    500,
    '900 130px "Cinzel", "Times New Roman", serif',
    scoreGrad as unknown as string,
    'center'
  );
  ctx.restore();

  drawText(
    ctx,
    `TIER: ${archetype.percentile.toUpperCase()} WORLDWIDE`,
    leftX + scoreBoxW / 2,
    605,
    '800 17px "Inter", sans-serif',
    '#FACC15',
    'center'
  );

  // 2-line clean reference inside score box
  drawText(
    ctx,
    `REF: ARM-ROYAL-${displayRef}`,
    leftX + scoreBoxW / 2,
    720,
    '600 13px "Inter", monospace',
    '#856A28',
    'center',
    440
  );

  drawText(
    ctx,
    `ISSUED: ${payload.d}`,
    leftX + scoreBoxW / 2,
    750,
    '500 13px "Inter", monospace',
    '#856A28',
    'center',
    440
  );

  // 6. Center-Right Column: 7-Axis Heptagonal Radar Chart (Cognitive Astrolabe)
  // Center is at 1000, 560 with radius 175.
  // Leftmost label extends to 1000 - (175+26) - 150 = 649, which is 79px to the right of scoreBox (ends at 570)!
  const radarCenterX = 1000;
  const radarCenterY = 560;
  const radarRadius = 175;

  drawRadarChart(ctx, radarCenterX, radarCenterY, radarRadius, dimensions, 'en', {
    gridColor: 'rgba(212, 175, 55, 0.25)',
    axisColor: 'rgba(212, 175, 55, 0.35)',
    fillColor: 'rgba(234, 179, 8, 0.22)',
    strokeColor: '#FACC15',
    labelColor: '#E6CA85',
    valueColor: '#FFFFFF',
  });

  drawText(
    ctx,
    '7-DIMENSIONAL COGNITIVE ASTROLABE',
    radarCenterX,
    270,
    '700 17px "Cinzel", "Inter", sans-serif',
    '#C5A059',
    'center'
  );

  // 7. QR Code in bottom right
  const qrX = 1350;
  const qrY = 640;
  const qrSize = 160;

  drawQrOnCanvas(ctx, verifyUrl, qrX, qrY, qrSize, {
    darkColor: '#000000',
    lightColor: '#F5E6BE',
    margin: 2,
    borderRadius: 8,
  });

  drawText(
    ctx,
    'SCAN TO VERIFY',
    qrX + qrSize / 2,
    qrY + qrSize + 22,
    '700 13px "Inter", sans-serif',
    '#E6CA85',
    'center'
  );

  drawText(
    ctx,
    'arealme.com',
    qrX + qrSize / 2,
    qrY + qrSize + 42,
    '500 12px "Inter", monospace',
    '#856A28',
    'center'
  );

  // Bottom seal / footnote
  drawText(
    ctx,
    'Accredited by ARealMe Psychometrics Division · Cryptographically Secured',
    800,
    940,
    '13px "Inter", sans-serif',
    '#856A28',
    'center'
  );
}
