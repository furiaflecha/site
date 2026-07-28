const DEFAULT_API_URL = 'https://api.checkout.infinitepay.io';

function config() {
  const handle = process.env.INFINITEPAY_HANDLE?.trim().replace(/^\$/, '');
  if (!handle) throw new Error('INFINITEPAY_HANDLE não configurado.');
  return {
    handle,
    apiUrl: (process.env.INFINITEPAY_API_URL || DEFAULT_API_URL).replace(/\/$/, '')
  };
}

async function post(path, body) {
  const { apiUrl } = config();
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.message || payload?.error || payload?.detail;
    const suffix = typeof detail === 'string' ? ` ${detail}` : '';
    const error = new Error(`InfinitePay respondeu com HTTP ${response.status}.${suffix}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function createPaymentLink({ order, redirectUrl, webhookUrl }) {
  const { handle } = config();
  const payload = await post('/links', {
    handle,
    redirect_url: redirectUrl,
    webhook_url: webhookUrl,
    order_nsu: order.order_nsu,
    items: order.items.map(({ quantity, price, description }) => ({
      quantity,
      price,
      description
    }))
  });
  if (!payload?.url) {
    throw new Error(`A InfinitePay não retornou a URL do checkout (campos: ${Object.keys(payload || {}).join(', ') || 'nenhum'}).`);
  }

  let checkoutUrl;
  try {
    checkoutUrl = new URL(payload.url);
  } catch (_) {
    throw new Error('A InfinitePay retornou uma URL de checkout malformada.');
  }

  const allowedHosts = new Set([
    'checkout.infinitepay.com.br',
    'checkout.infinitepay.io'
  ]);
  if (checkoutUrl.protocol !== 'https:' || !allowedHosts.has(checkoutUrl.hostname.toLowerCase())) {
    throw new Error(`A InfinitePay retornou um domínio de checkout inesperado: ${checkoutUrl.hostname}.`);
  }
  return checkoutUrl.href;
}

export async function checkPayment({ orderNsu, transactionNsu, slug }) {
  const { handle } = config();
  return post('/payment_check', {
    handle,
    order_nsu: orderNsu,
    transaction_nsu: transactionNsu,
    slug
  });
}
