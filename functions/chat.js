export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const target = 'https://91.149.187.50.nip.io:444' + url.pathname;
  return fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
}
