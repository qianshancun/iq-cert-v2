import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const isWatch = process.argv.includes('--watch');
const verifyDist = path.resolve('dist/verify');

if (!fs.existsSync(verifyDist)) {
  fs.mkdirSync(verifyDist, { recursive: true });
}

console.log('🔨 Building Verification Web Application...');

// 1. Copy index.html and styles.css (asset paths use <base href="/cert/iq/">)
let html = fs.readFileSync('src/verify/index.html', 'utf8');
fs.writeFileSync(path.join(verifyDist, 'index.html'), html, 'utf8');
fs.copyFileSync('src/verify/styles.css', path.join(verifyDist, 'styles.css'));

// 2. Bundle main.ts
const ctx = await esbuild.context({
  entryPoints: ['src/verify/main.ts'],
  bundle: true,
  format: 'esm',
  target: ['es2020'],
  outfile: path.join(verifyDist, 'main.js'),
  minify: !isWatch,
  sourcemap: true,
  logLevel: 'info',
});

await ctx.rebuild();
console.log('✅ Verification SPA built successfully!');

if (isWatch) {
  await ctx.watch();
  console.log('👀 Watching for verify SPA changes...');
} else {
  await ctx.dispose();
}
