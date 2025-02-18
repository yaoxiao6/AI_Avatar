
// src/schema.js
const { buildSchema } = require('graphql');

const schema = buildSchema(`
  type Query {
    health: String
  }

  type Mutation {
    ingestDocument(file: Upload!): IngestResponse!
    askQuestion(query: String!, k: Int, scoreThreshold: Float): AskResponse!
    clearVectorStore: ClearResponse!
  }

  type IngestResponse {
    status: String!
    message: String
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

  scalar Upload
`);

module.exports = schema;
