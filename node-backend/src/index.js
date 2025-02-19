// src/index.js
const express = require('express');
const { createYoga } = require('graphql-yoga');
// const { createServer } = require('node:http');
const morgan = require('morgan');
const schema = require('./schema');
const { PORT } = require('./config');
const logger = require('./utils/logger');

// Set up error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
});

// Create Express server
const app = express();

// Request logging middleware using morgan and winston
app.use(morgan('combined', { stream: logger.stream }));

logger.info('Starting server...');

// Create GraphQL Yoga instance
const yoga = createYoga({
    schema,
    graphiql: true,
    context: ({ request }) => {
        logger.debug('Processing GraphQL request', {
            path: request.url,
            operation: request.body?.operationName
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
    app.listen(PORT, () => {
        logger.info(`
🚀 Server is running!
📭 GraphQL endpoint: http://localhost:${PORT}/graphql
🛠️ GraphiQL interface: http://localhost:${PORT}/graphql
        `);
    });
} catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
}