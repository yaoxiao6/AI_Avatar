// src/config.js

const flaskHost = process.env.FLASK_RAG_HOST || 'localhost';
const flaskPort = process.env.FLASK_RAG_PORT || '5001';
const flaskUrl = `http://${flaskHost}:${flaskPort}`;

const config = {
    PYTHON_SERVICE_URL: flaskUrl,
    PORT: process.env.PORT || 4000
};

module.exports = config;
