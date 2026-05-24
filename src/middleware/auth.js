const jwt = require('jsonwebtoken');
const { sendFailed } = require('../utils/response');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendFailed(res, 401, 'Missing or invalid authorization token');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendFailed(res, 401, 'Access token expired');
    }
    return sendFailed(res, 401, 'Invalid access token');
  }
};

module.exports = authMiddleware;
