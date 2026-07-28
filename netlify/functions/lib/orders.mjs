import { getStore } from '@netlify/blobs';

function store() {
  return getStore({ name: 'orders', consistency: 'strong' });
}

export async function getOrder(orderNsu) {
  if (!orderNsu) return null;
  return store().get(String(orderNsu), { type: 'json' });
}

export async function saveOrder(order) {
  await store().setJSON(order.order_nsu, order);
  return order;
}

export async function patchOrder(orderNsu, changes) {
  const current = await getOrder(orderNsu);
  if (!current) return null;
  const updated = {
    ...current,
    ...changes,
    updated_at: new Date().toISOString()
  };
  await saveOrder(updated);
  return updated;
}
