export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api', '');
  const target = `https://91.149.187.50.nip.io:444${path}${url.search}`;

  const newReq = new Request(target, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body
  });

  return fetch(newReq);
}
