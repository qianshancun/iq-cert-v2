import { extractTokenFromLocation } from '../shared/constants';
import { getDimensionsI18n, getVerifyI18n, normalizeLang } from '../shared/i18n';
import { getMedalTier, medalSvgHtml } from '../shared/medal';
import { decodeCertificateToken } from '../shared/token';
import type { IQCertDesign, IQCertificatePayload } from '../shared/types';
import { ensureCertFonts } from '../engine/fonts';
import { renderCertificate } from '../engine/renderers';
import { drawRadarChart, FONT, font, formatDisplayRef, getArchetype, normalizeDimensions } from '../engine/renderers/common';

function getBacktrackUrl(lang?: string): string {
  const clean = normalizeLang(lang);
  return `https://www.arealme.com/iq/${clean || 'en'}/`;
}

// Fallback demo data if opened without URL parameters
const DEMO_PAYLOAD: IQCertificatePayload = {
  id: 'DEMO-BILL-2026',
  n: 'BILL LTL',
  s: 141,
  d: '2026.09.20',
  m: [79, 82, 69, 93, 57, 99, 99], // Pattern, Spatial, Numerical, Logic, Memory, Planning, Attention
  l: 'en',
  sig: 'demoauth',
  v: 3,
};

class VerificationApp {
  private payload: IQCertificatePayload = DEMO_PAYLOAD;
  private isAuthentic: boolean = true;
  private selectedDesign: IQCertDesign = 'academic';
  private certCanvas: HTMLCanvasElement | null = null;
  private certCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    const token = extractTokenFromLocation(window.location.pathname, window.location.search);

