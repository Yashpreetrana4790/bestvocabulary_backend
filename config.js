// IMPORTANT: JWT_SECRET must be set in environment variables, never hardcode it!
// This is a critical security issue - secrets should never be in source code
// Note: Validation happens in index.js before this file is imported

export const JWT_SECRET = process.env.JWT_SECRET;

// Warn if using a weak secret (but don't exit - validation is done in index.js)
if (JWT_SECRET && JWT_SECRET.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security');
}