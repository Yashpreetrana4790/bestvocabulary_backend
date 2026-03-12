import logger from '../utils/logger.js';
import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/ApiError.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error = new ValidationError('Validation failed', messages);
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new BadRequestError(`${field} already exists`);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  }

  // Handle Cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    error = new BadRequestError('Invalid ID format');
  }

  // Default to 500 error
  if (!(error instanceof ApiError)) {
    error = {
      statusCode: 500,
      message: error.message || 'Internal Server Error',
    };
  }

  // Send error response
  errorResponse(res, error.message, error.statusCode, err);
};

export default errorHandler;

