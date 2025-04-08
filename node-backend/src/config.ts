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
    DB_SSL: process.env.DB_SSL || 'false'
};

export default config;