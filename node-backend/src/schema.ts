// src/schema.ts
import { createSchema } from 'graphql-yoga';
import resolvers from './resolvers';

const typeDefs = `
  type Query {
    health: String
    ollamaHealth: OllamaHealthResponse!
    firebaseHealth: FirebaseHealthResponse!
    getContacts: [Contact]
    getContact(id: ID!): Contact
  }

  type OllamaHealthResponse {
    status: String!
    response: String
  }

  type FirebaseHealthResponse {
    status: String!
    projectId: String
  }

  type Mutation {
    askOllama(query: String!): OllamaResponse!
    askFirebase(query: String!, limit: Int): FirebaseAskResponse!
    clearVectorStore: ClearResponse!
    clearFirebase: ClearResponse!
    submitContact(input: ContactInput!): ContactResponse!
  }

  type FirebaseAskResponse {
    status: String!
    answer: String
    message: String
    sources: [FirebaseSource]
  }

  type FirebaseSource {
    content: String!
    filename: String
    score: Float
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