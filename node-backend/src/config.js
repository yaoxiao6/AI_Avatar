// src/config.js

const flaskUrl = process.env.FLASK_RAG_URL || 'http://localhost:5001';

const config = {
    PYTHON_SERVICE_URL: flaskUrl,
    PORT: process.env.PORT || 4000
};

module.exports = config;
