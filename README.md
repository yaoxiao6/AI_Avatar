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