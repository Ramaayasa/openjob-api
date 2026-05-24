const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { registerSchema } = require('../validators/userValidator');

const registerUser = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

  const { name, email, password, role } = value;

  try {
    // Check if email already exists
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

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'User not found');
    }

    return sendSuccess(res, 200, result.rows[0]);
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = { registerUser, getUserById };
