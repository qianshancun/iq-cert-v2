import { DIMENSION_LABELS } from '../shared/constants';
import { decodeCertificateToken } from '../shared/token';
import type { IQCertDesign, IQCertificatePayload } from '../shared/types';
import { drawRadarChart, getArchetype, normalizeDimensions } from '../engine/renderers/common';
import { renderAcademic } from '../engine/renderers/academic';
import { renderRoyal } from '../engine/renderers/royal';
import { renderSwiss } from '../engine/renderers/swiss';

const I18N = {
  en: {
    brandName: 'AREALME CERTIFIED',
    brandDesc: 'Official Cognitive Credential & Psychometrics Registry',
    switchLang: '中文',
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
    shareTitle: 'Share this Verified Credential',
    sharePrompt: 'Inspire your friends or challenge their intellect:',
    ctaTitle: 'Think you can beat this score?',
    ctaDesc: 'Take the definitive 2026 ARealMe IQ Test. 119 data-calibrated questions, full cognitive profile, and free official certification.',
    ctaBtn: 'Start Free IQ Test Now →',
    iqTestUrl: 'https://www.arealme.com/iq/',
    footerNote: '© 2026 ARealMe.com. All psychometric data calibrated across millions of global test results.',
  },
  cn: {
    brandName: 'AREALME 官方认证',
    brandDesc: '国际认知能力证书存证与防伪核验中心',
    switchLang: 'English',
    verifiedTitle: 'AREALME 官方防伪认证已核验有效',
    verifiedDesc: '该证书具备不可伪造的数字签名，并已在 AREALME 智力测验常模数据库完成永久存证。',
    tamperedTitle: '安全警告：防伪验签未通过',
    tamperedDesc: '该证书数据签名与系统记录不一致，可能存在人为修改或伪造，请谨慎鉴别。',
    scoreLabel: '官方智商核定得分',
    issuedDate: '颁证日期：',
    certId: '存证序列号：',
    dimensionsTitle: '7 大高阶认知能力全景剖析',
    radarTitle: '7 维认知天赋星盘 (Radar)',
    certPreviewTitle: '官方正式证书原件预览',
    tabAcademic: '古典学术风',
    tabSwiss: '现代网格风',
    tabRoyal: '皇家星盘风',
    downloadCert: '下载高清官方证书 (PNG)',
    shareTitle: '分享此官方认证成绩',
    sharePrompt: '向好友展示你的认知天赋，或发起智力挑战：',
    ctaTitle: '想知道你的真实智商是多少吗？',
    ctaDesc: '参与 2026 旗舰版 AREALME 智商测试：汇聚历年经典试题，大数据科学标定，全面生成 7 维认知报告与免费官方证书。',
    ctaBtn: '立即参与智商测试 →',
    iqTestUrl: 'https://www.arealme.com/iq/cn/',
    footerNote: '© 2026 ARealMe.com · 历经千万人次大数据常模标定 · 严禁伪造与抄袭',
  },
};

// Fallback demo data if opened without URL parameters (matching Bill LTL from user screenshot!)
const DEMO_PAYLOAD: IQCertificatePayload = {
  id: 'DEMO-BILL-2026',
  n: 'BILL LTL',
  s: 141,
  d: '2026.09.20',
  m: [79, 82, 69, 93, 57, 99, 99], // Pattern, Spatial, Numerical, Logic, Memory, Planning, Attention
  l: 'cn',
  sig: 'demoauth',
  v: 2,
};

class VerificationApp {
  private payload: IQCertificatePayload = DEMO_PAYLOAD;
  private isAuthentic: boolean = true;
  private currentLang: 'en' | 'cn' = 'cn';
  private selectedDesign: IQCertDesign = 'academic';
  private certCanvas: HTMLCanvasElement | null = null;
  private certCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('d');

    if (token) {
      const res = await decodeCertificateToken(token);
      if (res.payload) {
        this.payload = res.payload;
        this.isAuthentic = res.valid;
        this.currentLang = (this.payload.l === 'en') ? 'en' : 'cn';
      } else {
        this.isAuthentic = false;
      }
    } else {
      // Demo mode
      this.payload = DEMO_PAYLOAD;
      this.isAuthentic = true;
      this.currentLang = 'cn';
    }

