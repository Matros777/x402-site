import { onRequest as walletHandler } from './functions/api/wallet.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // /api/wallet -> наша логика Wallet Intelligence (ключ Alchemy в env)
    if (url.pathname.startsWith('/api/wallet')) {
      return walletHandler({ request, env, ctx });
    }

    // Всё остальное -> статика как раньше (ASSETS)
    return env.ASSETS.fetch(request);
  }
};
