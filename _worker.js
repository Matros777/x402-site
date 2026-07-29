export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/chat')) {
      const target = 'https://91.149.187.50.nip.io:444' + url.pathname;
      return fetch(target, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }
    return env.ASSETS.fetch(request);
  }
}
