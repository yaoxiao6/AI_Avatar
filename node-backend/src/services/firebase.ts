// src/services/firebase.ts
import { genkit, Genkit } from 'genkit';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { chunk } from 'llm-chunk';
import { defineFirestoreRetriever } from '@genkit-ai/firebase';
import pdf from 'pdf-parse';
import logger from '../utils/logger';
import config from '../config';
import ollamaService from './ollama';

// Firebase configuration
const FIREBASE_COLLECTION = 'documents';
const CONTENT_FIELD = 'text';
const VECTOR_FIELD = 'embedding';

class FirebaseService {
  private ai!: Genkit;
  private firestore: any;
  private isInitialized: boolean = false;
  private retriever: any;

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      // Initialize Firebase Admin SDK
      const app = initializeApp({
        projectId: config.FIREBASE_PROJECT_ID,
        credential: applicationDefault(),
      });

      // Initialize Firestore
      this.firestore = getFirestore(app);

      // Set credentials if provided via environment variable
      if (process.env.GCLOUD_SERVICE_ACCOUNT_CREDS) {
        const serviceAccountCreds = JSON.parse(process.env.GCLOUD_SERVICE_ACCOUNT_CREDS);
        const authOptions = { credentials: serviceAccountCreds };
        this.firestore.settings(authOptions);
      }

      // Initialize genkit with Firebase
      this.ai = genkit({});

      // Define Firestore retriever
      this.retriever = defineFirestoreRetriever(this.ai, {
        name: 'firebaseRetriever',
        firestore: this.firestore,
        collection: FIREBASE_COLLECTION,
        contentField: CONTENT_FIELD,
        vectorField: VECTOR_FIELD,
        embedder: {
          embed: async (content: string) => {
            const embeddingResponse = await ollamaService.generateEmbedding(content);
            return [{ embedding: embeddingResponse.embedding }];
          }
        },
        distanceMeasure: 'COSINE',
      });

      this.isInitialized = true;
      logger.info('Firebase service initialized successfully', {
        projectId: config.FIREBASE_PROJECT_ID,
        collection: FIREBASE_COLLECTION
      });
    } catch (error) {
      logger.error('Failed to initialize Firebase service', error);
      this.isInitialized = false;
    }
  }

  /**
   * Health check for Firebase
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        return false;
      }
    }

    try {
      // Try to access the Firestore collection
      const snapshot = await this.firestore.collection(FIREBASE_COLLECTION).limit(1).get();
      logger.info('Firebase health check successful', {
        collection: FIREBASE_COLLECTION,
        empty: snapshot.empty
      });
      return true;
    } catch (error) {
      logger.error('Firebase health check failed', error);
      return false;
    }
  }

  /**
   * Ingest PDF document into Firebase
   * @param pdfBuffer Buffer containing the PDF file
   * @param filename Name of the PDF file
   */
  async ingestPdf(pdfBuffer: Buffer, filename: string): Promise<{ status: string; count: number }> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        throw new Error('Firebase service is not initialized');
      }
    }

    try {
      logger.info('Starting PDF ingestion', { filename });
      const startTime = Date.now();

      // Extract text from PDF
      const data = await pdf(pdfBuffer);
      const pdfText = data.text;
      
      // Divide the PDF text into segments
      const chunks = await chunk(pdfText);
      logger.info('PDF chunked successfully', { 
        chunkCount: chunks.length,
        totalLength: pdfText.length
      });

      // Add chunks to Firebase with embeddings
      let addedCount = 0;
      for (const text of chunks) {
        // Generate embedding
        const embeddingResponse = await ollamaService.generateEmbedding(text);
        
        // Add to Firestore
        await this.firestore.collection(FIREBASE_COLLECTION).add({
          [CONTENT_FIELD]: text,
          [VECTOR_FIELD]: FieldValue.vector(embeddingResponse.embedding),
          filename: filename,
          createdAt: FieldValue.serverTimestamp()
        });
        addedCount++;
      }

      const duration = Date.now() - startTime;
      logger.info('PDF ingestion completed', {
        filename,
        chunksAdded: addedCount,
        duration
      });

      return {
        status: 'success',
        count: addedCount
      };
    } catch (error) {
      logger.error('Error during PDF ingestion', error);
      throw error;
    }
  }

  /**
   * Query documents using RAG
   * @param query The query to search for
   * @param limit Maximum number of documents to retrieve
   */
  async queryDocuments(query: string, limit: number = 5): Promise<any[]> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        throw new Error('Firebase service is not initialized');
      }
    }

    try {
      logger.info('Querying documents with RAG', { query, limit });
      const startTime = Date.now();

      // Retrieve documents using the defined retriever
      const docs = await this.ai.retrieve({
        retriever: this.retriever,
        query: query,
        options: {
          limit: limit
        }
      });

      const duration = Date.now() - startTime;
      logger.info('Document retrieval completed', {
        query,
        resultCount: docs.length,
        duration
      });

      return docs;
    } catch (error) {
      logger.error('Error querying documents', error);
      throw error;
    }
  }

  /**
   * Ask a question using RAG
   * @param question The question to ask
   * @param limit Maximum number of documents to retrieve for context
   */
  async askQuestion(question: string, limit: number = 5): Promise<{ answer: string; sources: any[] }> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        throw new Error('Firebase service is not initialized');
      }
    }

    try {
      logger.info('Processing question with Firebase RAG', { question, limit });
      const startTime = Date.now();

      // Retrieve relevant documents
      const docs = await this.queryDocuments(question, limit);
      
      // If no documents found, return a simple response
      if (!docs || docs.length === 0) {
        logger.info('No relevant documents found for the question');
        return {
          answer: "I couldn't find any relevant information to answer your question.",
          sources: []
        };
      }

      // Create context from retrieved documents
      const context = docs.map(doc => doc.content).join('\n\n');
      
      // Generate answer using Ollama
      const prompt = `
      Answer the following question based on the context provided below. If the context does not contain the answer, say "I don't have enough information to answer that question."
      
      Context:
      ${context}
      
      Question: ${question}
      
      Answer:`;
      
      const response = await ollamaService.generateText(prompt);
      
      const duration = Date.now() - startTime;
      logger.info('Question answered with RAG', {
        question,
        contextLength: context.length,
        answerLength: response.text.length,
        duration
      });

      return {
        answer: response.text,
        sources: docs.map(doc => ({
          content: doc.content,
          filename: doc.metadata?.filename || 'unknown'
        }))
      };
    } catch (error) {
      logger.error('Error answering question with RAG', error);
      throw error;
    }
  }

  /**
   * Clear all documents from the Firestore collection
   */
  async clearDocuments(): Promise<number> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        throw new Error('Firebase service is not initialized');
      }
    }

    try {
      logger.info('Clearing documents from Firebase');
      const startTime = Date.now();

      // Get all documents in the collection
      const snapshot = await this.firestore.collection(FIREBASE_COLLECTION).get();
      
      // Delete each document
      const deletePromises = snapshot.docs.map((doc: any) => doc.ref.delete());
      await Promise.all(deletePromises);
      
      const count = deletePromises.length;
      const duration = Date.now() - startTime;
      logger.info('Documents cleared from Firebase', {
        documentCount: count,
        duration
      });

      return count;
    } catch (error) {
      logger.error('Error clearing documents from Firebase', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new FirebaseService();