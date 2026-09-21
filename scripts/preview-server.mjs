import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8787;
const ROOT = path.resolve('.');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;

  // Legacy ?d=<token> → 301 to /cert/iq/v/<token>
  const queryToken = url.searchParams.get('d');
  if (queryToken && !pathname.match(/\/(?:v|verify)\/[^/?#]+/)) {
    res.writeHead(301, { Location: `/cert/iq/v/${queryToken}` });
    res.end();
    return;
  }

  // SPA: /cert/iq/v, /cert/iq/v/<token>, /cert/iq/verify/<token>
  if (pathname.startsWith('/cert/iq/v') || pathname.startsWith('/cert/iq/verify')) {
    const filePath = path.join(ROOT, 'dist/verify/index.html');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Strip /cert/iq prefix for assets if present
  let cleanPathname = pathname;
  if (cleanPathname === '/cert/iq' || cleanPathname === '/cert/iq/') {
    cleanPathname = '/';
  } else if (cleanPathname.startsWith('/cert/iq/')) {
    cleanPathname = cleanPathname.slice('/cert/iq'.length) || '/';
  }

  // Route: /cert/iq-cert.js or /iq-cert.js
  if (cleanPathname === '/iq-cert.js' || pathname.endsWith('/iq-cert.js')) {
    cleanPathname = '/dist/iq-cert.js';
  }

  // Default redirect root to test-harness.html
  if (cleanPathname === '/' || cleanPathname === '/index.html') {
    // Only for bare /cert/iq/ — SPA already handled above for /v
    if (!pathname.startsWith('/cert/iq/v') && !pathname.startsWith('/cert/iq/verify')) {
      cleanPathname = '/test-harness.html';
    } else {
      cleanPathname = '/index.html';
    }
  }

  // Prefer dist/verify for SPA assets (styles.css, main.js, etc.)
  let filePath = path.join(ROOT, 'dist/verify', cleanPathname);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(ROOT, cleanPathname);
  }
  if ((!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) &&
      fs.existsSync(path.join(ROOT, 'dist/verify', cleanPathname))) {
    filePath = path.join(ROOT, 'dist/verify', cleanPathname);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Not found: ${pathname}`);
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Preview Server running at: http://localhost:${PORT}/test-harness.html`);
  console.log(`📜 Verification Page at: http://localhost:${PORT}/cert/iq/v/<token>`);
});
