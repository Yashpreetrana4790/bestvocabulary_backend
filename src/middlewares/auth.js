import { verifyAccessToken } from '../config/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/ApiError.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = (req, res, next) => {
  try {
    const raw = req.headers.authorization;
    const authHeader = raw != null && typeof raw === 'string' ? raw : '';

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const parts = authHeader.trim().split(/\s+/);
    const token = parts.length >= 2 ? String(parts[1]).trim() : '';

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = verifyAccessToken(token);

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

