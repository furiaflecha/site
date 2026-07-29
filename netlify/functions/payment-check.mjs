import { json, methodNotAllowed, readJson } from './lib/http.mjs';
import { getOrder, patchOrder } from './lib/orders.mjs';
import { checkPayment } from './lib/infinitepay.mjs';
import { rejectCrossSite } from './lib/security.mjs';
import { claimTransaction } from './lib/claims.mjs';
import { sendOrderPaidEmail } from './lib/email.mjs';

export default async (request, context) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  if (rejectCrossSite(request)) return json({ error: 'Origem não autorizada.' }, 403);

  let body;
  try {
    body = await readJson(request, 4_096);
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const orderNsu = String(body.order_nsu || '');
  const transactionNsu = String(body.transaction_nsu || '');
  const slug = String(body.slug || '');
  if (!orderNsu || !transactionNsu || !slug) {
    return json({ error: 'Dados da transação incompletos.' }, 400);
  }

  const order = await getOrder(orderNsu);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404);
  if (order.status === 'pago') return json({ paid: true, status: 'pago' });

  try {
    const result = await checkPayment({ orderNsu, transactionNsu, slug });
    const paid = result?.success === true && result?.paid === true;
    if (paid && result.amount !== order.total) {
      return json({ error: 'Valor confirmado diverge do pedido.' }, 409);
    }
    if (paid) {
      if (!await claimTransaction(transactionNsu, orderNsu)) {
        return json({ error: 'Transação já vinculada a outro pedido.' }, 409);
      }
      const updatedOrder = await patchOrder(orderNsu, {
        status: 'pago',
        transaction_nsu: transactionNsu,
        invoice_slug: slug,
        paid_amount: result.paid_amount,
        installments: result.installments,
        capture_method: result.capture_method,
        paid_at: new Date().toISOString()
      });
      await sendOrderPaidEmail(updatedOrder);
    }
    return json({ paid, status: paid ? 'pago' : order.status });
  } catch (error) {
    console.error('payment-check:', error.message);
    return json({ error: 'Não foi possível consultar o pagamento.' }, 502);
  }
};

export const config = {
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};