    this.render();
  }

  private render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    const t = I18N[this.currentLang];
    const isZh = this.currentLang === 'cn';
    const archetype = getArchetype(this.payload.s);
    const dimensions = normalizeDimensions(this.payload.m);
    const title = isZh ? archetype.titleCn : archetype.titleEn;
    const subtitle = isZh ? archetype.subtitleCn : archetype.subtitleEn;

    app.innerHTML = `
      <div class="container">
        <!-- Top Nav -->
        <header class="nav-bar">
          <a href="${t.iqTestUrl}" class="brand-wrap">
            <div class="brand-logo">IQ</div>
            <div class="brand-text">
              <h1>${t.brandName}</h1>
              <p>${t.brandDesc}</p>
            </div>
          </a>
          <button class="lang-btn" id="lang-toggle-btn">${t.switchLang}</button>
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
              <div class="candidate-date">${t.issuedDate} ${this.payload.d} · ${t.certId} ARM-${this.payload.id || '2026'}</div>
            </div>
            <div class="score-badge">
              <div class="score-val">${this.payload.s}</div>
              <div class="score-label">${t.scoreLabel}</div>
              <div class="percentile-text">${isZh ? `位列全球 ${archetype.percentile.replace('Top ', '前 ')}` : `Rank: ${archetype.percentile}`}</div>
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
                const labelObj = isZh ? DIMENSION_LABELS.cn[dim.key] : DIMENSION_LABELS.en[dim.key];
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
              <canvas id="view-cert-canvas" width="1200" height="630"></canvas>
            </div>

            <button class="btn-download-cert" id="btn-download-png">
              <span>⬇️</span> ${t.downloadCert}
            </button>
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
              title="${isZh ? `我在 AREALME 智商测试中获得了 ${this.payload.s} 分（${archetype.percentile.replace('Top ', '全球前 ')}）！这是我的官方认证 7 维认知能力报告：` : `I scored ${this.payload.s} on the Official AREALME IQ Test (${archetype.percentile})! Check my verified cognitive report:`}"
            ></social-share>
          </section>
        </main>

        <!-- Viral CTA: Challenge IQ Test -->
        <aside class="cta-banner">
          <h2>${t.ctaTitle}</h2>
          <p>${t.ctaDesc}</p>
          <a href="${t.iqTestUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">
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
    this.drawCertificate();
  }

  private bindEvents(): void {
    // Language Toggle
    document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
      this.currentLang = this.currentLang === 'cn' ? 'en' : 'cn';
      this.render();
    });

    // Style Tabs
    document.querySelectorAll<HTMLButtonElement>('.cert-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.cert-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.selectedDesign = (tab.dataset.style as IQCertDesign) || 'academic';
        this.drawCertificate();
      });
    });

    // Download Button
    document.getElementById('btn-download-png')?.addEventListener('click', () => {
      if (!this.certCanvas) return;
      const a = document.createElement('a');
      a.download = `AREALME-IQ-${this.payload.s}-${this.payload.n.replace(/\s+/g, '_')}.png`;
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

    drawRadarChart(ctx, 200, 200, 130, dimensions, this.currentLang, {
      gridColor: 'rgba(255, 255, 255, 0.12)',
      axisColor: 'rgba(255, 255, 255, 0.18)',
      fillColor: 'rgba(16, 185, 129, 0.25)',
      strokeColor: '#10B981',
      labelColor: '#D1D5DB',
      valueColor: '#FFFFFF',
    });
  }

  private drawCertificate(): void {
    this.certCanvas = document.getElementById('view-cert-canvas') as HTMLCanvasElement;
    if (!this.certCanvas) return;
    this.certCtx = this.certCanvas.getContext('2d');
    if (!this.certCtx) return;

    this.certCtx.clearRect(0, 0, 1200, 630);
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

// Start application
new VerificationApp();
