const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  // PostgreSQL unique violation
  if (err.code === '23505') {
    statusCode = 409;
    message = 'A record with that value already exists.';
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced resource does not exist.';
  }

  // PostgreSQL not-null violation
  if (err.code === '23502') {
    statusCode = 400;
    message = `Field '${err.column}' is required.`;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
