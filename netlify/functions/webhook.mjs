import { json, methodNotAllowed, readJson } from './lib/http.mjs';
import { getOrder, patchOrder } from './lib/orders.mjs';

export default async (request) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    return json({ success: false, message: error.message }, 400);
  }

  const order = await getOrder(payload.order_nsu);
  if (!order) return json({ success: false, message: 'Pedido não encontrado' }, 400);

  if (!Number.isInteger(payload.amount) || payload.amount !== order.total) {
    return json({ success: false, message: 'Valor do pedido divergente' }, 400);
  }
  if (!payload.transaction_nsu) {
    return json({ success: false, message: 'Transação não informada' }, 400);
  }

  if (order.status !== 'pago') {
    await patchOrder(order.order_nsu, {
      status: 'pago',
      transaction_nsu: String(payload.transaction_nsu),
      invoice_slug: payload.invoice_slug || null,
      receipt_url: payload.receipt_url || null,
      paid_amount: payload.paid_amount,
      installments: payload.installments,
      capture_method: payload.capture_method,
      paid_at: new Date().toISOString()
    });
  }

  return json({ success: true, message: null });
};
