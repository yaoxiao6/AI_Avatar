// src/services/ollama.ts
import { genkit, Genkit } from 'genkit';
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
  private ai: Genkit;
  private isInitialized: boolean = false;
  private config: OllamaServiceConfig;

  constructor() {
    this.config = {
      serverAddress: config.OLLAMA_SERVER_ADDRESS || 'https://node-backend-579795762739.us-central1.run.app',
      apiKey: config.OLLAMA_API_KEY
    };
    
    this.init();
  }

  private init(): void {
    try {
      // Initialize genkit with Ollama plugin
      this.ai = genkit({
        plugins: [
          {
            type: 'ollama',
            models: [{ name: 'deepseek-r1:8B' }],
            embedders: [{ name: 'mxbai-embed-large', dimensions: 768 }],
            requestHeaders: this.config.apiKey ? { 'api-key': this.config.apiKey } : undefined,
            serverAddress: this.config.serverAddress,
          },
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
   * @returns Promise with health status
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        this.init();
      }
      
      // Simple health check - try to generate a tiny response
      await this.ai.generate({
        model: 'ollama/deepseek-r1:8B',
        prompt: 'hi',
        maxTokens: 1
      });
      
      return true;
    } catch (error) {
      logger.error('Ollama health check failed', error);
      return false;
    }
  }
}

// Export a singleton instance
export default new OllamaService();