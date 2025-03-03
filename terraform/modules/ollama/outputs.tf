# AI_Avatar/terraform/modules/ollama/outputs.tf

output "url" {
  value = google_cloud_run_service.ollama.status[0].url
  description = "URL of the Ollama service"
}

output "service" {
  value = google_cloud_run_service.ollama
  description = "The Ollama Cloud Run service resource"
}