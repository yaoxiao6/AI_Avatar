# AI_Avatar/terraform/outputs.tf

output "flask_rag_url" {
  value = module.flask_rag.url
  description = "URL of the Flask RAG service"
}

output "node_backend_url" {
  value = module.node_backend.url
  description = "URL of the Node.js backend service"
}

output "ollama_url" {
  value = module.ollama.url
  description = "URL of the Ollama service"
}

output "frontend_url" {
  value = module.frontend.url
  description = "URL of the frontend application"
}

output "pdf_upload_bucket" {
  value = module.functions.pdf_bucket_name
  description = "Bucket name for PDF uploads to trigger the function"
}