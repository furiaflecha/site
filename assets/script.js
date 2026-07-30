// Fúria Flecha — interações do site e checkout hospedado pela InfinitePay

document.addEventListener('DOMContentLoaded', () => {

  // Menu mobile
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Filtro do calendário (Todos / Casa / Fora)
  const tabs = document.querySelectorAll('.filter-tabs button');
  const cards = document.querySelectorAll('.match-card');
  if (tabs.length && cards.length) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.filter;
        cards.forEach(card => {
          const show = filter === 'todos' || card.dataset.local === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }

  // Loja: carrinho compartilhado entre os produtos
  const cartItemsEl = document.querySelector('#cart-items');
  const cartTotalEl = document.querySelector('#cart-total-value');
  const checkoutBtn = document.querySelector('#btn-checkout');
  const checkoutMessage = document.querySelector('#checkout-message');
  const cartFab = document.querySelector('#cart-fab');
  const cartFabBadge = document.querySelector('#cart-fab-badge');
  const cart = new Map();
  let checkoutAttemptId = null;

  if (cartFab && checkoutBtn) {
    cartFab.addEventListener('click', () => {
      checkoutBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (cartItemsEl) {
    cartItemsEl.addEventListener('click', (e) => {
      const minus = e.target.closest('[data-cart-qty-minus]');
      const plus = e.target.closest('[data-cart-qty-plus]');
      if (minus) changeCartQty(minus.dataset.key, -1);
      else if (plus) changeCartQty(plus.dataset.key, 1);
    });
  }

  function formatBRL(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function renderCart() {
    let totalQty = 0;
    cart.forEach(item => totalQty += item.qty);
    if (cartFab) cartFab.hidden = totalQty === 0;
    if (cartFabBadge) cartFabBadge.textContent = totalQty;

    if (!cartItemsEl || !cartTotalEl) return;

    if (cart.size === 0) {
      cartItemsEl.innerHTML = '<p class="cart-empty">Seu carrinho está vazio. Adicione uma camisa acima.</p>';
      cartTotalEl.textContent = formatBRL(0);
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    let total = 0;
    cartItemsEl.innerHTML = '';
    cart.forEach((item, key) => {
      const subtotal = item.price * item.qty;
      total += subtotal;
      const line = document.createElement('div');
      line.className = 'cart-line';
      line.innerHTML =
        '<div><div class="cart-line-name">' + item.name + '</div>' +
        '<div class="cart-line-meta">Tamanho ' + item.size + ' · Qtd. ' +
        '<span class="cart-line-qty">' +
        '<button type="button" data-cart-qty-minus data-key="' + key + '" aria-label="Diminuir quantidade de ' + item.name + '">−</button>' +
        '<span>' + item.qty + '</span>' +
        '<button type="button" data-cart-qty-plus data-key="' + key + '" aria-label="Aumentar quantidade de ' + item.name + '">+</button>' +
        '</span></div></div>' +
        '<div class="cart-line-price">' + formatBRL(subtotal) + '</div>';
      cartItemsEl.appendChild(line);
    });
    cartTotalEl.textContent = formatBRL(total);
    if (checkoutBtn) checkoutBtn.disabled = false;
  }

  function addItemToCart(productId, name, price, size, qty) {
    checkoutAttemptId = null;
    const key = productId + '-' + size;
    const existing = cart.get(key);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.set(key, { productId, name, price, size, qty });
    }
    renderCart();
  }

  function changeCartQty(key, delta) {
    const item = cart.get(key);
    if (!item) return;
    const nextQty = item.qty + delta;
    if (nextQty <= 0) {
      cart.delete(key);
    } else {
      item.qty = Math.min(10, nextQty);
    }
    checkoutAttemptId = null;
    renderCart();
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      if (cart.size === 0) return;
      checkoutBtn.textContent = 'Abrindo checkout…';
      checkoutBtn.disabled = true;
      if (checkoutMessage) checkoutMessage.textContent = '';

      try {
        checkoutAttemptId ||= crypto.randomUUID();
        const response = await fetch('/.netlify/functions/create-order', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            attempt_id: checkoutAttemptId,
            items: Array.from(cart.values(), item => ({
              productId: item.productId,
              size: item.size,
              quantity: item.qty
            }))
          })
        });
        const result = await response.json().catch(() => ({
          error: response.status === 429
            ? 'Muitas tentativas. Aguarde um minuto e tente novamente.'
            : 'O serviço de checkout respondeu de forma inesperada.'
        }));
        if (!response.ok || !result.checkout_url) {
          throw new Error(result.error || 'Não foi possível iniciar o pagamento.');
        }
        window.location.assign(result.checkout_url);
      } catch (error) {
        checkoutAttemptId = null;
        checkoutBtn.textContent = 'Finalizar Compra';
        checkoutBtn.disabled = false;
        if (checkoutMessage) checkoutMessage.textContent = error.message;
      }
    });
  }

  // Loja: cada .product-card (pode haver mais de um produto na página) tem
  // seu próprio seletor de tamanho, galeria, quantidade e botão de carrinho
  document.querySelectorAll('.product-card').forEach(card => {

    const sizeBtns = card.querySelectorAll('.size-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const mainImage = card.querySelector('.product-main-image');
    const thumbs = card.querySelectorAll('.thumb');
    if (mainImage && thumbs.length) {
      thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
          thumbs.forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
          mainImage.src = thumb.dataset.image;
          mainImage.alt = thumb.dataset.alt;
        });
      });
    }

    const qtyValue = card.querySelector('[data-qty-value]');
    const minus = card.querySelector('[data-qty-minus]');
    const plus = card.querySelector('[data-qty-plus]');
    if (qtyValue && minus && plus) {
      let qty = parseInt(qtyValue.textContent, 10) || 1;
      minus.addEventListener('click', () => {
        qty = Math.max(1, qty - 1);
        qtyValue.textContent = qty;
      });
      plus.addEventListener('click', () => {
        qty = Math.min(10, qty + 1);
        qtyValue.textContent = qty;
      });
    }

    const addToCart = card.querySelector('[data-add-to-cart]');
    if (addToCart) {
      addToCart.addEventListener('click', () => {
        const activeSize = card.querySelector('.size-btn.active');
        addItemToCart(
          card.dataset.productId,
          card.dataset.productName,
          parseFloat(card.dataset.productPrice),
          activeSize ? activeSize.textContent : '—',
          qtyValue ? parseInt(qtyValue.textContent, 10) || 1 : 1
        );

        addToCart.textContent = 'Adicionado ✓';
        addToCart.disabled = true;
        setTimeout(() => {
          addToCart.textContent = 'Adicionar ao Carrinho';
          addToCart.disabled = false;
        }, 1800);
      });
    }
  });
});
