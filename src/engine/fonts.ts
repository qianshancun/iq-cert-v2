/**
 * Web-font loading for the certificate canvases.
 *
 * Canvas text never triggers a web-font download by itself: if a face is not already in memory
 * when fillText runs, the browser silently falls back. So we (1) inject the stylesheet,
 * (2) wait for it to parse, and (3) explicitly load every face we draw with — bounded by a timeout
 * so a slow network can never block certificate generation.
 */

export const CERT_FONT_STYLESHEET_ID = 'arealme-cert-fonts';

export const CERT_FONT_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2' +
  '?family=Cinzel:wght@400..900' +
  '&family=Cormorant:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600' +
  '&family=Archivo:wght@400..900' +
  '&family=IBM+Plex+Mono:wght@400;500;600' +
  '&display=swap';

/** Every family/weight/style combination the renderers use. */
const FONT_SPECS: readonly string[] = [
  '400 16px "Cinzel"',
  '500 16px "Cinzel"',
  '600 16px "Cinzel"',
  '700 16px "Cinzel"',
  '500 16px "Cormorant"',
  '600 16px "Cormorant"',
  '700 16px "Cormorant"',
  'italic 500 16px "Cormorant"',
  '400 16px "Archivo"',
  '500 16px "Archivo"',
  '600 16px "Archivo"',
  '700 16px "Archivo"',
  '800 16px "Archivo"',
  '900 16px "Archivo"',
  '400 16px "IBM Plex Mono"',
  '500 16px "IBM Plex Mono"',
];

/** Characters that appear on every certificate; names are appended per call. */
const BASE_SAMPLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .%·-/&';

const pending = new Map<string, Promise<boolean>>();

export function injectCertFontStylesheet(): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById(CERT_FONT_STYLESHEET_ID);
  if (existing instanceof HTMLLinkElement) return existing;
  const link = document.createElement('link');
  link.id = CERT_FONT_STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = CERT_FONT_STYLESHEET_URL;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  return link;
}

function waitForStylesheet(link: HTMLLinkElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (link.sheet) {
      resolve();
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      link.removeEventListener('load', done);
      link.removeEventListener('error', done);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    link.addEventListener('load', done);
    link.addEventListener('error', done);
  });
}

/**
 * Resolve once every certificate face is available (true) or the timeout elapsed (false).
 * Pass the bearer's name so any Latin-Extended subset it needs is fetched too.
 */
export function ensureCertFonts(sampleText: string = '', timeoutMs: number = 4000): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.load !== 'function') {
    return Promise.resolve(false);
  }

  const extended = Array.from(sampleText).filter((ch) => ch.charCodeAt(0) > 0x7f).join('');
  const key = extended ? `ext:${Array.from(new Set(extended)).sort().join('')}` : 'base';
  const cached = pending.get(key);
  if (cached) return cached;

  const sample = BASE_SAMPLE + extended;
  const link = injectCertFontStylesheet();

  const task = (async () => {
    const started = Date.now();
    if (link) await waitForStylesheet(link, timeoutMs);
    const remaining = Math.max(250, timeoutMs - (Date.now() - started));

    const loads = Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec, sample).catch(() => [])));
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), remaining));
    const outcome = await Promise.race([loads, timeout]);
    if (outcome === 'timeout') {
      pending.delete(key); // allow a later retry once the network catches up
      return false;
    }
    return FONT_SPECS.every((spec) => {
      try {
        return document.fonts.check(spec, sample);
      } catch (_e) {
        return true;
      }
    });
  })();

  pending.set(key, task);
  return task;
}
