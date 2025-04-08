// src/schema.ts
import { createSchema } from 'graphql-yoga';
import resolvers from './resolvers';

const typeDefs = `
  type Query {
    health: String
    pythonServiceHealth: PythonHealthResponse!
    ollamaHealth: OllamaHealthResponse!
    getContacts: [Contact]
    getContact(id: ID!): Contact
  }

  type PythonHealthResponse {
    status: String!
  }

  type OllamaHealthResponse {
    status: String!
  }

  type Mutation {
    askQuestion(query: String!, k: Int, scoreThreshold: Float): AskResponse!
    askOllama(query: String!): OllamaResponse!
    clearVectorStore: ClearResponse!
    submitContact(input: ContactInput!): ContactResponse!
  }

  input ContactInput {
    name: String!
    company: String
    email: String!
    phone: String
    note: String
  }

  type Contact {
    id: ID!
    name: String!
    company: String
    email: String!
    phone: String
    note: String
    created_at: String
  }

  type ContactResponse {
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

  type OllamaResponse {
    status: String!
    answer: String
    model: String
    message: String
  }
`;

// Create and export schema with resolvers
const schema = createSchema({
  typeDefs,
  resolvers,
});

export default schema;