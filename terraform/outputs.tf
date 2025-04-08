# AI_Avatar/terraform/outputs.tf

# We no longer need flask_rag_url output

output "node_backend_url" {
  value = google_cloud_run_service.node_backend.status[0].url
}

output "ollama_rag_url" {
  value = data.google_cloud_run_service.ollama_rag.status[0].url
}

output "frontend_url" {
  value = "https://${var.project_id}.appspot.com"
}
