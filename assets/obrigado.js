document.addEventListener('DOMContentLoaded', async () => {
  const resultEl = document.querySelector('#payment-result');
  const params = new URLSearchParams(window.location.search);
  const orderNsu = params.get('order_nsu');
  const transactionNsu = params.get('transaction_nsu');
  const slug = params.get('slug');
  const redirectReceipt = safeReceiptUrl(params.get('receipt_url'));

  function safeReceiptUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch (_) {
      return null;
    }
  }

  function render(status, receiptUrl) {
    resultEl.textContent = '';
    const title = document.createElement('h2');
    const message = document.createElement('p');

    if (status === 'pago') {
      title.textContent = 'Pagamento confirmado!';
      message.textContent = 'Seu pedido foi pago e registrado com segurança.';
    } else {
      title.textContent = 'Pagamento em confirmação';
      message.textContent = 'Ainda não recebemos a confirmação definitiva. Você pode atualizar esta página em alguns instantes.';
    }
    resultEl.append(title, message);

    const receipt = safeReceiptUrl(receiptUrl) || redirectReceipt;
    if (status === 'pago' && receipt) {
      const link = document.createElement('a');
      link.className = 'btn btn-primary';
      link.href = receipt;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Ver comprovante';
      resultEl.appendChild(link);
    }
    const back = document.createElement('a');
    back.className = 'btn btn-outline-light';
    back.href = 'comprar.html';
    back.textContent = 'Voltar à loja';
    resultEl.appendChild(back);
  }

  if (!orderNsu) {
    render('pendente', null);
    return;
  }

  try {
    // O redirect é apenas um gatilho de UX; a API da InfinitePay decide se foi pago.
    if (transactionNsu && slug) {
      await fetch('/.netlify/functions/payment-check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          order_nsu: orderNsu,
          transaction_nsu: transactionNsu,
          slug
        })
      });
    }

    const response = await fetch(`/.netlify/functions/order-status?order_nsu=${encodeURIComponent(orderNsu)}`);
    const order = await response.json();
    if (!response.ok) throw new Error(order.error);
    render(order.status, order.receipt_url);
  } catch (_) {
    render('pendente', null);
  }
});
