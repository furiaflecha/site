import { randomUUID } from 'node:crypto';
import { normalizeItems, orderTotal } from './lib/catalog.mjs';
import { json, methodNotAllowed, readJson } from './lib/http.mjs';
import { saveOrder, patchOrder } from './lib/orders.mjs';
import { createPaymentLink } from './lib/infinitepay.mjs';

function publicUrl(context) {
  const value = process.env.PUBLIC_SITE_URL || process.env.URL || context?.site?.url;
  if (!value) throw new Error('PUBLIC_SITE_URL não configurada.');
  const url = new URL(value);
  const isLocal = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLocal) {
    throw new Error('PUBLIC_SITE_URL precisa usar HTTPS.');
  }
  return url.origin;
}

export default async (request, context) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let items;
  try {
    const body = await readJson(request);
    items = normalizeItems(body.items);
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const now = new Date().toISOString();
  const order = {
    order_nsu: randomUUID(),
    status: 'pendente',
    items,
    total: orderTotal(items),
    transaction_nsu: null,
    receipt_url: null,
    created_at: now,
    updated_at: now
  };

  try {
    // O pedido existe antes de qualquer chamada à InfinitePay.
    await saveOrder(order);
    const baseUrl = publicUrl(context);
    const checkoutUrl = await createPaymentLink({
      order,
      redirectUrl: `${baseUrl}/obrigado.html`,
      webhookUrl: `${baseUrl}/.netlify/functions/webhook`
    });
    await patchOrder(order.order_nsu, { checkout_url: checkoutUrl });
    return json({ order_nsu: order.order_nsu, checkout_url: checkoutUrl }, 201);
  } catch (error) {
    await patchOrder(order.order_nsu, {
      status: 'erro',
      error: 'Não foi possível criar o checkout.'
    }).catch(() => {});
    console.error('create-order:', error.message);
    return json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' }, 502);
  }
};
