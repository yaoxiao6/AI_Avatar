# AI_Avatar/terraform/modules/node-backend/outputs.tf

output "url" {
  value = google_cloud_run_service.node_backend.status[0].url
  description = "URL of the Node backend service"
}

output "service" {
  value = google_cloud_run_service.node_backend
  description = "The Node backend Cloud Run service resource"
}