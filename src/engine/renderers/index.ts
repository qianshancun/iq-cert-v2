import type { IQCertDesign, IQCertificatePayload } from '../../shared/types';
import { renderAcademic } from './academic';
import { CERT_HEIGHT, CERT_WIDTH } from './common';
import { renderRoyal } from './royal';
import { renderSwiss } from './swiss';

export { CERT_HEIGHT, CERT_WIDTH } from './common';

export const CERT_DESIGNS: readonly IQCertDesign[] = ['academic', 'swiss', 'royal'];

/** Draw one design into a context whose user space is 1600 × 1000. */
export function renderCertificate(
  ctx: CanvasRenderingContext2D,
  design: IQCertDesign,
  payload: IQCertificatePayload,
  verifyUrl: string
): void {
  ctx.save();
  ctx.clearRect(0, 0, CERT_WIDTH, CERT_HEIGHT);
  if (design === 'swiss') renderSwiss(ctx, payload, verifyUrl);
  else if (design === 'royal') renderRoyal(ctx, payload, verifyUrl);
  else renderAcademic(ctx, payload, verifyUrl);
  ctx.restore();
}

/**
 * Render into an off-screen canvas at `scale`× (2 → 3200 × 2000) and return a PNG data URL.
 * Returns null if the browser refuses (memory pressure, tainted canvas, …).
 */
export function renderCertificateToDataUrl(
  design: IQCertDesign,
  payload: IQCertificatePayload,
  verifyUrl: string,
  scale: number = 2
): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(CERT_WIDTH * scale);
    canvas.height = Math.round(CERT_HEIGHT * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(scale, scale);
    renderCertificate(ctx, design, payload, verifyUrl);
    return canvas.toDataURL('image/png');
  } catch (_e) {
    return null;
  }
}
