const express = require('express');
const router = express.Router();
const db = require('../db');

const FEATURE_V2_E = process.env.FEATURE_V2_E === 'true';

// GET /api/users
router.get('/', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'User id must be a number' });
  }
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(row);
  });
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  db.run('INSERT INTO users (name, email, role) VALUES (?, ?, ?)', [name, email, 'customer'], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(FEATURE_V2_E ? 201 : 202).json({
      id: this.lastID,
      name,
      email,
      role: 'customer',
    });
  });
});

module.exports = router;
