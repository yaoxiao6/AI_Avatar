# AI_Avatar

## Local testing 
Step 1: Launch ollama
```bash
ollama serve

# first time 
ollama pull mxbai-embed-large
ollama pull deepseek-r1:1.5b

# Test if Ollama is responding, expecting mxbai-embed-large:latest and deepseek-r1:1.5b both working
ollama list
```

Step 2: Launch Flask for RAG
Go to `AI_Avatar/flask-rag`
```bash
python app.py
```
It runs on port `5001`

Step 3: Launch Node Backend 
Go to `AI_Avatar/node-backend`
```bash
npm run dev
```
It runs on port `4000`

Step 4: Launch Quasar Frontend
Go to `AI_Avatar/quasar-frontend/AI-Avatar-Frontend`
```bash
quasar dev
```
It runs on port `9000`

## Docker Testing 

Build image / Rebuild image and Launch the container: 
```
docker-compose up --build
```

Turn down the container and remove all image:
```
docker-compose down --rmi all
```

## Deploy / Re-deploy to GCP from local terminal 
1. Turn on the Docker software
2. `sh ./deploy_GCP_from_local.sh`

## Deploy Ollama server onto GKE. 
Since the Ollama is consistent and hardly udpate, we will deploy via YAML and terminal manually. Not Terraform (which update each time with changes on backend code). 

Before deploy, make sure you installed `gcloud` and `kubectl`
```
# Install gcloud CLI if you haven't already
curl https://sdk.cloud.google.com | bash
gcloud init

# Install kubectl
gcloud components install kubectl
```

Assume ollama Docker image is stored in Google Container Registry (GCR)

Then, we do 
```
cd terraform/k8s/

# Create a GKE cluster
gcloud container clusters create ollama-cluster \
  --num-nodes=1 \
  --machine-type=e2-standard-8 \
  --disk-size=30

gcloud container clusters get-credentials ollama-cluster

kubectl apply -f ollama-deployment.yaml
```

Finally, we wait a while and validate deployment
```
# Check deployment status
kubectl get deployments

# Check pod status
kubectl get pods

# Check service (this will show your external IP)
kubectl get services ollama-service
```

