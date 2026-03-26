import jwt from 'jsonwebtoken';
import { config } from './env.js';

/**
 * Access token (API Bearer). Short-lived; use refresh token to obtain a new one.
 */
export const generateAccessToken = (payload) => {
  const { type: _drop, ...rest } = payload || {};
  return jwt.sign({ ...rest, type: 'access' }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Refresh token — only accepted by POST /user/refresh. Long-lived, signed with refresh secret.
 */
export const generateRefreshToken = (payload) => {
  const { type: _drop, ...rest } = payload || {};
  return jwt.sign({ ...rest, type: 'refresh' }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

/** @deprecated Prefer generateAccessToken */
export const generateToken = (payload) => generateAccessToken(payload);

/**
 * Verify Bearer access JWT (rejects refresh tokens).
 * Legacy tokens without `type` still validate.
 */
export const verifyAccessToken = (token) => {
  try {
    if (token == null || typeof token !== 'string') {
      return null;
    }
    const trimmed = String(token).trim();
    if (!trimmed) return null;
    const decoded = jwt.verify(trimmed, config.jwt.secret);
    if (decoded.type === 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Verify refresh JWT only.
 */
export const verifyRefreshToken = (token) => {
  try {
    if (token == null || typeof token !== 'string') {
      return null;
    }
    const trimmed = String(token).trim();
    if (!trimmed) return null;
    const decoded = jwt.verify(trimmed, config.jwt.refreshSecret);
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
};

/** Alias for authenticate middleware */
export const verifyToken = (token) => verifyAccessToken(token);

export default {
  generateAccessToken,
  generateRefreshToken,
  generateToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyToken,
};
