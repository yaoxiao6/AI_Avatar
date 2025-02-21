// src/schema.js
const { createSchema } = require('graphql-yoga');
const resolvers = require('./resolvers');
const typeDefs = `
  type Query {
    health: String
    pythonServiceHealth: PythonHealthResponse!
  }

  type PythonHealthResponse {
    status: String!
  }

  type Mutation {
    askQuestion(query: String!, k: Int, scoreThreshold: Float): AskResponse!
    clearVectorStore: ClearResponse!
  }

  type AskResponse {
    status: String!
    answer: String
    message: String
    metadata: ResponseMetadata
  }

  type ResponseMetadata {
    contextFound: Boolean
    numChunksRetrieved: Int
  }

  type ClearResponse {
    status: String!
    message: String
  }
`;

// Create and export schema with resolvers
const schema = createSchema({
  typeDefs,
  resolvers,
});

module.exports = schema;
