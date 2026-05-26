const express = require('express');
const router = express.Router();
const db = require('../db');

const FEATURE_V2_PRODUCTS = process.env.FEATURE_V2_PRODUCTS === 'true';

function getProductsV1(callback) {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) {
      return callback(err);
    }
    callback(null, rows);
  });
}

function getProductsV2(callback) {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) {
      return callback(err);
    }
    const data = rows.map(p => ({
      ...p,
      available: p.stock > 0,
      priceFormatted: `€${p.price.toFixed(2)}`,
    }));
    callback(null, data);
  });
}

// GET /api/products
router.get('/', (req, res) => {
  const getProducts = FEATURE_V2_PRODUCTS ? getProductsV2 : getProductsV1;
  getProducts((err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(data);
  });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Product id must be a number' });
  }
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(row);
  });
});

// POST /api/products
router.post('/', (req, res) => {
  const { name, price, stock, category } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'name and price are required' });
  }
  db.run('INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)', [name, price || 0, stock || 0, category || 'misc'], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({
      id: this.lastID,
      name,
      price,
      stock: stock || 0,
      category: category || 'misc',
    });
  });
});

module.exports = router;
