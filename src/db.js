const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in src directory
const dbPath = path.join(__dirname, 'ecommerce.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    category TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'customer'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    productIds TEXT NOT NULL, -- JSON array of product ids
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);

  // Seed data only if tables are empty
  const products = [
    { name: 'Laptop Pro 15"', price: 1299.99, stock: 12, category: 'electronics' },
    { name: 'Wireless Mouse', price: 39.99, stock: 85, category: 'electronics' },
    { name: 'Mechanical Keyboard', price: 149.99, stock: 34, category: 'electronics' },
    { name: 'USB-C Hub', price: 59.99, stock: 60, category: 'electronics' },
    { name: 'Standing Desk', price: 499.99, stock: 8, category: 'furniture' },
  ];

  const users = [
    { name: 'Alice Martin', email: 'alice@example.com', role: 'admin' },
    { name: 'Bob Dupont', email: 'bob@example.com', role: 'customer' },
    { name: 'Charlie Leroy', email: 'charlie@example.com', role: 'customer' },
  ];

  const orders = [
    { userId: 1, productIds: JSON.stringify([1, 2]), total: 1339.98, status: 'shipped', createdAt: '2024-01-10' },
    { userId: 2, productIds: JSON.stringify([3]), total: 149.99, status: 'pending', createdAt: '2024-01-12' },
    { userId: 1, productIds: JSON.stringify([4, 5]), total: 559.98, status: 'delivered', createdAt: '2024-01-08' },
  ];

  db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
    if (err || row.count > 0) return;
    // Insert products
    const stmtProducts = db.prepare('INSERT OR IGNORE INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)');
    products.forEach(p => stmtProducts.run(p.name, p.price, p.stock, p.category));
    stmtProducts.finalize();
  });

  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err || row.count > 0) return;
    // Insert users
    const stmtUsers = db.prepare('INSERT OR IGNORE INTO users (name, email, role) VALUES (?, ?, ?)');
    users.forEach(u => stmtUsers.run(u.name, u.email, u.role));
    stmtUsers.finalize();
  });

  db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
    if (err || row.count > 0) return;
    // Insert orders
    const stmtOrders = db.prepare('INSERT OR IGNORE INTO orders (userId, productIds, total, status, createdAt) VALUES (?, ?, ?, ?, ?)');
    orders.forEach(o => stmtOrders.run(o.userId, o.productIds, o.total, o.status, o.createdAt));
    stmtOrders.finalize();
  });
});

module.exports = db;

