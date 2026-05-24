const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { loginSchema, refreshTokenSchema, deleteAuthSchema } = require('../validators/authValidator');

const login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

  const { email, password } = value;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return sendFailed(res, 401, 'Invalid email or password');
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendFailed(res, 401, 'Invalid email or password');
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_KEY,
      { expiresIn: '3h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.REFRESH_TOKEN_KEY
    );

    // Store refresh token in database
    const tokenId = uuidv4();
    await pool.query(
      'INSERT INTO authentications (id, user_id, refresh_token) VALUES ($1, $2, $3)',
      [tokenId, user.id, refreshToken]
    );

    return sendSuccess(res, 200, { accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const refreshToken = async (req, res) => {
  const { error, value } = refreshTokenSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

  const { refreshToken: token } = value;

  try {
    // Verify token signature
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_KEY);
    } catch (err) {
      return sendFailed(res, 400, 'Invalid refresh token');
    }

    // Check if token is in database
    const result = await pool.query(
      'SELECT * FROM authentications WHERE refresh_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return sendFailed(res, 400, 'Refresh token not found');
    }

    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      process.env.ACCESS_TOKEN_KEY,
      { expiresIn: '3h' }
    );

    return sendSuccess(res, 200, { accessToken: newAccessToken });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const logout = async (req, res) => {
  const { error, value } = deleteAuthSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

  const { refreshToken: token } = value;

  try {
    // Verify token signature
    try {
      jwt.verify(token, process.env.REFRESH_TOKEN_KEY);
    } catch (err) {
      return sendFailed(res, 400, 'Invalid refresh token');
    }

    const result = await pool.query(
      'SELECT id FROM authentications WHERE refresh_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return sendFailed(res, 400, 'Refresh token not found');
    }

    await pool.query('DELETE FROM authentications WHERE refresh_token = $1', [token]);

    return sendSuccess(res, 200, undefined, 'Logout successful');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = { login, refreshToken, logout };
