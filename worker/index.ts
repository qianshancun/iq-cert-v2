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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // 2. Serve Runtime Engine Script with CORS
    if (path.endsWith('/iq-cert.js') || path.endsWith('/iq-cert.v2.js')) {
      const assetResponse = await env.ASSETS.fetch(new Request(new URL('/iq-cert.js', url)));
      if (assetResponse.status === 200) {
        const headers = new Headers(assetResponse.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
        headers.set('Content-Type', 'application/javascript; charset=utf-8');
        return new Response(assetResponse.body, {
          status: 200,
          headers,
        });
      }
    }

    // 3. SSR Dynamic Open Graph Tags for Social Bots
    const token = url.searchParams.get('d');
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

        const html = `<!DOCTYPE html>
<html lang="${isZh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ARealMe Psychometrics">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDesc}">
  <meta property="og:url" content="${url.href}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDesc}">
</head>
<body>
  <h1>${pageTitle}</h1>
  <p>${pageDesc}</p>
  <p><a href="${url.href}">View Official Certificate Document</a></p>
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

    // 4. Default: Forward to static assets SPA
    let assetUrl = new URL(request.url);
    if (assetUrl.pathname.startsWith('/cert/iq/')) {
      assetUrl.pathname = assetUrl.pathname.replace('/cert/iq/', '/');
    } else if (assetUrl.pathname === '/cert/iq') {
      assetUrl.pathname = '/';
    }
    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};
