import type { IQCertificateStartData } from '../shared/types';
import { CertificateModal } from './ui/modal';

// Declare global types
declare global {
  interface Window {
    ArealmeCertConfig?: {
      onReady?: () => void;
    };
    ArealmeCert?: {
      version: string;
      start: (data: IQCertificateStartData, options?: Record<string, unknown>) => void;
      modalInstance?: CertificateModal;
    };
  }
}

/**
 * Preloads Google Fonts for Certificate Canvas typography
 */
function preloadFonts(): void {
  if (document.getElementById('arealme-cert-fonts')) return;
  const link = document.createElement('link');
  link.id = 'arealme-cert-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800;900&family=Inter:wght@400;600;700;800;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap';
  document.head.appendChild(link);
}

// Initialize ArealmeCert global
export function initEngine(): void {
  preloadFonts();

  window.ArealmeCert = {
    version: '2.0.0',
    start(data: IQCertificateStartData, _options?: Record<string, unknown>) {
      const modal = new CertificateModal(data);
      window.ArealmeCert!.modalInstance = modal;
      void modal.open();
    },
  };

  // Trigger onReady callback if host app is waiting
  if (typeof document !== 'undefined') {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        window.ArealmeCertConfig?.onReady?.();
      }).catch(() => {
        window.ArealmeCertConfig?.onReady?.();
      });
    } else {
      setTimeout(() => {
        window.ArealmeCertConfig?.onReady?.();
      }, 100);
    }
  }
}

initEngine();
