import { extractTokenFromLocation } from '../shared/constants';
import { getDimensionsI18n, getVerifyI18n, normalizeLang } from '../shared/i18n';
import { decodeCertificateToken } from '../shared/token';
import type { IQCertDesign, IQCertificatePayload } from '../shared/types';
import { drawRadarChart, formatDisplayRef, getArchetype, normalizeDimensions } from '../engine/renderers/common';
import { renderAcademic } from '../engine/renderers/academic';
import { renderRoyal } from '../engine/renderers/royal';
import { renderSwiss } from '../engine/renderers/swiss';

function getBacktrackUrl(lang?: string): string {
  const clean = normalizeLang(lang);
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
    const dimensions = normalizeDimensions(this.payload.m);
    const title = archetype.titleEn;
    const subtitle = archetype.subtitleEn;
    const backtrackUrl = getBacktrackUrl(this.payload.l);
    const displayRef = formatDisplayRef(this.payload.id);

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
        </header>

        <!-- Verification Banner -->
        <div class="verified-banner ${this.isAuthentic ? '' : 'unverified'}">
          <div class="shield-icon">${this.isAuthentic ? '🛡️' : '⚠️'}</div>
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
              <div class="candidate-title">🎖️ ${title}</div>
              <div class="candidate-date">${t.issuedDate} ${this.payload.d} · ${t.certId} ARM-${displayRef}</div>
            </div>
            <div class="score-badge">
              <div class="score-val">${this.payload.s}</div>
              <div class="score-label">${t.scoreLabel}</div>
              <div class="percentile-text">${t.rankPrefix}${archetype.percentile}</div>
            </div>
          </div>

          <p style="margin-top: 18px; font-size: 14px; color: #9CA3AF; line-height: 1.6;">${subtitle}</p>

          <!-- 7 Dimensions Analysis -->
          <section class="dimensions-section">
            <div class="section-title">📊 ${t.dimensionsTitle}</div>

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
            <div class="section-title" style="justify-content: center;">📜 ${t.certPreviewTitle}</div>

            <div class="cert-style-tabs">
              <button class="cert-tab active" data-style="academic">${t.tabAcademic}</button>
              <button class="cert-tab" data-style="swiss">${t.tabSwiss}</button>
              <button class="cert-tab" data-style="royal">${t.tabRoyal}</button>
            </div>

            <div class="cert-canvas-box">
              <canvas id="view-cert-canvas" width="1600" height="1000"></canvas>
            </div>

            <button class="btn-download-cert" id="btn-download-png">
              <span>⬇️</span> ${t.downloadCert}
            </button>
          </section>

          <!-- Rule 5: Verification Page Disclaimer -->
          <section class="disclaimer-card">
            <div class="disclaimer-header">
              <span class="disclaimer-icon">ℹ️</span>
              <h3>${t.disclaimerTitle}</h3>
            </div>
            <p class="disclaimer-body">${t.disclaimerText}</p>
          </section>

          <!-- ShareKit Component -->
          <section class="share-section">
            <p>🌐 ${t.sharePrompt}</p>
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
      a.download = `AREALME-IQ-Certificate-${this.payload.s}-${this.payload.n.replace(/\s+/g, '_')}.png`;
      a.href = this.certCanvas.toDataURL('image/png');
      a.click();
    });
  }

  private drawRadar(): void {
    const canvas = document.getElementById('radar-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dimensions = normalizeDimensions(this.payload.m);
    ctx.clearRect(0, 0, 400, 400);

    drawRadarChart(ctx, 200, 200, 130, dimensions, 'en', {
      gridColor: 'rgba(255, 255, 255, 0.1)',
      axisColor: 'rgba(255, 255, 255, 0.15)',
      fillColor: 'rgba(16, 185, 129, 0.25)',
      strokeColor: '#10B981',
      labelColor: '#9CA3AF',
      valueColor: '#10B981',
    });
  }

  private initCertCanvas(): void {
    this.certCanvas = document.getElementById('view-cert-canvas') as HTMLCanvasElement | null;
    if (this.certCanvas) {
      this.certCtx = this.certCanvas.getContext('2d');
      this.drawCertificate();
    }
  }

  private drawCertificate(): void {
    if (!this.certCtx) return;
    this.certCtx.clearRect(0, 0, 1600, 1000);

    const verifyUrl = window.location.href;

    if (this.selectedDesign === 'swiss') {
      renderSwiss(this.certCtx, this.payload, verifyUrl);
    } else if (this.selectedDesign === 'royal') {
      renderRoyal(this.certCtx, this.payload, verifyUrl);
    } else {
      renderAcademic(this.certCtx, this.payload, verifyUrl);
    }
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new VerificationApp();
});
