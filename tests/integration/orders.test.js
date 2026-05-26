const request = require('supertest');

process.env.NODE_ENV = 'test';

const app = require('../../src/app');
const db  = require('../../src/db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const insertUser = db.prepare(
  'INSERT INTO users (name, email, role) VALUES (@name, @email, @role)'
);
const insertProduct = db.prepare(
  'INSERT INTO products (name, price, stock, category) VALUES (@name, @price, @stock, @category)'
);

function clearAll() {
  db.prepare('DELETE FROM order_items').run();
  db.prepare('DELETE FROM orders').run();
  db.prepare('DELETE FROM products').run();
  db.prepare('DELETE FROM users').run();
}

// Seed one user and two products; return their ids for use in tests.
function seedBase() {
  const { lastInsertRowid: userId } = insertUser.run(
    { name: 'Alice', email: 'alice@example.com', role: 'customer' }
  );
  const { lastInsertRowid: productId1 } = insertProduct.run(
    { name: 'Laptop', price: 999.99, stock: 5, category: 'electronics' }
  );
  const { lastInsertRowid: productId2 } = insertProduct.run(
    { name: 'Mouse', price: 29.99, stock: 20, category: 'electronics' }
  );
  return { userId, productId1, productId2 };
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────

describe('GET /api/orders', () => {
  afterEach(clearAll);

  test('empty list — returns an empty array', async () => {
    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('list with data — returns all orders with their productIds', async () => {
    const { userId, productId1, productId2 } = seedBase();

    await request(app)
      .post('/api/orders')
      .send({ userId, productIds: [productId1, productId2] });

    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ userId, status: 'pending' });
    expect(res.body[0].productIds).toEqual(
      expect.arrayContaining([productId1, productId2])
    );
  });
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────

describe('GET /api/orders/:id', () => {
  afterEach(clearAll);

  test('existing order — returns the order with its productIds', async () => {
    const { userId, productId1 } = seedBase();

    const created = await request(app)
      .post('/api/orders')
      .send({ userId, productIds: [productId1] });

    const res = await request(app).get(`/api/orders/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: created.body.id, userId, status: 'pending' });
    expect(res.body.productIds).toContain(productId1);
  });

  test('non-existent order — returns 404', async () => {
    const res = await request(app).get('/api/orders/9999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Order not found');
  });
});

// ─── POST /api/orders ─────────────────────────────────────────────────────────

describe('POST /api/orders', () => {
  afterEach(clearAll);

  test('valid payload — creates order, computes total, returns 201', async () => {
    const { userId, productId1, productId2 } = seedBase();

    const res = await request(app)
      .post('/api/orders')
      .send({ userId, productIds: [productId1, productId2] });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId,
      status: 'pending',
      total: 999.99 + 29.99,
    });
    expect(res.body.productIds).toEqual(
      expect.arrayContaining([productId1, productId2])
    );
    expect(res.body.id).toBeDefined();
  });

  test('missing userId — returns 400', async () => {
    const { productId1 } = seedBase();

    const res = await request(app)
      .post('/api/orders')
      .send({ productIds: [productId1] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('missing productIds — returns 400', async () => {
    const { userId } = seedBase();

    const res = await request(app)
      .post('/api/orders')
      .send({ userId });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('productIds not an array — returns 400', async () => {
    const { userId } = seedBase();

    const res = await request(app)
      .post('/api/orders')
      .send({ userId, productIds: 'not-an-array' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────

describe('PATCH /api/orders/:id/status', () => {
  afterEach(clearAll);

  test('valid status — updates and returns the order', async () => {
    const { userId, productId1 } = seedBase();
    const created = await request(app)
      .post('/api/orders')
      .send({ userId, productIds: [productId1] });

    const res = await request(app)
      .patch(`/api/orders/${created.body.id}/status`)
      .send({ status: 'shipped' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: created.body.id, status: 'shipped' });
  });

  test('invalid status value — returns 400', async () => {
    const { userId, productId1 } = seedBase();
    const created = await request(app)
      .post('/api/orders')
      .send({ userId, productIds: [productId1] });

    const res = await request(app)
      .patch(`/api/orders/${created.body.id}/status`)
      .send({ status: 'flying' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('non-existent order — returns 404', async () => {
    const res = await request(app)
      .patch('/api/orders/9999/status')
      .send({ status: 'shipped' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Order not found');
  });

  test('all valid statuses are accepted', async () => {
    const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];

    for (const status of validStatuses) {
      const { userId, productId1 } = seedBase();
      const created = await request(app)
        .post('/api/orders')
        .send({ userId, productIds: [productId1] });

      const res = await request(app)
        .patch(`/api/orders/${created.body.id}/status`)
        .send({ status });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);

      clearAll();
    }
  });
});
