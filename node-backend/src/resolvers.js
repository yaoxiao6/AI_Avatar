// AI_Avatar/node-backend/src/resolvers.js
const axios = require('axios');
const FormData = require('form-data');
const { PYTHON_SERVICE_URL } = require('./config');
const fs = require('fs');
const { createWriteStream } = require('fs');
const { finished } = require('stream/promises');
const logger = require('./utils/logger');

const resolvers = {
    Query: {
        health: () => {
            logger.info('Health check endpoint called');
            return 'OK';
        },
        pythonServiceHealth: async () => {
            try {
                logger.info(`Checking Python service health at ${PYTHON_SERVICE_URL}`);
                const response = await axios.get(`${PYTHON_SERVICE_URL}`);
                logger.info('Python service health check response:', response.data);
                if (response.data.status === 'healthy') {
                    logger.info('Python service health check successful');
                    return { status: 'healthy' };
                } else {
                    logger.warn('Python service returned unexpected status', response.data);
                    return { status: 'unhealthy' };
                }
            } catch (error) {
                logger.error('Python service health check failed:', {
                    error: error.message,
                    url: PYTHON_SERVICE_URL,
                    config: error.config
                });
                return { status: 'unhealthy' };
            }
        }
    },
    
    Mutation: {
        askQuestion: async (_, { query, k = 5, scoreThreshold = 0.2 }) => {
            logger.info('Processing question');
            const startTime = Date.now();
            try {
                logger.info('Processing question', {
                    query,
                    k,
                    scoreThreshold
                });
        
                logger.debug(`Making request to ${PYTHON_SERVICE_URL}/ask`);
        
                const response = await axios.post(`${PYTHON_SERVICE_URL}/ask`, {
                    query,
                    k,
                    score_threshold: scoreThreshold
                });

                // Extract only the real response by removing the <think>...</think> part
                const responseData = response.data;

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
                
                logger.error('Error processing question', {
                    error: error.message,
                    stack: error.stack,
                    duration,
                    query,
                    response: error.response?.data,
                    status: error.response?.status,
                });
        
                throw new Error(
                    error.response?.data?.message || 
                    error.message || 
                    'Error processing question'
                );
            }
        },
        
        clearVectorStore: async () => {
            const startTime = Date.now();
            try {
                logger.info('Starting vector store clearance');
                
                const response = await axios.post(`${PYTHON_SERVICE_URL}/clear`);
                
                const duration = Date.now() - startTime;
                logger.info('Vector store cleared successfully', {
                    duration,
                    response: response.data
                });

                return response.data;
            } catch (error) {
                const duration = Date.now() - startTime;
                logger.error('Error clearing vector store', {
                    error: error.message,
                    stack: error.stack,
                    duration
                });

                return {
                    status: 'error',
                    message: error.message || 'Error clearing vector store'
                };
            }
        }
    }
};

module.exports = resolvers;