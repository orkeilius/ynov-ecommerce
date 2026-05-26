const db = require('./index');

const products = [
  { id: 1, name: 'Laptop Pro 15"', price: 1299.99, stock: 12, category: 'electronics' },
  { id: 2, name: 'Wireless Mouse',   price: 39.99,  stock: 85, category: 'electronics' },
  { id: 3, name: 'Mechanical Keyboard', price: 149.99, stock: 34, category: 'electronics' },
  { id: 4, name: 'USB-C Hub',        price: 59.99,  stock: 60, category: 'electronics' },
  { id: 5, name: 'Standing Desk',    price: 499.99, stock: 8,  category: 'furniture' },
];

const users = [
  { id: 1, name: 'Alice Martin',   email: 'alice@example.com',   role: 'admin' },
  { id: 2, name: 'Bob Dupont',     email: 'bob@example.com',     role: 'customer' },
  { id: 3, name: 'Charlie Leroy',  email: 'charlie@example.com', role: 'customer' },
];

const orders = [
  { id: 1, userId: 1, productIds: [1, 2], total: 1339.98, status: 'shipped',   createdAt: '2024-01-10' },
  { id: 2, userId: 2, productIds: [3],    total: 149.99,  status: 'pending',   createdAt: '2024-01-12' },
  { id: 3, userId: 1, productIds: [4, 5], total: 559.98,  status: 'delivered', createdAt: '2024-01-08' },
];

const insertProduct = db.prepare(
  'INSERT OR IGNORE INTO products (id, name, price, stock, category) VALUES (@id, @name, @price, @stock, @category)'
);
const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (id, name, email, role) VALUES (@id, @name, @email, @role)'
);
const insertOrder = db.prepare(
  'INSERT OR IGNORE INTO orders (id, userId, total, status, createdAt) VALUES (@id, @userId, @total, @status, @createdAt)'
);
const insertOrderItem = db.prepare(
  'INSERT OR IGNORE INTO order_items (orderId, productId) VALUES (@orderId, @productId)'
);

const seed = db.transaction(() => {
  for (const p of products) insertProduct.run(p);
  for (const u of users)    insertUser.run(u);
  for (const o of orders) {
    const { productIds, ...orderData } = o;
    insertOrder.run(orderData);
    for (const productId of productIds) {
      insertOrderItem.run({ orderId: o.id, productId });
    }
  }
});

seed();
console.log('Database seeded successfully.');
