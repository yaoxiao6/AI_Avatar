// src/resolvers.js
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
        
                const duration = Date.now() - startTime;
                logger.info('Question processing completed', {
                    query,
                    duration,
                    responseStatus: response.data.status
                });
        
                return response.data;
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