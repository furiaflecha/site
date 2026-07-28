import { getStore } from '@netlify/blobs';
import { sha256 } from './security.mjs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validAttemptId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export async function getAttemptOrder(attemptId) {
  return getStore({ name: 'checkout-attempts', consistency: 'strong' })
    .get(sha256(attemptId), { type: 'text' });
}

export async function saveAttempt(attemptId, orderNsu) {
  await getStore({ name: 'checkout-attempts', consistency: 'strong' })
    .set(sha256(attemptId), orderNsu);
}

export async function claimTransaction(transactionNsu, orderNsu) {
  const transactions = getStore({ name: 'payment-transactions', consistency: 'strong' });
  const key = sha256(transactionNsu);
  const existing = await transactions.get(key, { type: 'text' });
  if (existing && existing !== orderNsu) return false;
  if (!existing) await transactions.set(key, orderNsu);
  return true;
}
