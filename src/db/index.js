const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, 'ecommerce.db');

const db = new Database(dbPath);

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    id       INTEGER PRIMARY KEY,
    name     TEXT    NOT NULL,
    price    REAL    NOT NULL,
    stock    INTEGER NOT NULL DEFAULT 0,
    category TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role  TEXT NOT NULL DEFAULT 'customer'
  );

  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY,
    userId     INTEGER NOT NULL,
    total      REAL    NOT NULL,
    status     TEXT    NOT NULL DEFAULT 'pending',
    createdAt  TEXT    NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    orderId   INTEGER NOT NULL,
    productId INTEGER NOT NULL,
    PRIMARY KEY (orderId, productId),
    FOREIGN KEY (orderId)   REFERENCES orders(id),
    FOREIGN KEY (productId) REFERENCES products(id)
  );
`;

db.exec(SCHEMA);

module.exports = db;
module.exports.SCHEMA = SCHEMA;
