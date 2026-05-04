const express = require('express');
const router = express.Router();
const db = require('../db');

function getOrderWithItems(id) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return null;
  const items = db.prepare('SELECT productId FROM order_items WHERE orderId = ?').all(id);
  return { ...order, productIds: items.map(i => i.productId) };
}

// GET /api/orders
router.get('/', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders').all();
  const result = orders.map(o => {
    const items = db.prepare('SELECT productId FROM order_items WHERE orderId = ?').all(o.id);
    return { ...o, productIds: items.map(i => i.productId) };
  });
  res.json(result);
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const order = getOrderWithItems(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// POST /api/orders
router.post('/', (req, res) => {
  const { userId, productIds } = req.body;
  if (!userId || !productIds || !Array.isArray(productIds)) {
    return res.status(400).json({ error: 'userId and productIds[] are required' });
  }

  const total = productIds.reduce((sum, pid) => {
    const product = db.prepare('SELECT price FROM products WHERE id = ?').get(pid);
    return sum + (product ? product.price : 0);
  }, 0);

  const createdAt = new Date().toISOString().split('T')[0];

  const create = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO orders (userId, total, status, createdAt) VALUES (?, ?, ?, ?)'
    ).run(userId, total, 'pending', createdAt);
    const orderId = result.lastInsertRowid;
    const insertItem = db.prepare('INSERT INTO order_items (orderId, productId) VALUES (?, ?)');
    for (const pid of productIds) insertItem.run(orderId, pid);
    return orderId;
  });

  const orderId = create();
  res.status(201).json(getOrderWithItems(orderId));
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const { status } = req.body;
  const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  res.json(getOrderWithItems(id));
});

module.exports = router;
