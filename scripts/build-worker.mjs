import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('dist/worker');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('🔨 Building Cloudflare Worker (worker/index.ts)...');

await esbuild.build({
  entryPoints: ['worker/index.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['worker', 'browser'],
  outfile: 'dist/worker/index.js',
  minify: true,
  sourcemap: true,
  logLevel: 'info',
});

console.log('✅ Worker built successfully in dist/worker/index.js!');
