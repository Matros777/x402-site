export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Если запрос к блогу — отдаём из папки blog
    if (path.startsWith('/blog/')) {
      const filePath = path.replace('/blog/', '');
      const file = await env.ASSETS.get('blog/' + filePath);
      if (file) return file;
      return new Response('Not found', { status: 404 });
    }

    // Если запрос к корню — отдаём index.html
    if (path === '/' || path === '') {
      const file = await env.ASSETS.get('index.html');
      if (file) return file;
    }

    // Остальная статика
    const file = await env.ASSETS.get(path);
    if (file) return file;
    return new Response('Not found', { status: 404 });
  }
};
