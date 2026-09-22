import type { IQCertDesign, IQCertificatePayload, IQCertificateStartData } from '../shared/types';
import { ensureCertFonts, injectCertFontStylesheet } from './fonts';
import { buildCertificatePayload } from './payload';
import { CERT_HEIGHT, CERT_WIDTH, renderCertificate } from './renderers';
import { CertificateModal } from './ui/modal';

export interface ArealmeCertRenderResult {
  payload: IQCertificatePayload;
  verifyUrl: string;
}

// Declare global types
declare global {
  interface Window {
    ArealmeCertConfig?: {
      onReady?: () => void;
    };
    ArealmeCert?: {
      version: string;
      /** Open the certificate dialog (name entry → preview → download / verify). */
      start: (data: IQCertificateStartData, options?: Record<string, unknown>) => void;
      /**
       * Draw a certificate directly into a canvas without any UI (host-side capture, previews, QA).
       * The canvas keeps its own size; the 1600 × 1000 artwork is scaled to fit it.
       */
      render: (
        canvas: HTMLCanvasElement,
        design: IQCertDesign,
        data: IQCertificateStartData & { name: string }
      ) => Promise<ArealmeCertRenderResult>;
      /** Resolves once the certificate typefaces are available (or the load timed out). */
      fontsReady: Promise<boolean>;
      modalInstance?: CertificateModal;
    };
  }
}

// Initialize ArealmeCert global
export function initEngine(): void {
  injectCertFontStylesheet();
  const fontsReady = ensureCertFonts();

  window.ArealmeCert = {
    version: '2.1.0',
    fontsReady,
    start(data: IQCertificateStartData, _options?: Record<string, unknown>) {
      const modal = new CertificateModal(data);
      window.ArealmeCert!.modalInstance = modal;
      void modal.open();
    },
    async render(canvas, design, data) {
      const name = (data.name || data.lockedName || '').trim() || 'CANDIDATE';
      const built = await buildCertificatePayload(data, name);
      await ensureCertFonts(built.payload.n);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('ArealmeCert.render: 2D context unavailable');
      ctx.setTransform(canvas.width / CERT_WIDTH, 0, 0, canvas.height / CERT_HEIGHT, 0, 0);
      renderCertificate(ctx, design, built.payload, built.verifyUrl);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return { payload: built.payload, verifyUrl: built.verifyUrl };
    },
  };

  // Trigger onReady callback once the typefaces are in (never blocks for more than the font timeout)
  if (typeof document !== 'undefined') {
    fontsReady
      .then(() => window.ArealmeCertConfig?.onReady?.())
      .catch(() => window.ArealmeCertConfig?.onReady?.());
  }
}

initEngine();
