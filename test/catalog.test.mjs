import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeItems, orderTotal } from '../netlify/functions/lib/catalog.mjs';

test('calcula os preços atuais em centavos no servidor', () => {
  const items = normalizeItems([
    { productId: 'vaiflecha', size: 'M', quantity: 2 },
    { productId: 'torcida', size: 'GG', quantity: 1 }
  ]);
  assert.equal(items[0].price, 4990);
  assert.equal(items[1].price, 9990);
  assert.equal(orderTotal(items), 19970);
});

test('ignora preço enviado pelo navegador', () => {
  const [item] = normalizeItems([
    { productId: 'torcida', size: 'P', quantity: 1, price: 1 }
  ]);
  assert.equal(item.price, 9990);
});

test('rejeita produto, tamanho e quantidade inválidos', () => {
  assert.throws(() => normalizeItems([{ productId: 'x', size: 'M', quantity: 1 }]));
  assert.throws(() => normalizeItems([{ productId: 'torcida', size: 'X', quantity: 1 }]));
  assert.throws(() => normalizeItems([{ productId: 'torcida', size: 'M', quantity: 11 }]));
});
