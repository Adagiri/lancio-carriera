const ErrorResponse = require('../../utils/errorResponse.js');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  // console.log('error: ', error, 'err: ', err);
  error.message = err.message;

  // Log error to console for DEV

  console.log('error name: ', err.name);
  console.log(err.stack.red);

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    let message = `Resource not found with id of ${err.value}`;

    if (err.message.startsWith('Cast to ObjectId failed')) {
    } else {
      console.log(err);
      message = `Incorrect argument passed: ${err.stringValue || err.value}`;
    }

    error = new ErrorResponse(404, message);
  }

  // Mongoose duplicate field value
  if (err.code === 11000) {
    const message = `Duplicate field value entered`;

    error = new ErrorResponse(400, message);
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => {
      return val.message;
    });

    error = new ErrorResponse(400, message);
  }

  res
    .status(error.statusCode || 500)
    .json({ success: false, error: error.message || 'Server Error' });
};

module.exports = errorHandler;
