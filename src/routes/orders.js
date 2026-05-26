const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/orders
router.get('/', (req, res) => {
  db.all('SELECT * FROM orders', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    const orders = rows.map(o => ({
      ...o,
      productIds: JSON.parse(o.productIds),
    }));
    res.json(orders);
  });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Order id must be a number' });
  }
  db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Order not found' });
    }
    row.productIds = JSON.parse(row.productIds);
    res.json(row);
  });
});

// POST /api/orders
router.post('/', (req, res) => {
  const { userId, productIds } = req.body;
  if (!userId || !productIds || !Array.isArray(productIds)) {
    return res.status(400).json({ error: 'userId and productIds[] are required' });
  }
  // Calculate total
  const placeholders = productIds.map(() => '?').join(',');
  db.all(`SELECT price FROM products WHERE id IN (${placeholders})`, productIds, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    const total = rows.reduce((sum, p) => sum + p.price, 0);
    const createdAt = new Date().toISOString().split('T')[0];
    db.run('INSERT INTO orders (userId, productIds, total, status, createdAt) VALUES (?, ?, ?, ?, ?)', [userId, JSON.stringify(productIds), total, 'pending', createdAt], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({
        id: this.lastID,
        userId,
        productIds,
        total,
        status: 'pending',
        createdAt,
      });
    });
  });
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Order id must be a number' });
  }
  const { status } = req.body;
  const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }
  db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      row.productIds = JSON.parse(row.productIds);
      res.json(row);
    });
  });
});

module.exports = router;
