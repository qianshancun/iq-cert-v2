import { extractTokenFromLocation } from '../src/shared/constants';
import { decodeCertificateToken } from '../src/shared/token';
import { getArchetype } from '../src/engine/renderers/common';

export interface Env {
  ASSETS: Fetcher;
  ENV?: string;
  APP_BASE_URL?: string;
}

const BOT_USER_AGENTS = [
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'slackbot',
  'baiduspider',
  'googlebot',
  'bingbot',
];

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const lower = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((bot) => lower.includes(bot));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Rewrite /iq/cert/... or /cert/iq/... → /... so Cloudflare Assets can serve dist/verify files.
 * Keep /v/<token> and /verify/<token> as SPA entry (index.html).
 */
function toAssetPath(pathname: string): string {
  let assetPath = pathname;
  if (
    assetPath === '/iq/cert' ||
    assetPath === '/iq/cert/' ||
    assetPath === '/cert/iq' ||
    assetPath === '/cert/iq/'
  ) {
    return '/';
  }

  if (assetPath.startsWith('/iq/cert/')) {
    assetPath = assetPath.slice('/iq/cert'.length);
  } else if (assetPath.startsWith('/cert/iq/')) {
    assetPath = assetPath.slice('/cert/iq'.length);
  }

  // Path-token routes are SPA pages — always serve root index.html
  if (/^\/(?:v|verify)(?:\/|$)/.test(assetPath)) {
    return '/';
  }
  return assetPath || '/';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // 2. Legacy /cert/iq/... → 301 permanent redirect to new canonical /iq/cert/...
    if (path.startsWith('/cert/iq')) {
      const canonicalUrl = new URL(request.url);
      canonicalUrl.pathname = path.replace('/cert/iq', '/iq/cert');
      return Response.redirect(canonicalUrl.toString(), 301);
    }

    // 3. Serve runtime engine with CORS
    if (path.includes('iq-cert') && path.endsWith('.js')) {
      const targetJs = path.endsWith('/iq-cert.js') || path.endsWith('/iq-cert.v2.js') ? '/iq-cert.js' : toAssetPath(path);
      const assetResponse = await env.ASSETS.fetch(new Request(new URL(targetJs, url.origin)));
      if (assetResponse.status === 200) {
        const headers = new Headers(assetResponse.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
        headers.set('Content-Type', 'application/javascript; charset=utf-8');
        return new Response(assetResponse.body, { status: 200, headers });
      }
    }

    // 4. Legacy ?d=<token> → permanent redirect to SEO path /iq/cert/v/<token>
    const queryToken = url.searchParams.get('d');
    if (queryToken && !path.match(/\/(?:v|verify)\/[^/?#]+/)) {
      const seoUrl = new URL(url.origin);
      seoUrl.pathname = `/iq/cert/v/${queryToken}`;
      return Response.redirect(seoUrl.toString(), 301);
    }

    // 5. Extract token from path for bot OG / human SPA
    const token = extractTokenFromLocation(path, url.searchParams);

    if (token && isBot(request.headers.get('User-Agent'))) {
      const { payload } = await decodeCertificateToken(token);
      if (payload) {
        const archetype = getArchetype(payload.s);
        const title = archetype.titleEn;
        const pageTitle = `${payload.n}'s Official AREALME IQ Certificate: ${payload.s}`;
        const pageDesc = `Verified IQ Score of ${payload.s} (${title} · ${archetype.percentile} Worldwide). Inspect the 7-dimension cognitive breakdown and official credentials.`;

        const cleanLang = (payload.l || 'en').trim().toLowerCase();
        const testUrl = !cleanLang || cleanLang === 'en'
          ? 'https://www.arealme.com/iq/'
          : `https://www.arealme.com/iq/${cleanLang}/`;

        const canonical = `${url.origin}/iq/cert/v/${token}`;
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ARealMe Psychometrics">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDesc)}">
</head>
<body>
  <h1>${escapeHtml(pageTitle)}</h1>
  <p>${escapeHtml(pageDesc)}</p>
  <p><a href="${escapeHtml(canonical)}">View Official Certificate Document</a></p>
  <p><a href="${escapeHtml(testUrl)}">Take the Official ARealMe IQ Test</a></p>
</body>
</html>`;
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        });
      }
    }

    // 6. Forward human requests to static assets
    const assetUrl = new URL(request.url);
    assetUrl.pathname = toAssetPath(path);
    let assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));

    // Prevent Cloudflare Assets from redirecting SPA / index requests out to arealme.com root
    if (assetResponse.status >= 300 && assetResponse.status < 400) {
      const loc = assetResponse.headers.get('location');
      if (loc === '/' || loc === assetUrl.origin + '/') {
        assetUrl.pathname = '/';
        assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));
      }
    }

    return assetResponse;
  },
};
