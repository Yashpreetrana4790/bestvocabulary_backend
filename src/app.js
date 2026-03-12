import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config/env.js';
import logger from './utils/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';

// Import routes
import userRouter from './routes/user.js';
import wordsRouter from './routes/words.js';
import wordOfTheDayRouter from './routes/wordOfTheDay.js';
import adminRouter from './routes/admin.js';
import statsRouter from './routes/stats.js';
import questionsRouter from './routes/questions.js';
import phraseRouter from './routes/phrase.js';
import aiRouter from './routes/ai.js';

// Import models to ensure they're registered
import './models/expressionmodel.js';
import './models/phrasalVerbsmodel.js';
import './models/questionsmodel.js';
import './models/usermodel.js';
import './models/wodmodel.js';
import './models/wordmodel.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL injection attacks
app.use(mongoSanitize());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/v1/user', userRouter);
app.use('/api/v1/words', wordsRouter);
app.use('/api/v1/questions', questionsRouter);
app.use('/api/v1/word-of-the-day', wordOfTheDayRouter);
app.use('/api/v1/phrase', phraseRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/ai', aiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler (must be last middleware)
app.use(errorHandler);

export default app;