    // Legacy ?d=... → permanent SEO path redirect
    const queryToken = new URLSearchParams(window.location.search).get('d');
    if (queryToken && !window.location.pathname.match(/\/(?:v|verify)\/[^/?#]+/)) {
      const seoPath = `/iq/cert/v/${queryToken}`;
      window.history.replaceState(null, '', seoPath);
    }

    if (token) {
      const res = await decodeCertificateToken(token);
      if (res.payload) {
        this.payload = res.payload;
        this.isAuthentic = res.valid;
      } else {
        this.isAuthentic = false;
      }
    } else {
      this.payload = DEMO_PAYLOAD;
      this.isAuthentic = true;
    }

    this.render();
  }

  private render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    const t = getVerifyI18n(this.payload.l);
    const dimsI18n = getDimensionsI18n(this.payload.l);

    const archetype = getArchetype(this.payload.s);
    const medal = getMedalTier(this.payload.s);
    const dimensions = normalizeDimensions(this.payload.m);
    const title = archetype.titleEn;
    const subtitle = archetype.subtitleEn;
    const backtrackUrl = getBacktrackUrl(this.payload.l);
    const displayRef = formatDisplayRef(this.payload.id);
    const medalIcon = medalSvgHtml(this.payload.s, 22);

    app.innerHTML = `
      <div class="container">
        <!-- Top Nav -->
        <header class="nav-bar">
          <a href="${backtrackUrl}" class="brand-wrap">
            <div class="brand-logo">IQ</div>
            <div class="brand-text">
              <h1>${t.brandName}</h1>
              <p>${t.brandDesc}</p>
            </div>
          </a>
          <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Toggle dark mode" title="Toggle dark/light mode" data-site-action="toggle-theme"><svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></button>
        </header>

        <!-- Verification Banner -->
        <div class="verified-banner ${this.isAuthentic ? '' : 'unverified'}">
          <div class="shield-icon">
            ${this.isAuthentic 
              ? `<svg class="svg-icon shield-svg" viewBox="0 0 428.16 428.16" fill="currentColor"><path d="M393.8,110.208c-0.512-11.264-0.512-22.016-0.512-32.768c0-8.704-6.656-15.36-15.36-15.36 c-64,0-112.64-18.432-153.088-57.856c-6.144-5.632-15.36-5.632-21.504,0C162.888,43.648,114.248,62.08,50.248,62.08 c-8.704,0-15.36,6.656-15.36,15.36c0,10.752,0,21.504-0.512,32.768c-2.048,107.52-5.12,254.976,174.592,316.928l5.12,1.024 l5.12-1.024C398.408,365.184,395.848,218.24,393.8,110.208z M201.8,259.2c-3.072,2.56-6.656,4.096-10.752,4.096h-0.512 c-4.096,0-8.192-2.048-10.752-5.12l-47.616-52.736l23.04-20.48l37.376,41.472l82.944-78.848l20.992,22.528L201.8,259.2z"/></svg>`
              : `⚠️`
            }
          </div>
          <div class="verified-banner-text">
            <h2>${this.isAuthentic ? t.verifiedTitle : t.tamperedTitle}</h2>
            <p>${this.isAuthentic ? t.verifiedDesc : t.tamperedDesc}</p>
          </div>
        </div>

        <!-- Candidate Profile Card -->
        <main class="profile-card">
          <div class="candidate-header">
            <div class="candidate-info">
              <h2>${this.payload.n}</h2>
              <div class="candidate-title" style="color:${medal.color}">${medalIcon} ${title}</div>
              <div class="candidate-date">${t.issuedDate} ${this.payload.d} · ${t.certId} ARM-${displayRef}</div>
            </div>
            <div class="score-badge">
              <div class="score-val">${this.payload.s}</div>
              <div class="score-label">${t.scoreLabel}</div>
              <div class="percentile-text" style="color:${medal.color}">${t.rankPrefix}${archetype.percentile}</div>
            </div>
          </div>

          <p style="margin-top: 18px; font-size: 14px; color: var(--text-muted); line-height: 1.6;">${subtitle}</p>

          <!-- 7 Dimensions Analysis -->
          <section class="dimensions-section">
            <div class="section-title">
              <svg class="svg-icon dim-svg" viewBox="0 0 682.66669 682.66669"><g transform="matrix(1.3333333,0,0,-1.3333333,0,682.66667)"><g transform="translate(256,485.1982)"><path d="M 0,0 241,-175.092 148.933,-458.396 H -148.933 L -241,-175.092 Z" style="fill:none;stroke:currentColor;stroke-width:30;stroke-linecap:round;stroke-linejoin:round;"/></g><g transform="translate(256,366.9473)"><path d="m 0,0 168.931,-80.255 -95.298,-156.247 -174.991,-38.15 v 172.441 z" style="fill:none;stroke:currentColor;stroke-width:30;stroke-linecap:round;stroke-linejoin:round;"/></g><g transform="translate(256,485.1982)"><path d="m 0,0 v -253.396 l 241,78.304 -241,-78.304 148.933,-205 -148.933,205 -148.933,-205 148.933,205 -241,78.304 241,-78.304 z" style="fill:none;stroke:currentColor;stroke-width:30;stroke-linecap:round;stroke-linejoin:round;"/></g></g></svg>
              ${t.dimensionsTitle}
            </div>

            <!-- Radar Astrolabe Canvas -->
            <div class="radar-wrap">
              <canvas id="radar-canvas" class="radar-canvas" width="400" height="400"></canvas>
            </div>

            <!-- Dimensions Grid -->
            <div class="dim-grid">
              ${dimensions.map((dim) => {
                const labelObj = dimsI18n[dim.key];
                return `
                  <div class="dim-item">
                    <div class="dim-header">
                      <span class="dim-name">${labelObj?.name || dim.key}</span>
                      <span class="dim-score">${dim.percent}%</span>
                    </div>
                    <div class="dim-bar-track">
                      <div class="dim-bar-fill" style="width: ${dim.percent}%;"></div>
                    </div>
                    <div class="dim-desc">${labelObj?.desc || ''}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </section>

          <!-- Certificate View & Download -->
          <section class="cert-preview-section">
            <div class="section-title" style="justify-content: center;">
              <svg class="svg-icon cert-doc-svg" viewBox="0 0 512 512" fill="currentColor"><path d="m106 512h300c24.814 0 45-20.186 45-45v-317h-105c-24.814 0-45-20.186-45-45v-105h-195c-24.814 0-45 20.186-45 45v422c0 24.814 20.186 45 45 45zm60-301h180c8.291 0 15 6.709 15 15s-6.709 15-15 15h-180c-8.291 0-15-6.709-15-15s6.709-15 15-15zm0 60h180c8.291 0 15 6.709 15 15s-6.709 15-15 15h-180c-8.291 0-15-6.709-15-15s6.709-15 15-15zm0 60h180c8.291 0 15 6.709 15 15s-6.709 15-15 15h-180c-8.291 0-15-6.709-15-15s6.709-15 15-15zm0 60h120c8.291 0 15 6.709 15 15s-6.709 15-15 15h-120c-8.291 0-15-6.709-15-15s6.709-15 15-15z"/><path d="m346 120h96.211l-111.211-111.211v96.211c0 8.276 6.724 15 15 15z"/></svg>
              ${t.certPreviewTitle}
            </div>

            <div class="cert-style-tabs">
              <button class="cert-tab active" data-style="academic">${t.tabAcademic}</button>
              <button class="cert-tab" data-style="swiss">${t.tabSwiss}</button>
              <button class="cert-tab" data-style="royal">${t.tabRoyal}</button>
            </div>

            <div class="cert-canvas-box">
              <canvas id="view-cert-canvas" width="1600" height="1000"></canvas>
            </div>

            <button class="btn-download-cert" id="btn-download-png">
              <svg class="svg-icon download-svg" viewBox="0 0 32 32" fill="currentColor"><path d="m30.71 7.29-6-6a1 1 0 0 0 -.71-.29h-2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2-2v-8h-6a3 3 0 0 0 -3 3v24a3 3 0 0 0 3 3h2v-9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v9h2a3 3 0 0 0 3-3v-20a1 1 0 0 0 -.29-.71z"/><path d="m12 1h8v8h-8z"/><path d="m23 21h-14a1 1 0 0 0 -1 1v9h16v-9a1 1 0 0 0 -1-1z"/></svg>
              ${t.downloadCert}
            </button>
          </section>

          <!-- Rule 5: Verification Page Disclaimer -->
          <section class="disclaimer-card">
            <div class="disclaimer-header">
              <svg class="svg-icon disclaimer-svg" viewBox="0 0 60 60" fill="currentColor"><path d="m30 5c-13.7799683 0-25 11.210022-25 25s11.2200317 25 25 25c13.7900391 0 25-11.210022 25-25s-11.2099609-25-25-25zm0 42.75c-2.2000122 0-4-1.789978-4-4s1.7999878-4 4-4c2.210022 0 4 1.789978 4 4s-1.789978 4-4 4zm4.2000122-14.7699585c-.0999756 2.2599487-1.9400024 4.0199585-4.2000122 4.0199585-2.25 0-4.0999756-1.7600098-4.1900024-4.0199585l-.6900024-15.6300049c-.0599976-1.3400269.4200439-2.6199951 1.3500366-3.5900269.9299926-.9699706 2.1900024-1.5100097 3.5299682-1.5100097 1.3500366 0 2.6000366.5400391 3.5400391 1.5100098.9299927.9700317 1.4099731 2.25 1.3499756 3.5900269z"/></svg>
              <h3>${t.disclaimerTitle}</h3>
            </div>
            <p class="disclaimer-body">${t.disclaimerText}</p>
          </section>

          <!-- ShareKit Component -->
          <section class="share-section">
            <p>${t.sharePrompt}</p>
            <social-share
              id="social-share-btn"
              style="display: block; min-height: 48px;"
              platforms="native,x,facebook,whatsapp,telegram,copylink"
              radius="8px"
              gap="12"
              url="${window.location.href}"
              title="I scored ${this.payload.s} on the Official AREALME IQ Test (${archetype.percentile})! Check my verified cognitive report:"
            ></social-share>
          </section>
        </main>

        <!-- Viral CTA: Challenge IQ Test -->
        <aside class="cta-banner">
          <h2>${t.ctaTitle}</h2>
          <p>${t.ctaDesc}</p>
          <a href="${backtrackUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">
            ${t.ctaBtn}
          </a>
        </aside>

        <!-- Footer -->
        <footer class="portal-footer">
          <p>${t.footerNote}</p>
        </footer>
      </div>
    `;

    this.bindEvents();
    this.drawRadar();
    void this.initCertCanvas();
  }

  private bindEvents(): void {
    // Certificate Tabs
    document.querySelectorAll<HTMLButtonElement>('.cert-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.cert-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.selectedDesign = (tab.dataset.style as IQCertDesign) || 'academic';
        this.drawCertificate();
      });
    });

    // Download Certificate
    document.getElementById('btn-download-png')?.addEventListener('click', () => {
      if (!this.certCanvas) return;
      const a = document.createElement('a');
      a.download = `AREALME-IQ-Certificate-${this.payload.s}-${this.payload.n.replace(/\s+/g, '_')}.png`;
      a.href = this.certCanvas.toDataURL('image/png');
      a.click();
    });

    // Theme Toggle (Dark / Light)
    const toggleBtn = document.getElementById('theme-toggle');
    const getStoredTheme = () => {
      const stored = localStorage.getItem('arealme_theme');
      if (stored === 'light' || stored === 'dark') return stored;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    };

    const applyTheme = (theme: 'dark' | 'light') => {
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      this.drawRadar();
    };

    // Apply initial theme
    applyTheme(getStoredTheme());

    toggleBtn?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('arealme_theme', next);
      applyTheme(next);
    });
  }

  private drawRadar(): void {
    const canvas = document.getElementById('radar-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const dimensions = normalizeDimensions(this.payload.m);
    ctx.clearRect(0, 0, 400, 400);

    drawRadarChart(ctx, 200, 200, 130, dimensions, 'en', {
      gridColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
      axisColor: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)',
      fillColor: isLight ? 'rgba(5, 150, 105, 0.2)' : 'rgba(16, 185, 129, 0.25)',
      strokeColor: isLight ? '#059669' : '#10B981',
      labelColor: isLight ? '#475569' : '#9CA3AF',
      valueColor: isLight ? '#059669' : '#10B981',
      labelFont: font(600, 13, FONT.grotesk),
      dotRadius: 4.5,
      lineWidth: 2.5,
    });
  }

  private async initCertCanvas(): Promise<void> {
    this.certCanvas = document.getElementById('view-cert-canvas') as HTMLCanvasElement | null;
    if (this.certCanvas) {
      this.certCtx = this.certCanvas.getContext('2d');
      this.drawCertificate();
      // Ensure webfonts load and re-draw for crisp rendering
      await ensureCertFonts(this.payload.n);
      this.drawCertificate();
      if (document.fonts) {
        document.fonts.ready.then(() => this.drawCertificate());
      }
    }
  }

  private drawCertificate(): void {
    if (!this.certCtx) return;
    renderCertificate(this.certCtx, this.selectedDesign, this.payload, window.location.href);
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new VerificationApp();
});
