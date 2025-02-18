
// src/resolvers.js
const axios = require('axios');
const FormData = require('form-data');
const { PYTHON_SERVICE_URL } = require('./config');

const resolvers = {
    health: () => {
        console.log('Health check endpoint called');
        return 'OK';
    },

    ingestDocument: async ({ file }) => {
        try {
            console.log('Ingesting document...');
            const { createReadStream, filename } = await file;
            const stream = createReadStream();
            
            const formData = new FormData();
            formData.append('file', stream, filename);

            console.log(`Sending file ${filename} to Python service...`);
            const response = await axios.post(`${PYTHON_SERVICE_URL}/ingest`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });

            console.log('Ingestion response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error during ingestion:', error);
            return {
                status: 'error',
                message: error.message || 'Error during document ingestion'
            };
        }
    },

    askQuestion: async ({ query, k = 5, scoreThreshold = 0.2 }) => {
        try {
            console.log(`Processing question: "${query}"`);
            const response = await axios.post(`${PYTHON_SERVICE_URL}/ask`, {
                query,
                k,
                score_threshold: scoreThreshold
            });

            console.log('Question response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error during question:', error);
            return {
                status: 'error',
                message: error.message || 'Error processing question'
            };
        }
    },

    clearVectorStore: async () => {
        try {
            console.log('Clearing vector store...');
            const response = await axios.post(`${PYTHON_SERVICE_URL}/clear`);
            console.log('Clear response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error clearing vector store:', error);
            return {
                status: 'error',
                message: error.message || 'Error clearing vector store'
            };
        }
    }
};

module.exports = resolvers;
