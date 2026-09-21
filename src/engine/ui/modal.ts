import { BLACKLIST, DEFAULT_VERIFY_BASE_URL } from '../../shared/constants';
import { buildVerifyUrl } from '../../shared/constants';
import { getModalI18n, type ModalTranslations } from '../../shared/i18n';
import { encodeCertificateToken } from '../../shared/token';
import type { IQCertDesign, IQCertificatePayload, IQCertificateStartData } from '../../shared/types';
import { renderAcademic } from '../renderers/academic';
import { formatDisplayRef } from '../renderers/common';
import { renderRoyal } from '../renderers/royal';
import { renderSwiss } from '../renderers/swiss';

const MODAL_ID = 'arealme-cert-modal-v2';

export class CertificateModal {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private currentDesign: IQCertDesign = 'academic';
  private data: IQCertificateStartData;
  private payload: IQCertificatePayload | null = null;
  private verifyUrl: string = '';
  private i18n: ModalTranslations;

  constructor(data: IQCertificateStartData) {
    this.data = data;
    this.i18n = getModalI18n(data.lang);
  }

  public async open(): Promise<void> {
    this.removeExisting();
    this.injectStyles();

    // Enforce Rule 4: Scores below 80 cannot generate automated certificates
    if (typeof this.data.score === 'number' && this.data.score < 80) {
      this.renderScoreRestrictedView();
      return;
    }

    // Check if name is already locked for this attempt
    const attemptKey = this.data.attemptId ? `arealme:iq:cert:name:${this.data.attemptId}` : null;
    let storedName = this.data.lockedName || '';
    if (!storedName && attemptKey) {
      try {
        storedName = localStorage.getItem(attemptKey) || '';
      } catch (_e) {}
    }

    if (storedName) {
      await this.initPayload(storedName);
      this.renderPreviewView();
    } else {
      this.renderInputView();
    }
  }

  private removeExisting(): void {
    const el = document.getElementById(MODAL_ID);
    if (el) el.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arealme-cert-styles-v2')) return;
    const style = document.createElement('style');
    style.id = 'arealme-cert-styles-v2';
    style.textContent = `
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483640;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 12, 16, 0.86);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #F3F4F6;
        box-sizing: border-box;
        padding: 16px;
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      #${MODAL_ID}.active {
        opacity: 1;
      }
      .arm-cert-dialog {
        background: #16181D;
        border: 1px solid #2D3139;
        border-radius: 16px;
        width: 100%;
        max-width: 980px;
        max-height: 94vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
        overflow: hidden;
      }
      .arm-cert-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        border-bottom: 1px solid #232730;
        background: #111317;
      }
      .arm-cert-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #E5E7EB;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .arm-cert-close-btn {
        background: none;
        border: none;
        color: #9CA3AF;
        font-size: 24px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .arm-cert-close-btn:hover {
        color: #FFF;
      }
      .arm-cert-body {
        padding: 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      /* Input View */
      .arm-cert-input-wrap {
        max-width: 480px;
        width: 100%;
        text-align: center;
        padding: 24px 0 36px;
      }
      .arm-cert-input-icon {
        width: 56px;
        height: 56px;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 26px;
      }
      .arm-cert-input-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #FFF;
      }
      .arm-cert-input-desc {
        font-size: 13px;
        color: #9CA3AF;
        margin-bottom: 24px;
        line-height: 1.5;
      }
      .arm-cert-input-field {
        width: 100%;
        box-sizing: border-box;
        background: #0D0E12;
        border: 2px solid #374151;
        border-radius: 10px;
        padding: 14px 18px;
        font-size: 18px;
        color: #FFF;
        text-align: center;
        font-weight: 600;
        outline: none;
        transition: border-color 0.2s;
      }
      .arm-cert-input-field:focus {
        border-color: #10B981;
      }
      .arm-cert-input-field.error {
        border-color: #EF4444;
      }
      .arm-cert-btn-primary {
        margin-top: 20px;
        width: 100%;
        background: #10B981;
        color: #064E3B;
        font-weight: 800;
        font-size: 16px;
        border: none;
        border-radius: 10px;
        padding: 14px 20px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .arm-cert-btn-primary:hover {
        background: #34D399;
      }
      .arm-cert-btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      /* Restricted View */
      .arm-cert-restricted-wrap {
        max-width: 500px;
        width: 100%;
        text-align: center;
        padding: 24px 12px 32px;
      }
      .arm-cert-restricted-icon {
        width: 64px;
        height: 64px;
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 32px;
      }
      .arm-cert-restricted-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 12px;
        color: #F87171;
      }
      .arm-cert-restricted-desc {
        font-size: 14px;
        color: #D1D5DB;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      .arm-cert-ref-badge {
        display: inline-block;
        background: #1E222A;
        border: 1px solid #374151;
        padding: 6px 14px;
        border-radius: 6px;
        font-family: monospace;
        font-size: 13px;
        color: #E5E7EB;
        margin-bottom: 24px;
      }
      /* Preview View */
      .arm-cert-preview-wrap {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .arm-cert-tabs {
        display: flex;
        gap: 8px;
        background: #0D0E12;
        padding: 4px;
        border-radius: 10px;
        border: 1px solid #232730;
        margin-bottom: 16px;
      }
      .arm-cert-tab {
        background: none;
        border: none;
        color: #9CA3AF;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .arm-cert-tab.active {
        background: #1F2937;
        color: #FFF;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }
      .arm-cert-canvas-container {
        width: 100%;
        max-width: 960px;
        aspect-ratio: 1600 / 1000;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        background: #000;
      }
      .arm-cert-canvas-container canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .arm-cert-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
        width: 100%;
        max-width: 960px;
        justify-content: center;
      }
      .arm-cert-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 11px 22px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 1px solid transparent;
      }
      .arm-cert-btn-download {
        background: #10B981;
        color: #064E3B;
      }
      .arm-cert-btn-download:hover {
        background: #34D399;
      }
      .arm-cert-btn-online {
        background: #1F2937;
        color: #E5E7EB;
        border-color: #374151;
      }
      .arm-cert-btn-online:hover {
        background: #374151;
        color: #FFF;
      }
      .arm-cert-btn-cancel {
        background: transparent;
        color: #9CA3AF;
        border-color: #374151;
      }
      .arm-cert-btn-cancel:hover {
        color: #FFF;
        border-color: #4B5563;
      }
    `;
    document.head.appendChild(style);
  }

