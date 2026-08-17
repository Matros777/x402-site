import { onRequest as walletHandler } from './functions/api/wallet.js';

// ==== Серверное переключение OG / Twitter мета-тегов по языку ====
// default (без ?lang или ?lang=ru) -> русские og (как в HTML)
// ?lang=en -> английские og (для карточек в соцсетях / скрейперов)

// Английские og-теги по страницам. Ключ - pathname (с / )
const EN_META = {
  '/': {
    title: 'x402 — payments for AI agents | One HTTP request',
    description: 'x402 protocol: AI agents pay for APIs in a single HTTP request. Install the x402 wallet and launch an agent. Minimal, no fluff.',
  },
  '/generator': {
    title: 'x402 Agent Generator — turn any Python into a paid AI agent',
    description: 'Paste any Python logic, set a price in USDC, and get a ready x402 payment server. AI agents pay you automatically — in one HTTP request.',
  },
  '/tester': {
    title: 'x402 Tester — test agent payments for AI agents',
    description: 'Test your x402 agent live: fire requests, watch 402 + payment flow, verify USDC settlement onchain.',
  },
  '/wallet-intelligence': {
    title: 'Wallet Intelligence — Ethereum, Base, Arbitrum, Polygon analytics',
    description: 'Analyze blockchain wallets across Ethereum, Base, Arbitrum and Polygon: balances, activity and insights.',
  },
  '/blog/': {
    title: 'x402-wallet Blog — AI agents, crypto trading and payments via x402 protocol',
    description: 'Guides and news about AI agents, crypto trading and payments on the x402 protocol.',
  },
};

// Дефолтный EN fallback для любых других страниц
const DEFAULT_EN_TITLE = 'x402 — payments for AI agents | One HTTP request';
const DEFAULT_EN_DESC = 'x402 protocol: AI agents pay for APIs in a single HTTP request. Install the x402 wallet and launch an agent.';

function applyMeta(html, title, desc) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const te = esc(title), de = esc(desc);
  html = html.replace(/<title[^>]*>.*?<\/title>/is, `<title>${te}</title>`);
  html = html.replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${te}">`);
  html = html.replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${de}">`);
  html = html.replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${te}">`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${de}">`);
  return html;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/wallet')) {
      return walletHandler({ request, env, ctx });
    }

    const resp = await env.ASSETS.fetch(request);
    const lang = url.searchParams.get('lang');

    if (lang === 'en' && request.method === 'GET') {
      const ctype = resp.headers.get('content-type') || '';
      if (ctype.includes('text/html')) {
        let html = await resp.text();
        const norm = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
        const en = EN_META[url.pathname] || EN_META[norm];
        const title = en ? en.title : DEFAULT_EN_TITLE;
        const desc = en ? en.description : DEFAULT_EN_DESC;
        html = applyMeta(html, title, desc);
        return new Response(html, {
          status: resp.status,
          headers: { 'content-type': ctype, 'cache-control': 'no-store' },
        });
      }
    }

    return resp;
  }
};