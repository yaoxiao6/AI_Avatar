// AI_Avatar/node-backend/src/resolvers.ts
import axios, { AxiosError, AxiosResponse } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { createWriteStream } from 'fs';
import { finished } from 'stream/promises';
import config from './config';
import logger from './utils/logger';
import db from './utils/db';
import { 
  AskResponse, 
  ClearResponse, 
  Contact, 
  ContactInput, 
  ContactResponse, 
  Context, 
  PythonHealthResponse 
} from './types';

interface AskQuestionArgs {
  query: string;
  k?: number;
  scoreThreshold?: number;
}

interface SubmitContactArgs {
  input: ContactInput;
}

interface GetContactArgs {
  id: string;
}

const resolvers = {
  Query: {
    health: (): string => {
      logger.info('Health check endpoint called');
      return 'OK';
    },
    
    pythonServiceHealth: async (): Promise<PythonHealthResponse> => {
      try {
        logger.info(`Checking Python service health at ${config.PYTHON_SERVICE_URL}`);
        const response: AxiosResponse = await axios.get(`${config.PYTHON_SERVICE_URL}`);
        logger.info('Python service health check response:', response.data);
        
        if (response.data.status === 'healthy') {
          logger.info('Python service health check successful');
          return { status: 'healthy' };
        } else {
          logger.warn('Python service returned unexpected status', response.data);
          return { status: 'unhealthy' };
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        logger.error('Python service health check failed:', {
          error: axiosError.message,
          url: config.PYTHON_SERVICE_URL,
          config: axiosError.config
        });
        return { status: 'unhealthy' };
      }
    },
    
    getContacts: async (): Promise<Contact[]> => {
      try {
        logger.info('Fetching all contacts');
        const contacts: Contact[] = await db.getContacts();
        logger.info(`Retrieved ${contacts.length} contacts`);
        return contacts;
      } catch (error) {
        const err = error as Error;
        logger.error('Error retrieving contacts', {
          error: err.message,
          stack: err.stack
        });
        throw new Error('Failed to retrieve contacts');
      }
    },
    
    getContact: async (_: any, { id }: GetContactArgs): Promise<Contact> => {
      try {
        logger.info(`Fetching contact with ID: ${id}`);
        const contact = await db.getContactById(id);
        
        if (!contact) {
          logger.warn(`No contact found with ID: ${id}`);
          throw new Error(`Contact with ID ${id} not found`);
        }
        
        return contact;
      } catch (error) {
        const err = error as Error;
        logger.error(`Error retrieving contact with ID: ${id}`, {
          error: err.message,
          stack: err.stack
        });
        throw new Error('Failed to retrieve contact');
      }
    }
  },
  
  Mutation: {
    askQuestion: async (_: any, { query, k = 5, scoreThreshold = 0.2 }: AskQuestionArgs): Promise<AskResponse> => {
      logger.info('Processing question');
      const startTime = Date.now();
      
      try {
        logger.info('Processing question', {
          query,
          k,
          scoreThreshold
        });
    
        logger.debug(`Making request to ${config.PYTHON_SERVICE_URL}/ask`);
    
        const response: AxiosResponse = await axios.post(`${config.PYTHON_SERVICE_URL}/ask`, {
          query,
          k,
          score_threshold: scoreThreshold
        });

        // Extract only the real response by removing the <think>...</think> part
        const responseData = response.data as AskResponse;

        console.log('Before cleaning Response answer:', responseData.answer);

        // Clean the answer field if it contains <think> tags
        if (responseData.answer && typeof responseData.answer === 'string' && responseData.answer.includes('<think>')) {
          // Use regex to remove everything between and including <think></think> tags
          responseData.answer = responseData.answer.replace(/<think>[\s\S]*?<\/think>\s*/, '');
          
          // Trim any leading/trailing whitespace
          responseData.answer = responseData.answer.trim();
        }

        console.log('After cleaning Response answer:', responseData.answer);

        const duration = Date.now() - startTime;
        logger.info('Question processing completed', {
          query,
          duration,
          responseStatus: response.data.status
        });

        return responseData;
      } catch (error) {
        const duration = Date.now() - startTime;
        const axiosError = error as AxiosError;
        
        logger.error('Error processing question', {
          error: axiosError.message,
          stack: axiosError.stack,
          duration,
          query,
          response: axiosError.response?.data,
          status: axiosError.response?.status,
        });
    
        throw new Error(
          (axiosError.response?.data as any)?.message || 
          axiosError.message || 
          'Error processing question'
        );
      }
    },
    
    clearVectorStore: async (): Promise<ClearResponse> => {
      const startTime = Date.now();
      try {
        logger.info('Starting vector store clearance');
        
        const response: AxiosResponse = await axios.post(`${config.PYTHON_SERVICE_URL}/clear`);
        
        const duration = Date.now() - startTime;
        logger.info('Vector store cleared successfully', {
          duration,
          response: response.data
        });

        return response.data as ClearResponse;
      } catch (error) {
        const err = error as Error;
        const duration = Date.now() - startTime;
        logger.error('Error clearing vector store', {
          error: err.message,
          stack: err.stack,
          duration
        });

        return {
          status: 'error',
          message: err.message || 'Error clearing vector store'
        };
      }
    },
    
    submitContact: async (_: any, { input }: SubmitContactArgs): Promise<ContactResponse> => {
      const startTime = Date.now();
      try {
        logger.info('Processing contact form submission', {
          name: input.name,
          email: input.email
        });
        
        // Save contact to PostgreSQL database
        const savedContact = await db.saveContact(input);
        
        const duration = Date.now() - startTime;
        logger.info('Contact form submission saved successfully to database', {
          name: input.name,
          email: input.email,
          id: savedContact.id,
          duration
        });
        
        // You could also send an email notification here
        // or integrate with a CRM system
        
        return {
          status: 'success',
          message: 'Contact form submitted successfully'
        };
      } catch (error) {
        const err = error as Error;
        const duration = Date.now() - startTime;
        logger.error('Error processing contact form', {
          error: err.message,
          stack: err.stack,
          duration,
          input
        });
        
        return {
          status: 'error',
          message: err.message || 'Error processing contact form'
        };
      }
    }
  }
};

export default resolvers;