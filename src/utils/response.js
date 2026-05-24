const sendSuccess = (res, statusCode, data, message) => {
  const response = { status: 'success' };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  return res.status(statusCode).json(response);
};

const sendFailed = (res, statusCode, message) => {
  return res.status(statusCode).json({
    status: 'failed',
    message,
  });
};

module.exports = { sendSuccess, sendFailed };
