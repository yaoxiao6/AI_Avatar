// src/index.ts
import express, { Express } from 'express';
import { createYoga } from 'graphql-yoga';
import morgan from 'morgan';
import schema from './schema';
import config from './config';
import logger from './utils/logger';

// Set up error handling for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Create Express server
const app: Express = express();

// Request logging middleware using morgan and winston
app.use(morgan('combined', { stream: (logger as any).stream }));

logger.info('Starting server...');

// Create GraphQL Yoga instance with explicit typing
const yoga = createYoga({
  schema: schema as any, // Using 'as any' to bypass type checking issues with context
  graphiql: true,
  context: ({ request }) => {
    logger.debug('Processing GraphQL request', {
      path: request.url,
      operation: (request.body as any)?.operationName
    });
    return { request, logger };
  },
  cors: true,
  multipart: true
});

logger.info('GraphQL Yoga instance created');
// GraphQL endpoint
app.use('/graphql', yoga);

// Start server
try {
  app.listen(config.PORT, () => {
    logger.info(`
🚀 Server is running!
📭 GraphQL endpoint: http://localhost:${config.PORT}/graphql
🛠️ GraphiQL interface: http://localhost:${config.PORT}/graphql
    `);
  });
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}