const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM users').all());
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  try {
    const result = db.prepare(
      'INSERT INTO users (name, email, role) VALUES (?, ?, ?)'
    ).run(name, email, 'customer');
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    throw err;
  }
});

module.exports = router;
