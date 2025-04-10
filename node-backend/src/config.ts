// AI_Avatar/node-backend/src/config.ts
import { AppConfig } from './types';

const flaskUrl = process.env.FLASK_RAG_URL; // For local test, refer to docker-compose.yml for the URL

const config: AppConfig = {
    PYTHON_SERVICE_URL: flaskUrl, // Node Backend will visit this URL for RAG service
    PORT: parseInt(process.env.PORT || '4000', 10), // Port for the Node.js server exposed to frontend
    
    // Database configuration
    DB_HOST: process.env.DB_HOST || 'cloud-run-postgres-instance',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_NAME: process.env.DB_NAME || 'ai_avatar_db',
    DB_USER: process.env.DB_USER || 'ai_avatar_user',
    DB_PASSWORD: process.env.DB_PASSWORD || 'HiGcp1004!',
    DB_SSL: process.env.DB_SSL || 'false',
    
    // Ollama configuration
    OLLAMA_SERVER_ADDRESS: process.env.OLLAMA_SERVER_ADDRESS || 'https://ollama-rag-579795762739.us-central1.run.app',
    OLLAMA_API_KEY: process.env.OLLAMA_API_KEY,
    
    // Firebase configuration
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'ai-avatar-451519',
    FIREBASE_DATABASE_ID: process.env.FIREBASE_DATABASE_ID || 'rag-embedded-pdf',

    // Log level
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

export default config;