# ARealMe IQ Certificate System 2.0 (`iq-cert-v2`)

Next-generation, high-authority certification engine, verification portal, and Cloudflare Worker for the ARealMe IQ Test ecosystem.

---

## 🌟 Features & Highlights

1. **Multi-Style Canvas 2D Certificate Engine** (1600 × 1000 artwork, 2× PNG export):
   - **Academic (古典学术风)**: Classical diploma on ivory paper — engraved Roman-capital title lockup, Garamond-style name and score with lining numerals, embossed rosette seal with ring text, seven-tile cognitive profile strip, framed verification QR.
   - **Swiss (现代网格风)**: International Typographic Style — black score panel against warm paper, one grotesque family at a strict scale, hairline grid, numbered data table, a single emerald accent.
   - **Royal (皇家星盘风)**: Black & gold charter — gradient-foiled capitals, glowing score, registrar block, and a 7-axis Cognitive Astrolabe with an instrument bezel and stacked rim labels.
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

## ✒️ Typography & Layout System

All three designs share one type system (`src/engine/renderers/common.ts`) and one font loader (`src/engine/fonts.ts`):

| Role | Typeface | Used for |
| :--- | :--- | :--- |
| `FONT.roman` | **Cinzel** | Engraved capitals: titles, tracked labels, the Royal score |
| `FONT.serif` | **Cormorant** | Classical text with lining numerals: names, phrases, the Academic score |
| `FONT.grotesk` | **Archivo** | The Swiss design (Akzidenz-style neo-grotesque) |
| `FONT.mono` | **IBM Plex Mono** | Reference numbers, dates, signatures |

- Text is set on real baselines with true letter-spacing (`drawType` / `drawRuns`), and over-long strings shrink their point size instead of being squashed.
- Canvas never downloads a web font by itself, so `ensureCertFonts()` injects the stylesheet, waits for it to parse, and explicitly loads every face (plus the bearer's Latin-Extended glyphs) before the first paint — bounded by a 4 s timeout, with a redraw if a face arrives late.
- `ArealmeCert.render(canvas, design, data)` draws any design into any canvas without UI; `test-gallery.html` uses it to render every design against edge-case payloads (`?case=N`, `?design=…`, `?crop=x,y,w,h` for magnified inspection).

---

## 🛠️ Project Structure

```
iq-cert-v2/
├── PRD.md                 # Product Requirement & Architecture Document
├── src/
│   ├── shared/            # Common types, constants, token codec, cryptographic hash
│   ├── engine/            # iq-cert.js bundle (Canvas renderers, QR generator, Modal UI)
│   │   ├── renderers/     # Academic, Swiss, Royal renderers + shared type system / radar / seal
│   │   ├── fonts.ts       # Web-font manifest + loader (awaited before every first paint)
│   │   ├── payload.ts     # Host data → signed payload + verification URL
│   │   ├── ui/            # Responsive modal dialog
│   │   └── qr.ts          # Zero-dependency QR generator
│   └── verify/            # Verification & Landing SPA (HTML, TypeScript, CSS)
├── worker/                # Cloudflare Worker entry point
├── scripts/               # Build scripts (esbuild) & local preview server
├── test-harness.html      # IQ Test Host Simulator (141 score test case)
├── test-gallery.html      # Design QA gallery: every design × edge-case payload
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
- Open `http://localhost:8787/test-gallery.html` to review all three designs against edge-case payloads.
- Open `http://localhost:8787/cert/iq/v/<token>` to test the verification landing page (SEO path).
- Legacy `?d=<token>` redirects to the path form.

### Deploy to Cloudflare
```bash
npm run deploy:worker
```
