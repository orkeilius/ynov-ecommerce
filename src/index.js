const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ecommerce-api running on http://localhost:${PORT}`);
});