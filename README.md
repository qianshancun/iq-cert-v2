# ARealMe IQ Certificate System 2.0 (`iq-cert-v2`)

Next-generation, high-authority certification engine, verification portal, and Cloudflare Worker for the ARealMe IQ Test ecosystem.

---

## 🌟 Features & Highlights

1. **Multi-Style Canvas 2D Certificate Engine**:
   - **Academic (古典学术风)**: Classical Ivy League / psychometric parchment, gold foil border, wax seal, dimension progress bars, and high-res QR code.
   - **Swiss (现代网格风)**: International Typographic Style, stark contrast, emerald data matrix, and QR code.
   - **Royal (皇家星盘风)**: Deep black radial gradient, stardust particles, 7-axis heptagonal Cognitive Astrolabe (Radar Chart), and glowing golden typography.
2. **Anti-Abuse Name Locking (单次测试终身绑定姓名)**:
   - Locks identity to the test attempt ID (`attemptId`).
   - Prevents score reuse where a user scores high once and prints certificates under multiple different names.
3. **7 Cognitive Dimensions Integration**:
   - Visualizes all 7 cognitive faculties: Pattern Recognition, Visual-Spatial, Numerical Ability, Logical Reasoning, Working Memory, Planning Ability, Attention & Focus.
4. **Zero-Dependency Vector QR Generator**:
   - Pixel-perfect QR code drawn directly on Canvas.
   - Encodes a compact, cryptographically signed token (`sig`) into the verification URL.
5. **Official Verification Landing Page (`/cert/iq/v/<token>`)**:
   - SEO-friendly path URLs (legacy `?d=` permanently redirects to path form).
   - Shows verified security badge, bearer name, IQ score, percentile ranking, interactive radar chart, dimension definitions, and certificate image.
   - Integrated with **ShareKit** (`<social-share>`) for 1-click social sharing to Twitter/X, Facebook, WhatsApp, Telegram, and Copy Link.
   - High-converting Call-To-Action (CTA) leading visitors directly back to `https://www.arealme.com/iq/` to take the test.
   - Bilingual (English & Simplified Chinese).
6. **Cloudflare Worker Architecture**:
   - Serves `iq-cert.js` with CORS headers.
   - Serves the verification SPA via Cloudflare Workers Static Assets.
   - SSR OpenGraph meta tags for social media bots (Twitter/X cards, Facebook, WhatsApp, WeChat).

---

## 🛠️ Project Structure

```
iq-cert-v2/
├── PRD.md                 # Product Requirement & Architecture Document
├── src/
│   ├── shared/            # Common types, constants, token codec, cryptographic hash
│   ├── engine/            # iq-cert.js bundle (Canvas renderers, QR generator, Modal UI)
│   │   ├── renderers/     # Academic, Swiss, Royal renderers + Radar chart
│   │   ├── ui/            # Responsive modal dialog
│   │   └── qr.ts          # Zero-dependency QR generator
│   └── verify/            # Verification & Landing SPA (HTML, TypeScript, CSS)
├── worker/                # Cloudflare Worker entry point
├── scripts/               # Build scripts (esbuild) & local preview server
├── test-harness.html      # IQ Test Host Simulator (141 score test case)
└── wrangler.jsonc         # Cloudflare Worker & Route configuration
```

---

## 🚀 Quick Start

### Build everything
```bash
npm run build
```

### Local Preview & Simulation
```bash
npm run preview
```
- Open `http://localhost:8787/test-harness.html` to test the IQ test host certificate modal.
- Open `http://localhost:8787/cert/iq/v/<token>` to test the verification landing page (SEO path).
- Legacy `?d=<token>` redirects to the path form.

### Deploy to Cloudflare
```bash
npm run deploy:worker
```
