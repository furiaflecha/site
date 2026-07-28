import { json, methodNotAllowed } from './lib/http.mjs';
import { getOrder } from './lib/orders.mjs';

export default async (request) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const orderNsu = new URL(request.url).searchParams.get('order_nsu');
  const order = await getOrder(orderNsu);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404);
  return json({
    order_nsu: order.order_nsu,
    status: order.status,
    total: order.total,
    items: order.items.map(({ productId, size, quantity }) => ({
      productId,
      size,
      quantity
    })),
    receipt_url: order.receipt_url,
    updated_at: order.updated_at
  });
};
