// src/services/ollama.ts
import { genkit, Genkit } from 'genkit';
import { ollama } from 'genkitx-ollama';
import logger from '../utils/logger';
import config from '../config';

// Define types for Ollama service
export interface OllamaServiceConfig {
  serverAddress: string;
  apiKey?: string;
}

export interface GenerateResponse {
  text: string;
  model: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
}

class OllamaService {
  private ai!: Genkit; // Add definite assignment assertion operator
  private isInitialized: boolean = false;
  private config: OllamaServiceConfig;

  constructor() {
    this.config = {
      serverAddress: config.OLLAMA_SERVER_ADDRESS,
      apiKey: config.OLLAMA_API_KEY
    };
    
    this.init();
  }

  private init(): void {
    try {
      // Initialize genkit with Ollama plugin
      this.ai = genkit({
        plugins: [
          ollama({
            models: [{ name: 'deepseek-r1:8B' }],
            embedders: [{ name: 'mxbai-embed-large', dimensions: 768 }],
            requestHeaders: this.config.apiKey ? { 'api-key': this.config.apiKey } : undefined,
            serverAddress: this.config.serverAddress,
          })
        ],
      });
      
      this.isInitialized = true;
      logger.info('Ollama service initialized successfully', {
        serverAddress: this.config.serverAddress,
        hasApiKey: !!this.config.apiKey
      });
    } catch (error) {
      logger.error('Failed to initialize Ollama service', error);
      this.isInitialized = false;
    }
  }

  /**
   * Generate text using Ollama model
   * @param prompt The prompt to generate text from
   * @returns Promise with generated text
   */
  async generateText(prompt: string): Promise<GenerateResponse> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        throw new Error('Ollama service is not initialized');
      }
    }

    try {
      logger.info('Generating text with Ollama', { promptLength: prompt.length });
      const startTime = Date.now();
      
      const response = await this.ai.generate({
        model: 'ollama/deepseek-r1:8B',
        prompt: prompt,
        // Add any other parameters that might be needed by genkit
      });
      
      const duration = Date.now() - startTime;
      logger.info('Text generation completed', { 
        duration,
        responseLength: response.text.length 
      });
      
      return {
        text: response.text,
        model: 'deepseek-r1:8B'
      };
    } catch (error) {
      logger.error('Error generating text with Ollama', error);
      throw error;
    }
  }

  /**
   * Generate embeddings using Ollama model
   * @param text The text to generate embeddings for
   * @returns Promise with embeddings array
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        throw new Error('Ollama service is not initialized');
      }
    }

    try {
      logger.info('Generating embeddings with Ollama', { textLength: text.length });
      const startTime = Date.now();
      
      const response = await this.ai.embed({
        embedder: 'ollama/mxbai-embed-large',
        content: text,
      });
      
      const duration = Date.now() - startTime;
      logger.info('Embeddings generation completed', { 
        duration,
        embeddingsDimensions: response[0].embedding.length
      });
      
      return {
        embedding: response[0].embedding,
        model: 'mxbai-embed-large'
      };
    } catch (error) {
      logger.error('Error generating embeddings with Ollama', error);
      throw error;
    }
  }

  /**
   * Check if the Ollama service is healthy
   * @returns Promise with health status response
   */
  async healthCheck(): Promise<string> {
    try {
      if (!this.isInitialized) {
        this.init();
      }
      
      // Send a direct GET request to the Ollama server
      const axios = require('axios');
      const response = await axios.get(this.config.serverAddress);
      
      // Log the response for debugging
      logger.info('Ollama health check response:', { 
        data: response.data,
        status: response.status 
      });
      
      // Return the raw string response
      return response.data;
    } catch (error) {
      logger.error('Ollama health check failed', error);
      return 'Error: Ollama health check failed';
    }
  }
}

// Export a singleton instance
export default new OllamaService();