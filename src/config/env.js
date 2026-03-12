import 'dotenv/config';

/**
 * Validates required environment variables
 * @throws {Error} If any required environment variable is missing
 */
function validateEnv() {
  const required = [
    'MONGO_URI',
    'JWT_SECRET',
    'PORT'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Validate JWT_SECRET is not the default
  if (process.env.JWT_SECRET === 'RAMBLER' || process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET is not secure! Please use a strong random string.');
  }
}

// Validate on import
validateEnv();

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 8000,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Database
  mongoUri: process.env.MONGO_URI,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '1h',
  },

  // Google AI
  geminiAiKey: process.env.GEMINI_AI_KEY,

  // CORS
  cors: {
    origin: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
};

export default config;

