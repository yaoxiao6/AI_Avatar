// AI_Avatar/node-backend/src/config.js

const flaskUrl = process.env.FLASK_RAG_URL; // For local test, refer to docker-compose.yml for the URL

const config = {
    PYTHON_SERVICE_URL: flaskUrl, // Node Backend will visit this URL for RAG service
    PORT: process.env.PORT || 4000 // Port for the Node.js server exposed to frontend
};

module.exports = config;
