const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { registerSchema } = require('../validators/userValidator');
const { client: redis } = require('../utils/redis');

const CACHE_TTL = 3600;

const registerUser = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return sendFailed(res, 400, error.details.map((d) => d.message).join(', '));
  }

  const { name, email, password, role } = value;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return sendFailed(res, 400, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await pool.query(
      'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
      [id, name, email, hashedPassword, role || 'user']
    );

    return sendSuccess(res, 201, { id });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `user:${id}`;

  try {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Data-Source', 'cache');
        return res.status(200).json({ status: 'success', data: JSON.parse(cached) });
      }
    } catch (e) { /* redis tidak tersedia, lanjut ke db */ }

    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'User not found');
    }

    const user = result.rows[0];

    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(user));
    } catch (e) { /* ignore */ }

    res.setHeader('X-Data-Source', 'database');
    return res.status(200).json({ status: 'success', data: user });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = { registerUser, getUserById };
