
// src/index.js
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const schema = require('./schema');
const resolvers = require('./resolvers');
const { PORT } = require('./config');

// Set up error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Create Express server
const app = express();

// Middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// GraphQL endpoint
app.use('/graphql',
    graphqlHTTP({
        schema: schema,
        rootValue: resolvers,
        graphiql: true,
        formatError: (error) => {
            console.error('GraphQL Error:', error);
            return error;
        }
    })
);

// Start server
try {
    app.listen(PORT, () => {
        console.log(`
🚀 Server is running!
📭 GraphQL endpoint: http://localhost:${PORT}/graphql
🛠️ GraphiQL interface: http://localhost:${PORT}/graphql
        `);
    });
} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}