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
import { Contact, ContactInput } from '../types';

// Firebase configuration
const FIREBASE_DATABASE_ID = 'rag-embedded-pdf'; // Specify the custom database ID
const FIREBASE_COLLECTION = 'embedded-pdf'; // Updated collection name
const CONTENT_FIELD = 'text';
const VECTOR_FIELD = 'embedding';
const CONTACTS_COLLECTION = 'visitor-contact'; // Collection for storing contacts

// Chunking configuration - align with Python settings
const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 200;

class FirebaseService {
  private ai!: Genkit;
  private firestore: any;
  private isInitialized: boolean = false;
  private retriever: any;
  private embeddingModel: string = 'mxbai-embed-large';

  constructor() {
    this.init();
  }
  
  /**
   * Save a new contact to Firebase
   * @param contact The contact data to save
   * @returns The saved contact with ID
   */
  async saveContact(contactInput: ContactInput): Promise<Contact> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        throw new Error('Firebase service is not initialized');
      }
    }

    try {
      logger.info('Saving contact to Firebase', { 
        name: contactInput.name, 
        email: contactInput.email 
      });
      
      const contactData = {
        name: contactInput.name,
        company: contactInput.company || null,
        email: contactInput.email,
        phone: contactInput.phone || null,
        note: contactInput.note || null,
        created_at: new Date().toISOString()
      };
      
      // Add to Firestore
      const docRef = await this.firestore.collection(CONTACTS_COLLECTION).add(contactData);
      
      logger.info('Contact saved successfully to Firebase', {
        id: docRef.id,
        name: contactInput.name,
        email: contactInput.email
      });
      
      // Return the complete contact with the generated ID
      return {
        id: docRef.id,
        ...contactData
      } as Contact;
    } catch (error) {
      logger.error('Error saving contact to Firebase', error);
      throw error;
    }
  }
  
  /**
   * Get all contacts from Firebase
   * @returns Array of contact records
   */
  async getContacts(): Promise<Contact[]> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        throw new Error('Firebase service is not initialized');
      }
    }

    try {
      logger.info('Fetching all contacts from Firebase');
      
      // Query Firestore
      const snapshot = await this.firestore.collection(CONTACTS_COLLECTION)
        .orderBy('created_at', 'desc')
        .get();
      
      // Map to Contact objects
      const contacts: Contact[] = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          note: data.note,
          created_at: data.created_at
        } as Contact;
      });
      
      logger.info(`Retrieved ${contacts.length} contacts from Firebase`);
      return contacts;
    } catch (error) {
      logger.error('Error retrieving contacts from Firebase', error);
      throw error;
    }
  }
  
  /**
   * Get a single contact by ID from Firebase
   * @param id The contact ID
   * @returns The contact record
   */
  async getContactById(id: string): Promise<Contact | null> {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) {
        throw new Error('Firebase service is not initialized');
      }
    }

    try {
      logger.info(`Fetching contact with ID: ${id} from Firebase`);
      
      // Get document from Firestore
      const doc = await this.firestore.collection(CONTACTS_COLLECTION).doc(id).get();
      
      if (!doc.exists) {
        logger.warn(`No contact found with ID: ${id} in Firebase`);
        return null;
      }
      
      const data = doc.data();
      
      // Map to Contact object
      const contact: Contact = {
        id: doc.id,
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone,
        note: data.note,
        created_at: data.created_at
      };
      
      return contact;
    } catch (error) {
      logger.error(`Error retrieving contact with ID: ${id} from Firebase`, error);
      throw error;
    }
  }

  private init(): void {
    try {
      // Initialize Firebase Admin SDK
      const app = initializeApp({
        projectId: config.FIREBASE_PROJECT_ID,
        credential: applicationDefault(),
        databaseURL: `https://${config.FIREBASE_PROJECT_ID}.firebaseio.com`,
      });

      // Initialize Firestore with specific database ID
      this.firestore = getFirestore(app);
      // Specify the database ID
      this.firestore = getFirestore(app, FIREBASE_DATABASE_ID);

      // Set credentials if provided via environment variable
      if (process.env.GCLOUD_SERVICE_ACCOUNT_CREDS) {
        const serviceAccountCreds = JSON.parse(process.env.GCLOUD_SERVICE_ACCOUNT_CREDS);
        const authOptions = { credentials: serviceAccountCreds };
        this.firestore.settings(authOptions);
      }

      // Initialize genkit with Firebase
      this.ai = genkit({});

      // Define a custom embedder function that uses the Ollama service
      const customEmbedder = this.ai.defineEmbedder({
        name: 'ollamaEmbedder',
        info: {
          dimensions: 512, // https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1
        }
      }, async (input) => {
        // Check if input is an array of documents
        if (!Array.isArray(input)) {
          throw new Error('Input must be an array of documents');
        }
        
        const embeddings = [];
        
        // Process each document in the input array
        for (const doc of input) {
          // Extract text from the document
          const text = typeof doc === 'string' ? doc : (doc.text || '');
          
          logger.debug('Generating embedding for document', { 
            textLength: text.length,
            embeddingModel: this.embeddingModel 
          });
          
          // Generate embedding for this document
          const embeddingResponse = await ollamaService.generateEmbedding(text);
          
          // Add to embeddings array with the required structure
          embeddings.push({
            embedding: embeddingResponse.embedding,
            metadata: {
              model: this.embeddingModel,
              length: text.length
            }
          });
        }
        
        // Return with the expected structure
        return {
          embeddings: embeddings
        };
      });

      // Define Firestore retriever with the custom embedder
      this.retriever = defineFirestoreRetriever(this.ai, {
        name: 'firebaseRetriever',
        firestore: this.firestore,
        collection: FIREBASE_COLLECTION,
        contentField: CONTENT_FIELD,
        vectorField: VECTOR_FIELD,
        embedder: customEmbedder,
        distanceMeasure: 'COSINE',
      });

      this.isInitialized = true;
      logger.info('Firebase service initialized successfully', {
        projectId: config.FIREBASE_PROJECT_ID,
        database: FIREBASE_DATABASE_ID,
        collection: FIREBASE_COLLECTION,
        embeddingModel: this.embeddingModel
      });
      
      // Test the embedding functionality
      this.testEmbedding();
    } catch (error) {
      logger.error('Failed to initialize Firebase service', error);
      this.isInitialized = false;
    }
  }
  
  /**
   * Test embedding functionality
   */
  private async testEmbedding(): Promise<void> {
    try {
      const testEmbedding = await ollamaService.generateEmbedding("test query");
      logger.info('Embedding test successful!', { 
        dimensions: testEmbedding.embedding.length,
        model: testEmbedding.model
      });
    } catch (error) {
      logger.error('Embedding test failed', error);
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
        database: FIREBASE_DATABASE_ID,
        collection: FIREBASE_COLLECTION,
        empty: snapshot.empty
      });
      
      // Also test the embedding functionality
      await this.testEmbedding();
      
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
      logger.info('Starting PDF ingestion', { 
        filename, 
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP
      });
      const startTime = Date.now();

      // Extract text from PDF
      const data = await pdf(pdfBuffer);
      const pdfText = data.text;
      
      // Using the correct properties according to the SplitOptions type
      const chunks = chunk(pdfText, {
        maxLength: CHUNK_SIZE,   // Maximum length of each chunk
        overlap: CHUNK_OVERLAP,  // Overlap between chunks
        splitter: "paragraph"    // Split by paragraph (or "sentence" if preferred)
      });
      
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
        
        // Log progress for every 10 chunks
        if (addedCount % 10 === 0) {
          logger.info('PDF ingestion progress', {
            chunksProcessed: addedCount,
            totalChunks: chunks.length,
            percentComplete: Math.round((addedCount / chunks.length) * 100)
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('PDF ingestion completed', {
        filename,
        chunksAdded: addedCount,
        duration,
        averageTimePerChunk: duration / addedCount
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
      logger.info('Querying documents with RAG', { 
        query, 
        limit,
        embeddingModel: this.embeddingModel
      });
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
      logger.debug(`Retrieved documents: ${JSON.stringify(docs)}`);

      // Extract text from the nested structure
      const context = docs.map(doc => {
        // Check if content is an array of objects with text property
        if (Array.isArray(doc.content) && doc.content.length > 0 && doc.content[0].text) {
          return doc.content.map((item: { text: string }) => item.text).join(' ');
        }
        // Fallback if structure is different
        return typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content);
      }).join(' '); // Join with space instead of newlines

      logger.debug(`Context created from documents: ${JSON.stringify(context)}`);

      // Generate answer using Ollama - improved prompt similar to Python version
      const prompt = `
      You are the representative of Yao, who is applying for jobs. 
      You will answer questions from a recruiter.
      You are provided with context information from a PDF document about Yao's resume, work experience, and education.
      
      Context information is below:
      ---------------------
      ${context}
      ---------------------
      
      Given the context information and not prior knowledge, answer the question: ${question}
      
      If the answer cannot be determined from the context, say "I don't have enough information to answer that based on the document."
      Answer concisely and accurately in three sentences or less.
      Use pronoun "I" and speak as if you are Yao, the candidate.
      Answer with English if the question is in English, and answer with Chinese if the question is in Chinese.
      `;
      
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