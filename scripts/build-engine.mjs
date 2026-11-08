import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const isWatch = process.argv.includes('--watch');

const outDir = path.resolve('dist');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const verifyDir = path.resolve('dist/verify');
if (!fs.existsSync(verifyDir)) {
  fs.mkdirSync(verifyDir, { recursive: true });
}

console.log('🔨 Building IQ Certificate Engine (iq-cert.js)...');

const ctx = await esbuild.context({
  entryPoints: ['src/engine/index.ts'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: 'dist/iq-cert.js',
  minify: !isWatch,
  sourcemap: true,
  logLevel: 'info',
});

await ctx.rebuild();

// Also copy to verify assets directory so the worker can serve it
fs.copyFileSync('dist/iq-cert.js', 'dist/verify/iq-cert.js');
// A versioned name per release (package.json), and the previous release's name kept for any page that
// still asks for it (2.3.0 only changed how shaped scripts are drawn; same API).
const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
fs.copyFileSync('dist/iq-cert.js', `dist/verify/iq-cert-v${version}.js`);
fs.copyFileSync('dist/iq-cert.js', 'dist/verify/iq-cert-v2.2.2.js');

console.log('✅ iq-cert.js built successfully!');

if (isWatch) {
  await ctx.watch();
  console.log('👀 Watching for engine changes...');
} else {
  await ctx.dispose();
}
