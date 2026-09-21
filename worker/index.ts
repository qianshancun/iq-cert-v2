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
 * Rewrite /cert/iq/... → /... so Cloudflare Assets can serve dist/verify files.
 * Keep /v/<token> and /verify/<token> as SPA entry (index.html).
 */
function toAssetPath(pathname: string): string {
  let assetPath = pathname;
  if (assetPath === '/cert/iq' || assetPath === '/cert/iq/') {
    return '/';
  }
  if (assetPath.startsWith('/cert/iq/')) {
    assetPath = assetPath.slice('/cert/iq'.length);
  }

  // Path-token routes are SPA pages — always serve index.html
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

    // 2. Serve runtime engine with CORS
    if (path.endsWith('/iq-cert.js') || path.endsWith('/iq-cert.v2.js')) {
      const assetResponse = await env.ASSETS.fetch(new Request(new URL('/iq-cert.js', url.origin)));
      if (assetResponse.status === 200) {
        const headers = new Headers(assetResponse.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
        headers.set('Content-Type', 'application/javascript; charset=utf-8');
        return new Response(assetResponse.body, { status: 200, headers });
      }
    }

    // 3. Legacy ?d=<token> → permanent redirect to SEO path /cert/iq/v/<token>
    const queryToken = url.searchParams.get('d');
    if (queryToken && !path.match(/\/(?:v|verify)\/[^/?#]+/)) {
      const seoUrl = new URL(url.origin);
      seoUrl.pathname = `/cert/iq/v/${queryToken}`;
      return Response.redirect(seoUrl.toString(), 301);
    }

    // 4. Extract token from path (or remaining query) for bot OG / human SPA
    const token = extractTokenFromLocation(path, url.searchParams);

    if (token && isBot(request.headers.get('User-Agent'))) {
      const { payload } = await decodeCertificateToken(token);
      if (payload) {
        const isZh = payload.l === 'cn' || payload.l === 'zh-CN';
        const archetype = getArchetype(payload.s);
        const title = isZh ? archetype.titleCn : archetype.titleEn;
        const pageTitle = isZh
          ? `${payload.n} 的 AREALME 智商官方认证：${payload.s} 分`
          : `${payload.n}'s Official AREALME IQ Certificate: ${payload.s}`;
        const pageDesc = isZh
          ? `官方核定智商 ${payload.s} 分（${title} · ${archetype.percentile.replace('Top ', '全球前 ')}）。查看 7 维高阶认知报告与真伪存证。`
          : `Verified IQ Score of ${payload.s} (${title} · ${archetype.percentile} Worldwide). Inspect the 7-dimension cognitive breakdown and official credentials.`;

        const canonical = `${url.origin}/cert/iq/v/${token}`;
        const html = `<!DOCTYPE html>
<html lang="${isZh ? 'zh-CN' : 'en'}">
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
</body>
</html>`;
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=600',
          },
        });
      }
    }

    // 5. Forward to static assets (SPA)
    const assetUrl = new URL(request.url);
    assetUrl.pathname = toAssetPath(path);
    assetUrl.search = '';
    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};
