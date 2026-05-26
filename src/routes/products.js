const express = require('express');
const router = express.Router();
const db = require('../db');
const { formatV2 } = require('../utils/formatters');

const FEATURE_V2_PRODUCTS = process.env.FEATURE_V2_PRODUCTS === 'true';

// GET /api/products?category=<category>
router.get('/', (req, res) => {
  const { category } = req.query;
  const rows = category
    ? db.prepare('SELECT * FROM products WHERE category = ?').all(category)
    : db.prepare('SELECT * FROM products').all();
  res.json(FEATURE_V2_PRODUCTS ? rows.map(formatV2) : rows);
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Product id must be a number' });
  }
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(FEATURE_V2_PRODUCTS ? formatV2(product) : product);
});

// POST /api/products
router.post('/', (req, res) => {
  const { name, price, stock, category } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'name and price are required' });
  }
  const result = db.prepare(
    'INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)'
  ).run(name, price, stock ?? 0, category ?? 'misc');
  const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newProduct);
});

module.exports = router;
