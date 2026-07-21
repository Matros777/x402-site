export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Если запрос к API чата
    if (url.pathname === "/api/chat") {
      return new Response(JSON.stringify({ error: "API not implemented yet" }), {
        status: 501,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Возвращаем статику (будет обработана assets)
    return new Response("Not Found", { status: 404 });
  }
};
