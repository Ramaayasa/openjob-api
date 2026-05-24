require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'failed',
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

const HOST = process.env.HOST || 'localhost';
const PORT = parseInt(process.env.PORT, 10) || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

module.exports = app;
