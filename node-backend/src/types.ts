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

// Python service related types
export interface PythonHealthResponse {
  status: string;
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
}