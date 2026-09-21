import type { IQCertificatePayload } from '../../shared/types';
import { drawRadarChart, drawText, getArchetype, normalizeDimensions } from './common';
import { drawQrOnCanvas } from '../qr';

export function renderRoyal(
  ctx: CanvasRenderingContext2D,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  const archetype = getArchetype(payload.s);
  const dimensions = normalizeDimensions(payload.m);

  // 1. Radial Background
  const grad = ctx.createRadialGradient(600, 315, 50, 600, 315, 750);
  grad.addColorStop(0, '#241F18');
  grad.addColorStop(1, '#080706');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 630);

  // 2. Gold Dust Particles (pseudo-random with deterministic pseudo-seed)
  ctx.save();
  for (let i = 0; i < 280; i++) {
    const px = ((i * 12345 + 6789) % 1160) + 20;
    const py = ((i * 54321 + 9876) % 590) + 20;
    const sz = (i % 3) * 0.8 + 0.6;
    const alpha = ((i % 5) + 2) * 0.12;
    ctx.fillStyle = `rgba(234, 179, 8, ${alpha})`;
    ctx.fillRect(px, py, sz, sz);
  }
  ctx.restore();

  // 3. Royal Gold Borders
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#D4AF37';
  ctx.strokeRect(20, 20, 1160, 590);

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#856A28';
  ctx.strokeRect(28, 28, 1144, 574);

  // Corner Gold Knots
  const corners = [
    [28, 28],
    [1172, 28],
    [28, 602],
    [1172, 602],
  ];
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2;
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Header Titles
  drawText(
    ctx,
    'AREALME HIGH INTELLECT COUNCIL · IMPERIAL CHARTER',
    600,
    58,
    '700 13px "Cinzel", "Times New Roman", serif',
    '#C5A059',
    'center',
    900
  );

  drawText(
    ctx,
    'CONFERMENT OF SUPREME INTELLECTUAL DIGNITY',
    600,
    88,
    '700 24px "Cinzel", "Times New Roman", serif',
    '#F5E6BE',
    'center',
    960
  );

  // Divider Line with diamond in middle
  ctx.strokeStyle = '#856A28';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(350, 108);
  ctx.lineTo(850, 108);
  ctx.stroke();

  // 5. Left Column: Bearer Info & Score
  const leftX = 70;

  drawText(
    ctx,
    'ACCREDITED CANDIDATE',
    leftX,
    145,
    '600 12px "Inter", sans-serif',
    '#A1824A',
    'left'
  );

  // Gold Shimmering Bearer Name
  const nameGrad = ctx.createLinearGradient(leftX, 175, leftX + 400, 175);
  nameGrad.addColorStop(0, '#FFF5D0');
  nameGrad.addColorStop(0.5, '#EAB308');
  nameGrad.addColorStop(1, '#CA8A04');

  drawText(
    ctx,
    payload.n.toUpperCase(),
    leftX,
    185,
    '800 36px "Cinzel", "Times New Roman", "PingFang SC", serif',
    nameGrad as unknown as string,
    'left',
    440
  );

  // Conferred Title
  const title = archetype.titleEn.toUpperCase();
  drawText(
    ctx,
    `CONFERRED TITLE OF ROYAL DISTINCTION: ${title}`,
    leftX,
    228,
    '700 14px "Inter", sans-serif',
    '#E6CA85',
    'left',
    460
  );

  // Royal Score Box
  ctx.fillStyle = 'rgba(25, 20, 12, 0.75)';
  ctx.fillRect(leftX, 260, 430, 215);
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(leftX, 260, 430, 215);

  drawText(
    ctx,
    'OFFICIAL STANDARDIZED IQ RATING',
    leftX + 215,
    292,
    '700 13px "Inter", sans-serif',
    '#A1824A',
    'center'
  );

  // Glowing IQ number
  const scoreGrad = ctx.createLinearGradient(0, 310, 0, 410);
  scoreGrad.addColorStop(0, '#FFFFFF');
  scoreGrad.addColorStop(0.5, '#FDE047');
  scoreGrad.addColorStop(1, '#CA8A04');

  ctx.save();
  ctx.shadowColor = 'rgba(234, 179, 8, 0.45)';
  ctx.shadowBlur = 25;
  drawText(
    ctx,
    String(payload.s),
    leftX + 215,
    360,
    '900 90px "Cinzel", "Times New Roman", serif',
    scoreGrad as unknown as string,
    'center'
  );
  ctx.restore();

  drawText(
    ctx,
    `TIER: ${archetype.percentile.toUpperCase()} WORLDWIDE`,
    leftX + 215,
    428,
    '800 14px "Inter", sans-serif',
    '#FACC15',
    'center'
  );

  drawText(
    ctx,
    `REF: ARM-ROYAL-${payload.id || '2026'} · ISSUED: ${payload.d}`,
    leftX + 215,
    455,
    '500 11px "Inter", monospace',
    '#856A28',
    'center'
  );

  // 6. Right Column: 7-Axis Heptagonal Radar Chart (Cognitive Astrolabe)
  const radarCenterX = 730;
  const radarCenterY = 370;
  const radarRadius = 125;

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
    188,
    '700 13px "Cinzel", "Inter", sans-serif',
    '#C5A059',
    'center'
  );

  // 7. QR Code in bottom right
  const qrX = 1000;
  const qrY = 410;
  const qrSize = 120;

  drawQrOnCanvas(ctx, verifyUrl, qrX, qrY, qrSize, {
    darkColor: '#000000',
    lightColor: '#F5E6BE',
    margin: 2,
    borderRadius: 6,
  });

  drawText(
    ctx,
    'SCAN TO VERIFY',
    qrX + qrSize / 2,
    qrY + qrSize + 16,
    '700 11px "Inter", sans-serif',
    '#E6CA85',
    'center'
  );

  drawText(
    ctx,
    'arealme.com',
    qrX + qrSize / 2,
    qrY + qrSize + 32,
    '500 11px "Inter", monospace',
    '#856A28',
    'center'
  );

  // Bottom seal / footnote
  drawText(
    ctx,
    'Accredited by ARealMe Psychometrics Division · Cryptographically Secured',
    600,
    585,
    '11px "Inter", sans-serif',
    '#856A28',
    'center'
  );
}
