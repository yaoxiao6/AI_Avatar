import { Request } from 'express';
import { Logger } from 'winston';

// Context type for GraphQL resolvers
export interface Context {
  request: Request;
  logger: Logger;
}

// Contact related types
export interface Contact {
  id: number;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  note: string | null;
  created_at: string;
}

export interface ContactInput {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  note?: string;
}

export interface ContactResponse {
  status: string;
  message?: string;
}

export interface AskResponse {
  status: string;
  answer?: string;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  contextFound?: boolean;
  numChunksRetrieved?: number;
}

export interface ClearResponse {
  status: string;
  message?: string;
}

// Ollama service related types
export interface OllamaHealthResponse {
  status: string;
  response?: string;
}

export interface OllamaResponse {
  status: string;
  answer?: string;
  model?: string;
  message?: string;
}

// Firebase service related types
export interface FirebaseHealthResponse {
  status: string;
  projectId?: string;
}

export interface FirebaseIngestResponse {
  status: string;
  message?: string;
  count?: number;
}

export interface FirebaseAskResponse {
  status: string;
  answer?: string;
  message?: string;
  sources?: FirebaseSource[];
}

export interface FirebaseSource {
  content: string;
  filename?: string;
  score?: number;
}

// Database configuration
export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | { rejectUnauthorized: boolean };
}

// Application configuration
export interface AppConfig {
  PYTHON_SERVICE_URL: string | undefined;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: string;
  OLLAMA_SERVER_ADDRESS: string;
  OLLAMA_API_KEY?: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_ID: string;
  LOG_LEVEL: string;
}