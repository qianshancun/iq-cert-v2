import { DIMENSION_LABELS, extractTokenFromLocation } from '../shared/constants';
import { decodeCertificateToken } from '../shared/token';
import type { IQCertDesign, IQCertificatePayload } from '../shared/types';
import { drawRadarChart, getArchetype, normalizeDimensions } from '../engine/renderers/common';
import { renderAcademic } from '../engine/renderers/academic';
import { renderRoyal } from '../engine/renderers/royal';
import { renderSwiss } from '../engine/renderers/swiss';

const TEXT = {
  brandName: 'AREALME CERTIFIED',
  brandDesc: 'Official Cognitive Credential & Psychometrics Registry',
  verifiedTitle: 'Official ARealMe Certification Verified',
  verifiedDesc: 'This credential is cryptographically authentic and registered in the ARealMe test database.',
  tamperedTitle: 'Verification Warning: Potential Alteration',
  tamperedDesc: 'The digital signature does not match our official records. This certificate may have been modified.',
  scoreLabel: 'IQ RATING',
  issuedDate: 'Issued Date:',
  certId: 'Credential ID:',
  dimensionsTitle: '7-Dimension Cognitive Abilities Analysis',
  radarTitle: 'Cognitive Astrolabe Radar',
  certPreviewTitle: 'Official Certificate Document',
  tabAcademic: 'Academic Classical',
  tabSwiss: 'Swiss Minimalist',
  tabRoyal: 'Royal Astrolabe',
  downloadCert: 'Download High-Res Certificate (PNG)',
  sharePrompt: 'Inspire your friends or challenge their intellect:',
  ctaTitle: 'Think you can beat this score?',
  ctaDesc: 'Take the definitive 2026 ARealMe IQ Test. 119 data-calibrated questions, full cognitive profile, and free official certification.',
  ctaBtn: 'Start Free IQ Test Now →',
  footerNote: '© 2026 ARealMe.com. All psychometric data calibrated across millions of global test results.',
};

