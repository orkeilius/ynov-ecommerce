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

beforeEach(() => jest.clearAllMocks());

// ─── GET /api/users ───────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  test('returns all users from the db', async () => {
    const users = [
      { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { id: 2, name: 'Bob',   email: 'bob@example.com',   role: 'customer' },
    ];
    db.prepare.mockReturnValue(stmt({ all: jest.fn().mockReturnValue(users) }));

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(users);
    expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM users');
  });

  test('returns an empty array when no users exist', async () => {
    db.prepare.mockReturnValue(stmt({ all: jest.fn().mockReturnValue([]) }));

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  test('returns the user when found', async () => {
    const user = { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' };
    db.prepare.mockReturnValue(stmt({ get: jest.fn().mockReturnValue(user) }));

    const res = await request(app).get('/api/users/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  test('returns 404 when the user does not exist', async () => {
    db.prepare.mockReturnValue(stmt({ get: jest.fn().mockReturnValue(undefined) }));

    const res = await request(app).get('/api/users/9999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'User not found');
  });
});

// ─── POST /api/users ──────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  const createdUser = { id: 5, name: 'Charlie', email: 'charlie@example.com', role: 'customer' };

  test('creates a user and returns 201', async () => {
    db.prepare
      .mockReturnValueOnce(stmt({ run: jest.fn().mockReturnValue({ lastInsertRowid: 5 }) }))
      .mockReturnValueOnce(stmt({ get: jest.fn().mockReturnValue(createdUser) }));

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Charlie', email: 'charlie@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(createdUser);
  });

  test('assigns "customer" role by default', async () => {
    const insertRun = jest.fn().mockReturnValue({ lastInsertRowid: 5 });
    db.prepare
      .mockReturnValueOnce(stmt({ run: insertRun }))
      .mockReturnValueOnce(stmt({ get: jest.fn().mockReturnValue(createdUser) }));

    await request(app).post('/api/users').send({ name: 'Charlie', email: 'charlie@example.com' });

    expect(insertRun).toHaveBeenCalledWith('Charlie', 'charlie@example.com', 'customer');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/users').send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(db.prepare).not.toHaveBeenCalled();
  });

  test('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/users').send({ name: 'Ghost' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(db.prepare).not.toHaveBeenCalled();
  });

  test('returns 409 when email is already taken (UNIQUE constraint)', async () => {
    db.prepare.mockReturnValue(
      stmt({ run: jest.fn().mockImplementation(() => {
        throw new Error('UNIQUE constraint failed: users.email');
      })})
    );

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Duplicate', email: 'taken@example.com' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error', 'Email already in use');
  });
});
