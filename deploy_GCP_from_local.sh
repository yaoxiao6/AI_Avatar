#!/bin/bash
# Deployment script for local Terraform execution

set -e  # Exit on any error

# Configuration variables
PROJECT_ID="ai-avatar-451519"
REGION="us-east1"

echo "🚀 Starting local deployment process..."

# Step 1: Ensure we're authenticated with GCP
echo "Checking GCP authentication..."
gcloud auth print-identity-token > /dev/null 2>&1 || {
  echo "Not authenticated with GCP. Please run: gcloud auth login"
  exit 1
}

# Step 2: Configure Docker to use Google Container Registry
echo "Configuring Docker for GCR..."
gcloud auth configure-docker

# Step 3: Build and push Docker images
echo "Building and pushing Docker images..."

# Flask RAG service
echo "Building Flask RAG service..."
cd flask-rag
docker build -t gcr.io/$PROJECT_ID/flask-rag:latest .
docker push gcr.io/$PROJECT_ID/flask-rag:latest
cd ..

# Node Backend service
echo "Building Node Backend service..."
cd node-backend
docker build -t gcr.io/$PROJECT_ID/node-backend:latest .
docker push gcr.io/$PROJECT_ID/node-backend:latest
cd ..

# Ollama service
echo "Building Ollama service..."
cd ollama-server
docker build -t gcr.io/$PROJECT_ID/ollama:latest .
docker push gcr.io/$PROJECT_ID/ollama:latest
cd ..

# Step 4: Build the Quasar frontend
echo "Building Quasar frontend..."
cd quasar-frontend
npm install
npm run build

# Step 5: Create server.js for App Engine
echo "Creating server.js for App Engine..."
cd dist
cat > server.js << 'EOL'
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'spa')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'spa', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
EOL

# Initialize npm and install express
npm init -y
npm install express

# Create app.yaml
cat > app.yaml << 'EOL'
runtime: nodejs20

handlers:
- url: /.*
  secure: always
  script: auto
EOL

# Step 6: Deploy frontend to App Engine
echo "Deploying frontend to App Engine..."
gcloud app deploy --quiet
cd ../../

# Step 7: Run Terraform
echo "Running Terraform to deploy backend services..."
cd terraform
terraform init
terraform plan
terraform apply -auto-approve

echo "✅ Deployment completed!"
echo "Check the App Engine and Cloud Run services in the Google Cloud Console"