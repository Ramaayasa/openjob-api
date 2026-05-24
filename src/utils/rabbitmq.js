const amqp = require('amqplib');

let channel = null;
const QUEUE_NAME = 'application_notifications';

const getAmqpUrl = () => {
  const host = process.env.RABBITMQ_HOST || 'localhost';
  const port = process.env.RABBITMQ_PORT || '5672';
  const user = process.env.RABBITMQ_USER || 'guest';
  const password = process.env.RABBITMQ_PASSWORD || 'guest';
  return process.env.AMQP_URL || `amqp://${user}:${password}@${host}:${port}`;
};

const connect = async () => {
  try {
    const connection = await amqp.connect(getAmqpUrl());
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('RabbitMQ connected');
    return channel;
  } catch (err) {
    console.error('RabbitMQ connection error:', err.message);
    return null;
  }
};

const publishMessage = async (data) => {
  try {
    if (!channel) await connect();
    if (!channel) return false;
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(data)), { persistent: true });
    return true;
  } catch (err) {
    console.error('RabbitMQ publish error:', err.message);
    return false;
  }
};

module.exports = { connect, publishMessage, QUEUE_NAME };
