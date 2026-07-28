export const PRODUCTS = Object.freeze({
  vaiflecha: Object.freeze({
    name: 'Camisa Vai Flecha! 2026',
    price: 4990
  }),
  torcida: Object.freeze({
    name: 'Camisa Torcida Fúria Flecha 2026',
    price: 9990
  })
});

const ALLOWED_SIZES = new Set(['P', 'M', 'G', 'GG']);

export function normalizeItems(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 8) {
    throw new Error('O pedido precisa ter entre 1 e 8 itens.');
  }

  return input.map((raw) => {
    const product = PRODUCTS[raw?.productId];
    const size = String(raw?.size || '').toUpperCase();
    const quantity = Number(raw?.quantity);

    if (!product) throw new Error('Produto inválido.');
    if (!ALLOWED_SIZES.has(size)) throw new Error('Tamanho inválido.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error('A quantidade deve estar entre 1 e 10.');
    }

    return {
      productId: raw.productId,
      description: `${product.name} — tamanho ${size}`,
      size,
      quantity,
      price: product.price
    };
  });
}

export function orderTotal(items) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
