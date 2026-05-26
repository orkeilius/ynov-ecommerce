const request = require('supertest');

// Mock the db module — no real SQLite, no file I/O
jest.mock('../../../src/db', () => ({
  prepare:     jest.fn(),
  exec:        jest.fn(),
  transaction: jest.fn(),
}));

const app = require('../../../src/app');
const db  = require('../../../src/db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a mock better-sqlite3 statement object. */
function stmt(overrides = {}) {
  return { all: jest.fn(), get: jest.fn(), run: jest.fn(), ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: FEATURE_V2_PRODUCTS is off
  delete process.env.FEATURE_V2_PRODUCTS;
});

// ─── GET /api/products ────────────────────────────────────────────────────────

describe('GET /api/products', () => {
  test('returns all products from the db', async () => {
    const rows = [
      { id: 1, name: 'Laptop', price: 999.99, stock: 5, category: 'electronics' },
      { id: 2, name: 'Mouse',  price:  29.99, stock: 20, category: 'electronics' },
    ];
    db.prepare.mockReturnValue(stmt({ all: jest.fn().mockReturnValue(rows) }));

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM products');
  });

  test('passes category to the query when ?category is provided', async () => {
    const rows = [{ id: 1, name: 'Laptop', price: 999.99, stock: 5, category: 'electronics' }];
    db.prepare.mockReturnValue(stmt({ all: jest.fn().mockReturnValue(rows) }));

    const res = await request(app).get('/api/products?category=electronics');

    expect(res.status).toBe(200);
    expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM products WHERE category = ?');
  });

  test('returns an empty array when the db returns no rows', async () => {
    db.prepare.mockReturnValue(stmt({ all: jest.fn().mockReturnValue([]) }));

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────

describe('GET /api/products/:id', () => {
  test('returns the product when found', async () => {
    const product = { id: 3, name: 'Keyboard', price: 149.99, stock: 10, category: 'electronics' };
    db.prepare.mockReturnValue(stmt({ get: jest.fn().mockReturnValue(product) }));

    const res = await request(app).get('/api/products/3');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(product);
  });

  test('returns 404 when the product does not exist', async () => {
    db.prepare.mockReturnValue(stmt({ get: jest.fn().mockReturnValue(undefined) }));

    const res = await request(app).get('/api/products/9999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Product not found');
  });

  test('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/products/abc');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    // db should never be queried for an invalid id
    expect(db.prepare).not.toHaveBeenCalled();
  });
});

// ─── POST /api/products ───────────────────────────────────────────────────────

describe('POST /api/products', () => {
  const newProduct = { id: 10, name: 'USB-C Hub', price: 59.99, stock: 60, category: 'electronics' };

  test('creates a product and returns 201 with the new product', async () => {
    db.prepare
      .mockReturnValueOnce(stmt({ run: jest.fn().mockReturnValue({ lastInsertRowid: 10 }) }))
      .mockReturnValueOnce(stmt({ get: jest.fn().mockReturnValue(newProduct) }));

    const res = await request(app)
      .post('/api/products')
      .send({ name: 'USB-C Hub', price: 59.99, stock: 60, category: 'electronics' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newProduct);
  });

  test('defaults stock to 0 and category to "misc" when omitted', async () => {
    const insertRun = jest.fn().mockReturnValue({ lastInsertRowid: 11 });
    db.prepare
      .mockReturnValueOnce(stmt({ run: insertRun }))
      .mockReturnValueOnce(stmt({ get: jest.fn().mockReturnValue({ id: 11, name: 'Thing', price: 5, stock: 0, category: 'misc' }) }));

    await request(app).post('/api/products').send({ name: 'Thing', price: 5 });

    // 3rd and 4th args of the INSERT are stock=0 and category='misc'
    expect(insertRun).toHaveBeenCalledWith('Thing', 5, 0, 'misc');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/products').send({ price: 9.99 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(db.prepare).not.toHaveBeenCalled();
  });

  test('returns 400 when price is missing', async () => {
    const res = await request(app).post('/api/products').send({ name: 'Gadget' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(db.prepare).not.toHaveBeenCalled();
  });
});
