import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Validate required environment variables FIRST, before importing anything else
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please create a .env file in bestvocabulary_backend folder with:');
  console.error('MONGO_URI=your_mongodb_connection_string');
  console.error('JWT_SECRET=your_secret_key_at_least_32_chars_long');
  console.error('');
  console.error('Example .env file:');
  console.error('MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname');
  console.error('JWT_SECRET=your-very-long-and-secure-secret-key-here-minimum-32-characters');
  process.exit(1);
}

import './db.js';
import userrouter from './routes/user.js';
import wordsrouter from './routes/words.js';
import wordOfTheDayRouter from './routes/wordOfTheDay.js';
import adminrouter from './routes/admin.js';
import questionsrouter from './routes/questions.js'
import phraserouter from './routes/phrase.js';

import './models/expressionmodel.js';
import './models/phrasalVerbsmodel.js';
import './models/questionsmodel.js';
import './models/wordmodel.js';


const app = express();
const port = process.env.PORT || 8000;

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// 1. CORS Configuration - Restrict origins instead of allowing all
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production'
    ? [] // Must be set in production
    : ['http://localhost:3000', 'http://localhost:3001']; // Development defaults

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) only in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (!origin) {
      return callback(new Error('CORS: No origin header'));
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} is not allowed`));
    }
  },
  credentials: true, // Allow cookies/credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}));

// 2. Body Parser with size limits to prevent DoS attacks
app.use(express.json({
  limit: '10mb', // Maximum request body size
  verify: (req, res, buf) => {
    // Additional validation can be added here
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// 3. Security Headers - Basic implementation (consider using helmet.js)
app.use((req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Strict Transport Security (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// 4. Request logging middleware (basic - consider using morgan for production)
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip || req.connection.remoteAddress}`;

    // Only log errors in production, everything in development
    if (process.env.NODE_ENV !== 'production' || res.statusCode >= 400) {
      console.log(logMessage);
    }
  });

  next();
});

// Routes
app.use("/api/v1/user", userrouter);
app.use("/api/v1/words", wordsrouter)
app.use("/api/v1/questions", questionsrouter)
app.use("/api/v1/word-of-the-day", wordOfTheDayRouter);
app.use("/api/v1/phrase", phraserouter);
app.use("/api/v1/admin", adminrouter);

// 5. 404 Handler - Must be after all routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 6. Global Error Handler - Must be last, prevents information leakage
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Don't leak error details in production
  const errorResponse = {
    error: process.env.NODE_ENV === 'production'
      ? 'An error occurred. Please try again later.'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  };

  res.status(err.status || 500).json(errorResponse);
});

// Start server
app.listen(port, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'All (development mode)'}`);
  }
});
