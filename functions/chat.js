export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  
  // Проксируем на наш сервер
  const target = 'https://91.149.187.50.nip.io:444' + url.pathname + url.search;
  
  // Копируем заголовки, убираем врапперовые
  const headers = new Headers(request.headers);
  headers.set('Host', '91.149.187.50.nip.io');
  
  const response = await fetch(target, {
    method: request.method,
    headers: headers,
    body: request.body,
  });
  
  return response;
}
