export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function readJson(request, maxBytes = 16_384) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Envie o corpo como application/json.');
  }
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) throw new Error('Corpo da requisição muito grande.');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new Error('Corpo da requisição muito grande.');
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new Error('JSON inválido.');
  }
}

export function methodNotAllowed(allowed) {
  return new Response('Método não permitido', {
    status: 405,
    headers: { allow: allowed.join(', ') }
  });
}
