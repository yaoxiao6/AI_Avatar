# AI_Avatar/terraform/main.tf

# Module for Ollama service
module "ollama" {
  source     = "./modules/ollama"
  project_id = var.project_id
  region     = var.region
}

# Module for Flask RAG service
module "flask_rag" {
  source       = "./modules/flask-rag"
  project_id   = var.project_id
  region       = var.region
  ollama_url   = module.ollama.url
  depends_on   = [module.ollama]
}

# Module for Node.js backend
module "node_backend" {
  source       = "./modules/node-backend"
  project_id   = var.project_id
  region       = var.region
  flask_rag_url = module.flask_rag.url
  depends_on   = [module.flask_rag]
}

# Module for frontend (App Engine)
module "frontend" {
  source     = "./modules/frontend"
  project_id = var.project_id
  region     = var.region
}

# Module for networking (DNS and IAM)
module "networking" {
  source            = "./modules/networking"
  project_id        = var.project_id
  domain            = var.domain
  ollama_service    = module.ollama.service
  flask_rag_service = module.flask_rag.service
  node_backend_service = module.node_backend.service
  depends_on        = [module.ollama, module.flask_rag, module.node_backend]
}

# Module for event-driven functions
module "functions" {
  source         = "./modules/functions"
  project_id     = var.project_id
  region         = var.region
  flask_rag_url  = module.flask_rag.url
  depends_on     = [module.flask_rag]
}