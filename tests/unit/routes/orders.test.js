const request = require('supertest');

jest.mock('../../../src/db', () => ({
  prepare:     jest.fn(),
  exec:        jest.fn(),
  transaction: jest.fn(),
}));

const app = require('../../../src/app');
const db  = require('../../../src/db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stmt(overrides = {}) {
  return { all: jest.fn(), get: jest.fn(), run: jest.fn(), ...overrides };
}

/**
 * Configures db.prepare to respond based on which SQL is passed.
 * Used for routes that issue multiple consecutive queries.
 */
function mockPrepareBy(map) {
  db.prepare.mockImplementation((sql) => {
    for (const [pattern, mockStmt] of Object.entries(map)) {
      if (sql.includes(pattern)) return mockStmt;
    }
    return stmt();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // transaction() just runs the function synchronously and returns a callable
  db.transaction.mockImplementation((fn) => () => fn());
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────

describe('GET /api/orders', () => {
  test('returns all orders, each with productIds', async () => {
    const orders = [
      { id: 1, userId: 1, total: 999.99, status: 'pending', createdAt: '2024-01-01' },
    ];
    mockPrepareBy({
      'SELECT * FROM orders':                       stmt({ all: jest.fn().mockReturnValue(orders) }),
      'SELECT productId FROM order_items WHERE orderId': stmt({ all: jest.fn().mockReturnValue([{ productId: 2 }, { productId: 3 }]) }),
    });

    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 1, status: 'pending' });
    expect(res.body[0].productIds).toEqual([2, 3]);
  });

  test('returns an empty array when no orders exist', async () => {
    db.prepare.mockReturnValue(stmt({ all: jest.fn().mockReturnValue([]) }));

    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────

describe('GET /api/orders/:id', () => {
  test('returns the order with its productIds', async () => {
    const order = { id: 2, userId: 1, total: 59.99, status: 'shipped', createdAt: '2024-01-05' };
    mockPrepareBy({
      'SELECT * FROM orders WHERE id':               stmt({ get: jest.fn().mockReturnValue(order) }),
      'SELECT productId FROM order_items WHERE orderId': stmt({ all: jest.fn().mockReturnValue([{ productId: 4 }]) }),
    });

    const res = await request(app).get('/api/orders/2');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 2, status: 'shipped' });
    expect(res.body.productIds).toEqual([4]);
  });

  test('returns 404 when the order does not exist', async () => {
    db.prepare.mockReturnValue(stmt({ get: jest.fn().mockReturnValue(undefined) }));

    const res = await request(app).get('/api/orders/9999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Order not found');
  });
});

// ─── POST /api/orders ─────────────────────────────────────────────────────────

describe('POST /api/orders', () => {
  function setupPostMocks({ price = 99.99, orderId = 10 } = {}) {
    mockPrepareBy({
      'SELECT price FROM products':                  stmt({ get: jest.fn().mockReturnValue({ price }) }),
      'INSERT INTO orders':                          stmt({ run: jest.fn().mockReturnValue({ lastInsertRowid: orderId }) }),
      'INSERT INTO order_items':                     stmt({ run: jest.fn() }),
      'SELECT * FROM orders WHERE id':               stmt({ get: jest.fn().mockReturnValue({ id: orderId, userId: 1, total: price * 2, status: 'pending', createdAt: '2024-01-01' }) }),
      'SELECT productId FROM order_items WHERE orderId': stmt({ all: jest.fn().mockReturnValue([{ productId: 1 }, { productId: 2 }]) }),
    });
  }

  test('creates an order and returns 201 with productIds', async () => {
    setupPostMocks({ price: 50, orderId: 10 });

    const res = await request(app)
      .post('/api/orders')
      .send({ userId: 1, productIds: [1, 2] });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 10, status: 'pending' });
    expect(res.body.productIds).toEqual(expect.arrayContaining([1, 2]));
  });

  test('computes total from product prices', async () => {
    setupPostMocks({ price: 100, orderId: 11 });
    const insertRun = db.prepare.getMockImplementation()
      ? undefined
      : jest.fn().mockReturnValue({ lastInsertRowid: 11 });

    // Re-setup to capture the INSERT call
    const insertOrderRun = jest.fn().mockReturnValue({ lastInsertRowid: 11 });
    mockPrepareBy({
      'SELECT price FROM products':                  stmt({ get: jest.fn().mockReturnValue({ price: 100 }) }),
      'INSERT INTO orders':                          stmt({ run: insertOrderRun }),
      'INSERT INTO order_items':                     stmt({ run: jest.fn() }),
      'SELECT * FROM orders WHERE id':               stmt({ get: jest.fn().mockReturnValue({ id: 11, userId: 1, total: 200, status: 'pending', createdAt: '2024-01-01' }) }),
      'SELECT productId FROM order_items WHERE orderId': stmt({ all: jest.fn().mockReturnValue([{ productId: 1 }, { productId: 2 }]) }),
    });

    await request(app).post('/api/orders').send({ userId: 1, productIds: [1, 2] });

    // total = 100 + 100 = 200
    expect(insertOrderRun).toHaveBeenCalledWith(1, 200, 'pending', expect.any(String));
  });

  test('returns 400 when userId is missing', async () => {
    const res = await request(app).post('/api/orders').send({ productIds: [1] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(db.prepare).not.toHaveBeenCalled();
  });

  test('returns 400 when productIds is missing', async () => {
    const res = await request(app).post('/api/orders').send({ userId: 1 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(db.prepare).not.toHaveBeenCalled();
  });

  test('returns 400 when productIds is not an array', async () => {
    const res = await request(app).post('/api/orders').send({ userId: 1, productIds: 'not-an-array' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(db.prepare).not.toHaveBeenCalled();
  });
});

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────

describe('PATCH /api/orders/:id/status', () => {
  function setupPatchMocks(order) {
    mockPrepareBy({
      'SELECT * FROM orders WHERE id':               stmt({ get: jest.fn().mockReturnValue(order) }),
      'UPDATE orders SET status':                    stmt({ run: jest.fn() }),
      'SELECT productId FROM order_items WHERE orderId': stmt({ all: jest.fn().mockReturnValue([]) }),
    });
  }

  const existingOrder = { id: 3, userId: 2, total: 49.99, status: 'pending', createdAt: '2024-01-10' };

  test('updates the status and returns the updated order', async () => {
    setupPatchMocks(existingOrder);

    const res = await request(app)
      .patch('/api/orders/3/status')
      .send({ status: 'shipped' });

    expect(res.status).toBe(200);
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE orders SET status'));
  });

  test.each(['pending', 'shipped', 'delivered', 'cancelled'])(
    'accepts valid status "%s"',
    async (status) => {
      setupPatchMocks(existingOrder);

      const res = await request(app)
        .patch('/api/orders/3/status')
        .send({ status });

      expect(res.status).toBe(200);
    }
  );

  test('returns 400 for an invalid status value', async () => {
    setupPatchMocks(existingOrder);

    const res = await request(app)
      .patch('/api/orders/3/status')
      .send({ status: 'flying' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 404 when the order does not exist', async () => {
    db.prepare.mockReturnValue(stmt({ get: jest.fn().mockReturnValue(undefined) }));

    const res = await request(app)
      .patch('/api/orders/9999/status')
      .send({ status: 'shipped' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Order not found');
  });
});
