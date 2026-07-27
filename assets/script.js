// Fúria Flecha — interações do protótipo (sem backend real)

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

  // Seletor de tamanho (loja)
  const sizeBtns = document.querySelectorAll('.size-btn');
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Contador de quantidade (loja)
  const qtyValue = document.querySelector('[data-qty-value]');
  const minus = document.querySelector('[data-qty-minus]');
  const plus = document.querySelector('[data-qty-plus]');
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

  // Botão "Adicionar ao carrinho" — protótipo, sem checkout real
  const addToCart = document.querySelector('[data-add-to-cart]');
  if (addToCart) {
    addToCart.addEventListener('click', () => {
      addToCart.textContent = 'Adicionado ✓';
      addToCart.disabled = true;
      setTimeout(() => {
        addToCart.textContent = 'Adicionar ao Carrinho';
        addToCart.disabled = false;
      }, 1800);
    });
  }
});
