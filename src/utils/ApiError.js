/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 400 Bad Request Error
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

/**
 * 403 Forbidden Error
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

/**
 * 409 Conflict Error
 */
export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(409, message);
  }
}

/**
 * 422 Validation Error
 */
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(422, message);
    this.errors = errors;
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error') {
    super(500, message, false);
  }
}

export default ApiError;

