# AI_Avatar/terraform/modules/flask-rag/outputs.tf

output "url" {
  value = google_cloud_run_service.flask_rag.status[0].url
  description = "URL of the Flask RAG service"
}

output "service" {
  value = google_cloud_run_service.flask_rag
  description = "The Flask RAG Cloud Run service resource"
}