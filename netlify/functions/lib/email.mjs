const RESEND_API_URL = 'https://api.resend.com/emails';

function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderItemsHtml(items) {
  return items
    .map((item) => `<li>${item.quantity}x ${item.description} — ${formatBRL(item.price * item.quantity)}</li>`)
    .join('');
}

function renderItemsText(items) {
  return items
    .map((item) => `- ${item.quantity}x ${item.description} — ${formatBRL(item.price * item.quantity)}`)
    .join('\n');
}

function parseRecipients(value) {
  return String(value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

// Best-effort: nunca lança erro. Uma falha no envio de e-mail não pode derrubar a confirmação do pagamento.
export async function sendOrderPaidEmail(order) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = parseRecipients(process.env.ORDER_NOTIFICATION_EMAIL);
  const from = process.env.ORDER_NOTIFICATION_FROM;
  if (!apiKey || to.length === 0 || !from) {
    console.warn('sendOrderPaidEmail: variáveis de notificação ausentes, envio pulado.');
    return;
  }

  const subject = `Novo pedido pago — ${order.order_nsu}`;
  const html = `
    <h2>Pedido pago</h2>
    <p><strong>Pedido:</strong> ${order.order_nsu}</p>
    <p><strong>Total:</strong> ${formatBRL(order.total)}</p>
    <ul>${renderItemsHtml(order.items)}</ul>
    <p><strong>Transação:</strong> ${order.transaction_nsu || '-'}</p>
    <p><strong>Parcelas:</strong> ${order.installments ?? '-'}</p>
    <p><strong>Forma de captura:</strong> ${order.capture_method || '-'}</p>
    <p><strong>Pago em:</strong> ${order.paid_at || '-'}</p>
    ${order.receipt_url ? `<p><a href="${order.receipt_url}">Ver comprovante</a></p>` : ''}
  `.trim();
  const text = [
    'Pedido pago',
    `Pedido: ${order.order_nsu}`,
    `Total: ${formatBRL(order.total)}`,
    renderItemsText(order.items),
    `Transação: ${order.transaction_nsu || '-'}`,
    `Parcelas: ${order.installments ?? '-'}`,
    `Forma de captura: ${order.capture_method || '-'}`,
    `Pago em: ${order.paid_at || '-'}`,
    order.receipt_url ? `Comprovante: ${order.receipt_url}` : ''
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ from, to, subject, html, text }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`sendOrderPaidEmail: Resend respondeu HTTP ${response.status}. ${detail}`);
    }
  } catch (error) {
    console.error('sendOrderPaidEmail:', error.message);
  }
}
