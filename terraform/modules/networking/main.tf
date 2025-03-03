# AI_Avatar/terraform/modules/networking/main.tf

# Cloud DNS zone with corrected domain format
resource "google_dns_managed_zone" "default" {
  name        = "yaoxiao-zone"
  dns_name    = var.domain
  description = "DNS zone for ${var.domain}"
}

# DNS records for App Engine
resource "google_dns_record_set" "frontend" {
  name         = var.domain
  managed_zone = google_dns_managed_zone.default.name
  type         = "A"
  ttl          = 300
  rrdatas      = var.app_engine_ips
}

# IAM policy to make services public
data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

# Allow public access to Flask RAG
resource "google_cloud_run_service_iam_policy" "flask_rag_noauth" {
  location    = var.flask_rag_service.location
  project     = var.project_id
  service     = var.flask_rag_service.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

# Allow public access to Node Backend
resource "google_cloud_run_service_iam_policy" "node_backend_noauth" {
  location    = var.node_backend_service.location
  project     = var.project_id
  service     = var.node_backend_service.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

# Allow public access to Ollama
resource "google_cloud_run_service_iam_policy" "ollama_noauth" {
  location    = var.ollama_service.location
  project     = var.project_id
  service     = var.ollama_service.name
  policy_data = data.google_iam_policy.noauth.policy_data
}