# AI_Avatar/terraform/outputs.tf

output "flask_rag_url" {
  value = google_cloud_run_service.flask_rag.status[0].url
}

output "node_backend_url" {
  value = google_cloud_run_service.node_backend.status[0].url
}

output "ollama_url" {
  value = google_cloud_run_service.ollama.status[0].url
}

output "frontend_url" {
  value = "https://${var.project_id}.appspot.com"
}

output "postgres_instance_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "postgres_instance_public_ip" {
  value = google_sql_database_instance.postgres.public_ip_address
}

output "database_name" {
  value = google_sql_database.database.name
}

output "database_user" {
  value = google_sql_user.user.name
}