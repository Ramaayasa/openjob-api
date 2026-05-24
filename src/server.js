require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { connect: connectRedis } = require('./utils/redis');
const { connect: connectRabbitMQ } = require('./utils/rabbitmq');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', routes);

app.use((req, res) => {
  res.status(404).json({ status: 'failed', message: 'Route not found' });
});

app.use(errorHandler);

const HOST = process.env.HOST || 'localhost';
const PORT = parseInt(process.env.PORT, 10) || 3000;

const start = async () => {
  try {
    await connectRedis();
  } catch (err) {
    console.error('Redis not available, continuing without cache:', err.message);
  }

  try {
    await connectRabbitMQ();
  } catch (err) {
    console.error('RabbitMQ not available, continuing without MQ:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
};

start();

module.exports = app;
