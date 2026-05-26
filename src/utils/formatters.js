/**
 * Enriches a product object with computed display fields (V2 format).
 * @param {{ price: number, stock: number }} product
 * @returns {object}
 */
function formatV2(product) {
  return {
    ...product,
    available:      product.stock > 0,
    priceFormatted: `€${product.price.toFixed(2)}`,
  };
}

module.exports = { formatV2 };
