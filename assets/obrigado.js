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

  function whatsappUrl(items) {
    const modelNames = {
      vaiflecha: 'Vai Flecha! 2026',
      torcida: 'Torcida Fúria Flecha 2026'
    };
    const models = [...new Set((items || []).map(item => modelNames[item.productId]).filter(Boolean))];
    const modelText = models.length > 1
      ? models.slice(0, -1).join(', ') + ' e ' + models.at(-1)
      : (models[0] || 'da camisa');
    const message = models.length > 1
      ? `Olá, comprei os modelos ${modelText} da camisa da Fúria Flecha. Vamos combinar o frete?`
      : `Olá, comprei o modelo ${modelText} da camisa da Fúria Flecha. Vamos combinar o frete?`;
    return `https://wa.me/5511987484872?text=${encodeURIComponent(message)}`;
  }

  function render(status, receiptUrl, items = []) {
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
    if (status === 'pago') {
      const whatsapp = document.createElement('a');
      whatsapp.className = 'btn btn-primary';
      whatsapp.href = whatsappUrl(items);
      whatsapp.target = '_blank';
      whatsapp.rel = 'noopener noreferrer';
      whatsapp.textContent = 'Combinar frete pelo WhatsApp';
      resultEl.appendChild(whatsapp);
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
    render(order.status, order.receipt_url, order.items);
  } catch (_) {
    render('pendente', null);
  }
});
