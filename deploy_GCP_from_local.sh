#!/bin/bash
# Complete deployment script using taint approach

set -e  # Exit on any error

# Configuration variables
PROJECT_ID="ai-avatar-451519"
REGION="us-central1"

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

# Step 3: Build and push Docker images with correct platform
echo "Building and pushing Docker images..."

# Flask RAG service has been removed

# Node Backend service
echo "Building Node Backend service..."
cd node-backend
docker build --platform linux/amd64 -t gcr.io/$PROJECT_ID/node-backend:latest .
docker push gcr.io/$PROJECT_ID/node-backend:latest
cd ..

# Ollama service
echo "Building Ollama service..."
cd ollama-server
docker build --platform linux/amd64 -t gcr.io/$PROJECT_ID/ollama:latest .
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

# Create app.yaml with up-to-date Node.js runtime
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

# Step 7: Terraform operations
echo "Running Terraform operations..."
cd terraform

# Initialize Terraform
echo "Initializing Terraform..."
terraform init

# Handle the App Engine application in state
echo "Handling App Engine application in state..."
terraform state list | grep -q "google_app_engine_application.app" && terraform state rm google_app_engine_application.app

# Taint Cloud Run services to force recreation
echo "Tainting Cloud Run services..."
terraform taint google_cloud_run_service.node_backend || true
terraform taint google_cloud_run_service.ollama || true

# Run plan to see what will be changed
echo "Planning changes..."
terraform plan

# Apply the changes
echo "Applying changes..."
terraform apply -auto-approve

echo "✅ Deployment completed!"
echo "Check the App Engine and Cloud Run services in the Google Cloud Console"