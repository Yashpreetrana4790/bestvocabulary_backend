import mongoose from 'mongoose';
import { config } from './env.js';
import logger from '../utils/logger.js';

let connectionAttempts = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Connect to MongoDB with retry logic
 * @returns {Promise<void>}
 */
export const connectDatabase = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(config.mongoUri, options);
    connectionAttempts = 0;
    logger.info('✅ Successfully connected to MongoDB');
  } catch (error) {
    connectionAttempts++;
    logger.error(`❌ MongoDB connection attempt ${connectionAttempts} failed:`, error.message);

    if (connectionAttempts < MAX_RETRIES) {
      logger.info(`Retrying connection in ${RETRY_DELAY / 1000} seconds...`);
      setTimeout(() => connectDatabase(), RETRY_DELAY);
    } else {
      logger.error('❌ Max connection retries reached. Exiting...');
      process.exit(1);
    }
  }
};

/**
 * Handle database connection events
 */
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  logger.error('Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

/**
 * Graceful shutdown
 */
export const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Closing MongoDB connection...`);
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default connectDatabase;

