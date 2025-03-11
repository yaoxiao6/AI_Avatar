# AI_Avatar/terraform/outputs.tf

output "flask_rag_url" {
  value = google_cloud_run_service.flask_rag.status[0].url
}

output "node_backend_url" {
  value = google_cloud_run_service.node_backend.status[0].url
}

output "ollama_external_ip" {
  value = data.kubernetes_service.ollama.status.0.load_balancer.0.ingress.0.ip
}

output "frontend_url" {
  value = "https://${var.project_id}.appspot.com"
}