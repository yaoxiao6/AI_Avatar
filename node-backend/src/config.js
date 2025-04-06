// AI_Avatar/node-backend/src/config.js

const flaskUrl = process.env.FLASK_RAG_URL; // For local test, refer to docker-compose.yml for the URL

const config = {
    PYTHON_SERVICE_URL: flaskUrl, // Node Backend will visit this URL for RAG service
    PORT: process.env.PORT || 4000, // Port for the Node.js server exposed to frontend
    
    // Database configuration
    DB_HOST: process.env.DB_HOST || 'cloud-run-postgres-instance',
    DB_PORT: process.env.DB_PORT || 5432,
    DB_NAME: process.env.DB_NAME || 'ai_avatar_db',
    DB_USER: process.env.DB_USER || 'ai_avatar_user',
    DB_PASSWORD: process.env.DB_PASSWORD || 'HiGcp1004!',
    DB_SSL: process.env.DB_SSL || 'false'
};

module.exports = config;
