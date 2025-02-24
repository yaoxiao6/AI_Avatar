# main.tf
# Cloud Run service for Flask RAG
resource "google_cloud_run_service" "flask_rag" {
  name     = "flask-rag"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/flask-rag:latest"
      }
    }
  }
}

# Cloud Run service for Node.js backend
resource "google_cloud_run_service" "node_backend" {
  name     = "node-backend"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/node-backend:latest"
      }
    }
  }
}

# Cloud Run service for Ollama
resource "google_cloud_run_service" "ollama" {
  name     = "ollama"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/ollama:latest"
      }
    }
  }
}

# Firebase Hosting for frontend
resource "google_firebase_hosting_site" "default" {
  project = var.project_id
  site_id = var.domain
}

# Cloud DNS zone
resource "google_dns_managed_zone" "default" {
  name        = "yaoxiao-zone"
  dns_name    = "${var.domain}."
  description = "DNS zone for yaoxiao.org"
}

# DNS records
resource "google_dns_record_set" "frontend" {
  name         = var.domain
  managed_zone = google_dns_managed_zone.default.name
  type         = "A"
  ttl          = 300
  rrdatas      = [google_firebase_hosting_site.default.default_url]
}