  private async initPayload(name: string): Promise<void> {
    const score = Number(this.data.score) || 100;
    const date = this.data.date || new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const attemptId = this.data.attemptId || Math.random().toString(36).slice(2, 10);
    const recordedLang = (this.data.lang || 'en').trim();

    let rawDimensions = this.data.dimensions;
    let norm: number[];
    if (Array.isArray(rawDimensions) && rawDimensions.length === 7 && typeof rawDimensions[0] === 'number') {
      norm = rawDimensions as number[];
    } else if (Array.isArray(rawDimensions)) {
      norm = (rawDimensions as Array<{ percent?: number }>).map((d) => d.percent ?? 75);
    } else {
      norm = [80, 82, 75, 88, 70, 85, 90];
    }

    const basePayload: Omit<IQCertificatePayload, 'sig'> = {
      id: attemptId,
      n: name.trim(),
      s: score,
      d: date,
      m: norm,
      l: recordedLang,
      v: 3,
    };

    const token = await encodeCertificateToken(basePayload);
    const baseUrl = this.data.verifyBaseUrl || DEFAULT_VERIFY_BASE_URL;
    this.verifyUrl = buildVerifyUrl(token, baseUrl);

    this.payload = {
      ...basePayload,
      sig: token.slice(-8),
    };

    // Lock name into storage
    if (attemptId) {
      try {
        localStorage.setItem(`arealme:iq:cert:name:${attemptId}`, name.trim());
      } catch (_e) {}
    }
  }

