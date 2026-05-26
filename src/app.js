const express = require('express');

const productsRouter = require('./routes/products');
const ordersRouter  = require('./routes/orders');
const usersRouter   = require('./routes/users');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/products', productsRouter);
app.use('/api/orders',   ordersRouter);
app.use('/api/users',    usersRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
