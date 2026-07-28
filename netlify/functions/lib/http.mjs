export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Envie o corpo como application/json.');
  }
  return request.json();
}

export function methodNotAllowed(allowed) {
  return new Response('Método não permitido', {
    status: 405,
    headers: { allow: allowed.join(', ') }
  });
}
