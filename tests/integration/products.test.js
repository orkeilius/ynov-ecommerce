const request = require('supertest');

// Must be set before any app/db module is required so the db uses :memory:
process.env.NODE_ENV = 'test';

const app = require('../../src/app');
const db  = require('../../src/db');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FIXTURES = [
  { name: 'Laptop Pro 15"', price: 1299.99, stock: 12, category: 'electronics' },
  { name: 'Wireless Mouse', price:    39.99, stock: 85, category: 'electronics' },
  { name: 'Standing Desk',  price:   499.99, stock:  8, category: 'furniture'   },
];

const insertProduct = db.prepare(
  'INSERT INTO products (name, price, stock, category) VALUES (@name, @price, @stock, @category)'
);

function seedProducts(products = FIXTURES) {
  for (const p of products) insertProduct.run(p);
}

function clearProducts() {
  db.prepare('DELETE FROM products').run();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/products', () => {
  afterEach(clearProducts);

  test('empty list — returns an empty array', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('list with data — returns all products', async () => {
    seedProducts();

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(FIXTURES.length);

    const names = res.body.map(p => p.name);
    expect(names).toContain('Laptop Pro 15"');
    expect(names).toContain('Wireless Mouse');
    expect(names).toContain('Standing Desk');
  });

  test('filter by category — returns only matching products', async () => {
    seedProducts();

    const res = await request(app).get('/api/products?category=electronics');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every(p => p.category === 'electronics')).toBe(true);
  });

  test('filter by unknown category — returns an empty array', async () => {
    seedProducts();

    const res = await request(app).get('/api/products?category=unknown');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/products/:id', () => {
  afterEach(clearProducts);

  test('non-existent product — returns 404', async () => {
    const res = await request(app).get('/api/products/9999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Product not found');
  });

  test('invalid id (non-numeric) — returns 400', async () => {
    const res = await request(app).get('/api/products/abc');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('existing product — returns the correct product', async () => {
    const { lastInsertRowid: id } = insertProduct.run(
      { name: 'USB-C Hub', price: 59.99, stock: 60, category: 'electronics' }
    );

    const res = await request(app).get(`/api/products/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, name: 'USB-C Hub', price: 59.99, category: 'electronics' });
  });
});
