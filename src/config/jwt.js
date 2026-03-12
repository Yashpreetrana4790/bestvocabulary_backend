import jwt from 'jsonwebtoken';
import { config } from './env.js';

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @returns {string} JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded payload or null
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

export default {
  generateToken,
  verifyToken,
};

