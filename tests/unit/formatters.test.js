const { formatV2 } = require('../../src/utils/formatters');

// ─── formatV2 ────────────────────────────────────────────────────────────────

describe('formatV2', () => {
  const base = { id: 1, name: 'Laptop', price: 1299.99, stock: 12, category: 'electronics' };

  test('preserves all original product fields', () => {
    const result = formatV2(base);

    expect(result.id).toBe(base.id);
    expect(result.name).toBe(base.name);
    expect(result.price).toBe(base.price);
    expect(result.stock).toBe(base.stock);
    expect(result.category).toBe(base.category);
  });

  test('available is true when stock > 0', () => {
    expect(formatV2({ ...base, stock: 1 }).available).toBe(true);
    expect(formatV2({ ...base, stock: 99 }).available).toBe(true);
  });

  test('available is false when stock is 0', () => {
    expect(formatV2({ ...base, stock: 0 }).available).toBe(false);
  });

  test('priceFormatted uses euro symbol and 2 decimal places', () => {
    expect(formatV2({ ...base, price: 1299.99 }).priceFormatted).toBe('€1299.99');
    expect(formatV2({ ...base, price: 9.9 }).priceFormatted).toBe('€9.90');
    expect(formatV2({ ...base, price: 100 }).priceFormatted).toBe('€100.00');
  });

  test('does not mutate the original product object', () => {
    const product = { ...base };
    formatV2(product);

    expect(product).not.toHaveProperty('available');
    expect(product).not.toHaveProperty('priceFormatted');
  });
});
