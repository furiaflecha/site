import test from 'node:test';
import assert from 'node:assert/strict';
import { rejectCrossSite, secureEqualHash, sha256 } from '../netlify/functions/lib/security.mjs';
import { validAttemptId } from '../netlify/functions/lib/claims.mjs';

test('valida o segredo do webhook usando apenas o hash armazenado', () => {
  const hash = sha256('segredo-forte');
  assert.equal(secureEqualHash('segredo-forte', hash), true);
  assert.equal(secureEqualHash('segredo-errado', hash), false);
  assert.equal(secureEqualHash('', hash), false);
});

test('rejeita chamadas declaradas como cross-site', () => {
  const request = new Request('https://loja.example/f', {
    headers: { 'sec-fetch-site': 'cross-site' }
  });
  assert.equal(rejectCrossSite(request), true);
});

test('aceita somente UUID como chave idempotente', () => {
  assert.equal(validAttemptId('123e4567-e89b-42d3-a456-426614174000'), true);
  assert.equal(validAttemptId('../../../pedido'), false);
  assert.equal(validAttemptId('texto-livre'), false);
});
