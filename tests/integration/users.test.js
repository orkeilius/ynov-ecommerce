const request = require('supertest');

process.env.NODE_ENV = 'test';

const app = require('../../src/app');
const db  = require('../../src/db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const insertUser = db.prepare(
  'INSERT INTO users (name, email, role) VALUES (@name, @email, @role)'
);

function seedUsers(users) {
  for (const u of users) insertUser.run(u);
}

function clearUsers() {
  db.prepare('DELETE FROM users').run();
}

// ─── GET /api/users ───────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  afterEach(clearUsers);

  test('empty list — returns an empty array', async () => {
    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('list with data — returns all users', async () => {
    seedUsers([
      { name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { name: 'Bob',   email: 'bob@example.com',   role: 'customer' },
    ]);

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map(u => u.email)).toEqual(
      expect.arrayContaining(['alice@example.com', 'bob@example.com'])
    );
  });
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  afterEach(clearUsers);

  test('existing user — returns the correct user', async () => {
    const { lastInsertRowid: id } = insertUser.run(
      { name: 'Alice', email: 'alice@example.com', role: 'admin' }
    );

    const res = await request(app).get(`/api/users/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, name: 'Alice', email: 'alice@example.com', role: 'admin' });
  });

  test('non-existent user — returns 404', async () => {
    const res = await request(app).get('/api/users/9999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'User not found');
  });
});

// ─── POST /api/users ──────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  afterEach(clearUsers);

  test('valid payload — creates user and returns 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Charlie', email: 'charlie@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name:  'Charlie',
      email: 'charlie@example.com',
      role:  'customer',
    });
    expect(res.body.id).toBeDefined();
  });

  test('missing name — returns 400', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'noemail@example.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('missing email — returns 400', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'NoEmail' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('duplicate email — returns 409', async () => {
    insertUser.run({ name: 'Alice', email: 'alice@example.com', role: 'customer' });

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice2', email: 'alice@example.com' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error', 'Email already in use');
  });
});