  /** Render Score < 80 restriction screen (Rule 4) */
  private renderScoreRestrictedView(): void {
    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;

    const t = this.i18n;
    const displayRef = formatDisplayRef(this.data.attemptId);
    const mailSubject = encodeURIComponent(`Manual IQ Certificate Request [ARM-${displayRef}]`);
    const mailBody = encodeURIComponent(`Dear ARealMe Review Team,\n\nI would like to request manual review and certification for my IQ test attempt.\n\nAttempt ID: ARM-${displayRef}\nScore: ${this.data.score}\nDate: ${this.data.date || ''}\n\nThank you.`);
    const mailtoUrl = `mailto:support@arealme.com?subject=${mailSubject}&body=${mailBody}`;

    overlay.innerHTML = `
      <div class="arm-cert-dialog" role="dialog" aria-modal="true">
        <div class="arm-cert-header">
          <h3>🎖️ ${t.modalTitle}</h3>
          <button class="arm-cert-close-btn" id="arm-cert-close-btn" aria-label="Close">×</button>
        </div>
        <div class="arm-cert-body">
          <div class="arm-cert-restricted-wrap">
            <div class="arm-cert-restricted-icon">🛡️</div>
            <div class="arm-cert-restricted-title">${t.scoreBelow80Title}</div>
            <div class="arm-cert-restricted-desc">${t.scoreBelow80Desc}</div>
            <div class="arm-cert-ref-badge">Attempt ID: ARM-${displayRef}</div>
            <a href="${mailtoUrl}" class="arm-cert-btn-primary" style="display:block; text-decoration:none; margin-bottom:12px;">
              ✉️ ${t.contactEmailBtn}
            </a>
            <button class="arm-cert-btn arm-cert-btn-cancel" id="arm-cert-restricted-cancel" style="width:100%;">
              ${t.btnClose}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.container = overlay;

    requestAnimationFrame(() => overlay.classList.add('active'));

    overlay.querySelector('#arm-cert-close-btn')?.addEventListener('click', () => this.close());
    overlay.querySelector('#arm-cert-restricted-cancel')?.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
  }

  private renderInputView(): void {
    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;

    const t = this.i18n;

    overlay.innerHTML = `
      <div class="arm-cert-dialog" role="dialog" aria-modal="true">
        <div class="arm-cert-header">
          <h3>🎖️ ${t.modalTitle}</h3>
          <button class="arm-cert-close-btn" id="arm-cert-close-btn" aria-label="Close">×</button>
        </div>
        <div class="arm-cert-body">
          <div class="arm-cert-input-wrap">
            <div class="arm-cert-input-icon">📜</div>
            <div class="arm-cert-input-title">${t.enterName}</div>
            <div class="arm-cert-input-desc">${t.nameRestrictionNotice}</div>
            <input type="text" class="arm-cert-input-field" id="arm-cert-name-input" maxlength="15" placeholder="${t.namePlaceholder}" autofocus>
            <div id="arm-cert-error" style="color:#EF4444; font-size:12px; margin-top:8px; display:none;"></div>
            <button class="arm-cert-btn-primary" id="arm-cert-submit-btn">${t.generateBtn}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.container = overlay;

    requestAnimationFrame(() => overlay.classList.add('active'));

    const input = overlay.querySelector<HTMLInputElement>('#arm-cert-name-input')!;
    const btnSubmit = overlay.querySelector<HTMLButtonElement>('#arm-cert-submit-btn')!;
    const btnClose = overlay.querySelector<HTMLButtonElement>('#arm-cert-close-btn')!;
    const errorMsg = overlay.querySelector<HTMLElement>('#arm-cert-error')!;

    const handleSubmit = async () => {
      const val = input.value.trim();

      // Rule 2: Max 15 letters and spaces, Latin/European letters only, no numbers
      if (!val || val.length < 1 || val.length > 15) {
        input.classList.add('error');
        errorMsg.textContent = t.invalidInput;
        errorMsg.style.display = 'block';
        return;
      }

      // Latin/European letters & spaces regex
      const validLetters = /^[\p{Script=Latin}\s]{1,15}$/u;
      const hasLetter = /\p{Script=Latin}/u.test(val);
      if (!validLetters.test(val) || !hasLetter) {
        input.classList.add('error');
        errorMsg.textContent = t.invalidInput;
        errorMsg.style.display = 'block';
        return;
      }

      // Blacklist filter
      const upper = val.toUpperCase().replace(/[^A-Z]/g, '');
      if (BLACKLIST.some((b) => upper.includes(b))) {
        input.classList.add('error');
        errorMsg.textContent = t.blacklisted;
        errorMsg.style.display = 'block';
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.textContent = t.generating;

      await this.initPayload(val);
      this.renderPreviewView();
    };

    btnSubmit.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void handleSubmit();
    });
    btnClose.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
  }

  private renderPreviewView(): void {
    if (!this.payload) return;

    let overlay = document.getElementById(MODAL_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = MODAL_ID;
      document.body.appendChild(overlay);
    }
    this.container = overlay;

    const t = this.i18n;

    overlay.innerHTML = `
      <div class="arm-cert-dialog" role="dialog" aria-modal="true">
        <div class="arm-cert-header">
          <h3>🎖️ ${t.modalTitle} · ${this.payload.n} (${this.payload.s})</h3>
          <button class="arm-cert-close-btn" id="arm-cert-close-btn" aria-label="Close">×</button>
        </div>
        <div class="arm-cert-body">
          <div class="arm-cert-preview-wrap">
            <div class="arm-cert-tabs">
              <button class="arm-cert-tab active" data-design="academic">${t.tabAcademic}</button>
              <button class="arm-cert-tab" data-design="swiss">${t.tabSwiss}</button>
              <button class="arm-cert-tab" data-design="royal">${t.tabRoyal}</button>
            </div>
            <div class="arm-cert-canvas-container" id="ac-wrapper">
              <canvas id="arm-cert-canvas" width="1600" height="1000"></canvas>
            </div>
            <div class="arm-cert-actions">
              <button class="arm-cert-btn arm-cert-btn-download" id="arm-cert-download-btn">
                <span>⬇️</span> ${t.btnDownload}
              </button>
              <button class="arm-cert-btn arm-cert-btn-online" id="arm-cert-online-btn">
                <span>🔗</span> ${t.btnVerifyOnline}
              </button>
              <button class="arm-cert-btn arm-cert-btn-cancel" id="arm-cert-cancel-btn">
                ${t.btnClose}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    requestAnimationFrame(() => overlay?.classList.add('active'));

    this.canvas = overlay.querySelector<HTMLCanvasElement>('#arm-cert-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }

    // Tab bindings
    overlay.querySelectorAll<HTMLButtonElement>('.arm-cert-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        overlay?.querySelectorAll('.arm-cert-tab').forEach((b) => b.classList.remove('active'));
        tab.classList.add('active');
        this.currentDesign = (tab.dataset.design as IQCertDesign) || 'academic';
        this.drawCurrent();
      });
    });

    // Action buttons
    overlay.querySelector('#arm-cert-download-btn')?.addEventListener('click', () => this.downloadPng());
    overlay.querySelector('#arm-cert-online-btn')?.addEventListener('click', () => {
      if (this.verifyUrl) {
        window.open(this.verifyUrl, '_blank', 'noopener,noreferrer');
      }
    });
    overlay.querySelector('#arm-cert-close-btn')?.addEventListener('click', () => this.close());
    overlay.querySelector('#arm-cert-cancel-btn')?.addEventListener('click', () => this.close());

    this.drawCurrent();
  }

  private drawCurrent(): void {
    if (!this.ctx || !this.payload) return;
    this.ctx.clearRect(0, 0, 1600, 1000);

    if (this.currentDesign === 'swiss') {
      renderSwiss(this.ctx, this.payload, this.verifyUrl);
    } else if (this.currentDesign === 'royal') {
      renderRoyal(this.ctx, this.payload, this.verifyUrl);
    } else {
      renderAcademic(this.ctx, this.payload, this.verifyUrl);
    }

    // Dispatch event for host page capture
    window.dispatchEvent(
      new CustomEvent('arealme:cert:rendered', {
        detail: {
          canvas: this.canvas,
          payload: this.payload,
          design: this.currentDesign,
        },
      })
    );
  }

  private downloadPng(): void {
    if (!this.canvas || !this.payload) return;
    const a = document.createElement('a');
    a.download = `AREALME-IQ-Certificate-${this.payload.s}-${this.payload.n.replace(/\s+/g, '_')}.png`;
    a.href = this.canvas.toDataURL('image/png');
    a.click();
  }

  public close(): void {
    if (this.container) {
      this.container.classList.remove('active');
      setTimeout(() => this.container?.remove(), 250);
    }
  }
}
