/**
 * Standard API success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Response object
 */
export const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standard API paginated response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Response object
 */
export const paginatedResponse = (
  res,
  data = null,
  pagination = {},
  message = 'Success',
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};

/**
 * Standard API error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} error - Error details (optional)
 * @returns {Object} Response object
 */
export const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message,
  };

  // Only include error details in development
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standard API validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors
 * @param {string} message - Error message
 * @returns {Object} Response object
 */
export const validationErrorResponse = (res, errors = [], message = 'Validation failed') => {
  return res.status(422).json({
    success: false,
    message,
    errors,
  });
};

export default {
  successResponse,
  paginatedResponse,
  errorResponse,
  validationErrorResponse,
};

