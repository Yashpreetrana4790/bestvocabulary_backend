import { verifyToken } from '../config/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/ApiError.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 * @param {string[]} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Get user role from database or token
      const userRole = req.user.role || 'student';

      if (!roles.includes(userRole)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default {
  authenticate,
  authorize,
};

