// Names in scripts that must be shaped or ordered as one run are drawn whole, without letter-spacing
// (src/engine/renderers/common.ts isShapedText); Latin, Greek, Cyrillic, CJK and Hangul keep it.
import assert from 'node:assert/strict';
import esbuild from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'iq-cert-shaped-'));
try {
  const file = path.join(temporary, 'test.cjs');
  await esbuild.build({ stdin: { contents: `export { isShapedText, measureTracked } from './src/engine/renderers/common';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: file, logLevel: 'silent' });
  const m = createRequire(import.meta.url)(file);
  // Decomposed accents (letter + combining mark) are drawn whole; precomposed letters (NFC) space fine.
  const whole = ['مريم أحمد', 'נועה כהן', 'ܫܠܡܐ', 'प्रिया शर्मा', 'অনন্যা', 'สมชาย ใจดี', 'Jose\u0301', 'Zoe\u0308', 'Ana 👩‍💻', 'John مريم'];
  const spaced = ['JOHN DOE', 'ΜΑΡΙΑ', 'ИВАН ПЕТРОВ', '王小明', '山田太郎', '김민준', 'JOSÉ'.normalize('NFC'), 'ZOË'.normalize('NFC'), 'NGUYỄN VĂN AN'.normalize('NFC'), 'ÅSA ØSTBY'];
  for (const name of whole) assert.equal(m.isShapedText(name), true, `${name} must be drawn whole`);
  for (const name of spaced) assert.equal(m.isShapedText(name), false, `${name} keeps letter-spacing`);
  // The width used for alignment matches what is drawn: no tracking added to a whole run.
  const ctx = { font: '', save() {}, restore() {}, measureText: (t) => ({ width: Array.from(t).length * 10 }) };
  assert.equal(m.measureTracked(ctx, 'נועה', '600 40px Inter', 0.1), 40);
  assert.equal(m.measureTracked(ctx, 'NOA', '600 40px Inter', 0.1), 30 + 2 * 0.1 * 40);
  console.log(`PASS shaped text: ${whole.length} names drawn whole (RTL, joining, marks, emoji), ${spaced.length} keep letter-spacing`);
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
