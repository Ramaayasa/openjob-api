const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      status: 'failed',
      message: 'Invalid JSON payload',
    });
  }

  res.status(500).json({
    status: 'failed',
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
