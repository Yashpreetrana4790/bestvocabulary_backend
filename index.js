import { connectDatabase } from './src/config/database.js';
import app from './src/app.js';
import { config } from './src/config/env.js';
import logger from './src/utils/logger.js';

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server is running on port ${config.port}`);
      logger.info(`📁 Environment: ${config.env}`);
      logger.info(`🌍 Access: http://localhost:${config.port}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${config.port} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`Port ${config.port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