function getBacktrackUrl(lang?: string): string {
  const clean = (lang || 'en').trim().toLowerCase();
  if (!clean || clean === 'en') {
    return 'https://www.arealme.com/iq/';
  }
  return `https://www.arealme.com/iq/${clean}/`;
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
  v: 2,
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
      const pathBase = window.location.pathname.replace(/\/+$/, '') || '/cert/iq/v';
      const seoPath = pathBase.endsWith('/v') || pathBase.endsWith('/verify')
        ? `${pathBase}/${queryToken}`
        : `/cert/iq/v/${queryToken}`;
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

    const archetype = getArchetype(this.payload.s);
    const dimensions = normalizeDimensions(this.payload.m);
    const title = archetype.titleEn;
    const subtitle = archetype.subtitleEn;
    const backtrackUrl = getBacktrackUrl(this.payload.l);

    app.innerHTML = `
      <div class="container">
        <!-- Top Nav -->
        <header class="nav-bar">
          <a href="${backtrackUrl}" class="brand-wrap">
            <div class="brand-logo">IQ</div>
            <div class="brand-text">
              <h1>${TEXT.brandName}</h1>
              <p>${TEXT.brandDesc}</p>
            </div>
          </a>
        </header>

        <!-- Verification Banner -->
        <div class="verified-banner ${this.isAuthentic ? '' : 'unverified'}">
          <div class="shield-icon">${this.isAuthentic ? '🛡️' : '⚠️'}</div>
          <div class="verified-banner-text">
            <h2>${this.isAuthentic ? TEXT.verifiedTitle : TEXT.tamperedTitle}</h2>
            <p>${this.isAuthentic ? TEXT.verifiedDesc : TEXT.tamperedDesc}</p>
          </div>
        </div>

        <!-- Candidate Profile Card -->
        <main class="profile-card">
          <div class="candidate-header">
            <div class="candidate-info">
              <h2>${this.payload.n}</h2>
              <div class="candidate-title">🎖️ ${title}</div>
              <div class="candidate-date">${TEXT.issuedDate} ${this.payload.d} · ${TEXT.certId} ARM-${this.payload.id || '2026'}</div>
            </div>
            <div class="score-badge">
              <div class="score-val">${this.payload.s}</div>
              <div class="score-label">${TEXT.scoreLabel}</div>
              <div class="percentile-text">Rank: ${archetype.percentile}</div>
            </div>
          </div>

          <p style="margin-top: 18px; font-size: 14px; color: #9CA3AF; line-height: 1.6;">${subtitle}</p>

          <!-- 7 Dimensions Analysis -->
          <section class="dimensions-section">
            <div class="section-title">📊 ${TEXT.dimensionsTitle}</div>

            <!-- Radar Astrolabe Canvas -->
            <div class="radar-wrap">
              <canvas id="radar-canvas" class="radar-canvas" width="400" height="400"></canvas>
            </div>

            <!-- Dimensions Grid -->
            <div class="dim-grid">
              ${dimensions.map((dim) => {
                const labelObj = DIMENSION_LABELS.en[dim.key];
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
            <div class="section-title" style="justify-content: center;">📜 ${TEXT.certPreviewTitle}</div>

            <div class="cert-style-tabs">
              <button class="cert-tab active" data-style="academic">${TEXT.tabAcademic}</button>
              <button class="cert-tab" data-style="swiss">${TEXT.tabSwiss}</button>
              <button class="cert-tab" data-style="royal">${TEXT.tabRoyal}</button>
            </div>

            <div class="cert-canvas-box">
              <canvas id="view-cert-canvas" width="1200" height="630"></canvas>
            </div>

            <button class="btn-download-cert" id="btn-download-png">
              <span>⬇️</span> ${TEXT.downloadCert}
            </button>
          </section>

          <!-- ShareKit Component -->
          <section class="share-section">
            <p>🌐 ${TEXT.sharePrompt}</p>
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
          <h2>${TEXT.ctaTitle}</h2>
          <p>${TEXT.ctaDesc}</p>
          <a href="${backtrackUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">
            ${TEXT.ctaBtn}
          </a>
        </aside>

        <!-- Footer -->
        <footer class="portal-footer">
          <p>${TEXT.footerNote}</p>
        </footer>
      </div>
    `;

    this.bindEvents();
    this.drawRadar();
    this.initCertCanvas();
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
      a.download = `AREALME-IQ-Certified-${this.payload.s}-${this.payload.n.replace(/\s+/g, '_')}.png`;
      a.href = this.certCanvas.toDataURL('image/png');
      a.click();
    });
  }

  private drawRadar(): void {
    const canvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 400, 400);
    const dimensions = normalizeDimensions(this.payload.m);

    drawRadarChart(ctx, 200, 200, 130, dimensions, 'en', {
      gridColor: 'rgba(55, 65, 81, 0.4)',
      axisColor: 'rgba(75, 85, 99, 0.5)',
      fillColor: 'rgba(16, 185, 129, 0.25)',
      strokeColor: '#10B981',
      labelColor: '#9CA3AF',
      valueColor: '#10B981',
    });
  }

  private initCertCanvas(): void {
    this.certCanvas = document.getElementById('view-cert-canvas') as HTMLCanvasElement;
    if (this.certCanvas) {
      this.certCtx = this.certCanvas.getContext('2d');
      this.drawCertificate();
    }
  }

  private drawCertificate(): void {
    if (!this.certCtx) return;
    this.certCtx.clearRect(0, 0, 1200, 630);

    const currentUrl = window.location.href;
    if (this.selectedDesign === 'swiss') {
      renderSwiss(this.certCtx, this.payload, currentUrl);
    } else if (this.selectedDesign === 'royal') {
      renderRoyal(this.certCtx, this.payload, currentUrl);
    } else {
      renderAcademic(this.certCtx, this.payload, currentUrl);
    }
  }
}

// Start App on DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new VerificationApp());
} else {
  new VerificationApp();
}
