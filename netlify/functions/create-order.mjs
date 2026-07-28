import { randomBytes, randomUUID } from 'node:crypto';
import { normalizeItems, orderTotal } from './lib/catalog.mjs';
import { json, methodNotAllowed, readJson } from './lib/http.mjs';
import { getOrder, saveOrder, patchOrder } from './lib/orders.mjs';
import { createPaymentLink } from './lib/infinitepay.mjs';
import { rejectCrossSite, sha256 } from './lib/security.mjs';
import { getAttemptOrder, saveAttempt, validAttemptId } from './lib/claims.mjs';

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
  if (rejectCrossSite(request)) return json({ error: 'Origem não autorizada.' }, 403);

  let items;
  let attemptId;
  try {
    const body = await readJson(request, 8_192);
    items = normalizeItems(body.items);
    attemptId = body.attempt_id;
    if (!validAttemptId(attemptId)) throw new Error('Identificador da tentativa inválido.');
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const previousOrderNsu = await getAttemptOrder(attemptId);
  if (previousOrderNsu) {
    const previous = await getOrder(previousOrderNsu);
    if (previous?.checkout_url) {
      return json({ order_nsu: previous.order_nsu, checkout_url: previous.checkout_url });
    }
    return json({ error: 'Esta tentativa já está sendo processada. Aguarde e tente novamente.' }, 409);
  }

  const now = new Date().toISOString();
  const webhookToken = randomBytes(32).toString('base64url');
  const order = {
    order_nsu: randomUUID(),
    status: 'pendente',
    items,
    total: orderTotal(items),
    transaction_nsu: null,
    receipt_url: null,
    webhook_token_hash: sha256(webhookToken),
    created_at: now,
    updated_at: now
  };

  try {
    // O pedido existe antes de qualquer chamada à InfinitePay.
    await saveOrder(order);
    await saveAttempt(attemptId, order.order_nsu);
    const baseUrl = publicUrl(context);
    const checkoutUrl = await createPaymentLink({
      order,
      redirectUrl: `${baseUrl}/obrigado.html`,
      webhookUrl: `${baseUrl}/.netlify/functions/webhook?token=${encodeURIComponent(webhookToken)}`
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

export const config = {
  rateLimit: {
    windowLimit: 12,
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};
