const { createClient } = require('redis');

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
});

client.on('error', (err) => console.error('Redis error:', err.message));
client.on('connect', () => console.log('Redis connected'));

const connect = async () => {
  if (!client.isOpen) {
    await client.connect();
  }
};

module.exports = { client, connect };
