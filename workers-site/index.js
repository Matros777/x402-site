export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Если запрос к API чата
    if (url.pathname === "/api/chat") {
      return new Response(JSON.stringify({error: "API not implemented yet"}), {
        status: 501,
        headers: {"Content-Type": "application/json"}
      });
    }
    
    // Для всего остального — статика (раздаётся через assets)
    return new Response("Static site via Worker with Assets", { status: 200 });
  }
};
