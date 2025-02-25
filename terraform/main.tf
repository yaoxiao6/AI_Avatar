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

# App Engine application for frontend
resource "google_app_engine_application" "app" {
  project     = var.project_id
  location_id = var.region
}

# App Engine standard environment for the frontend
resource "google_app_engine_standard_app_version" "frontend" {
  version_id = "v1"
  service    = "default"
  runtime    = "nodejs14"

  deployment {
    zip {
      source_url = "https://storage.googleapis.com/${var.project_id}-appengine/frontend.zip"
    }
  }

  entrypoint {
    shell = "node server.js"
  }

  depends_on = [google_app_engine_application.app]
}

# Cloud DNS zone
resource "google_dns_managed_zone" "default" {
  name        = "yaoxiao-zone"
  dns_name    = "${var.domain}."
  description = "DNS zone for yaoxiao.org."
}

# DNS records for App Engine
resource "google_dns_record_set" "frontend" {
  name         = var.domain
  managed_zone = google_dns_managed_zone.default.name
  type         = "A"
  ttl          = 300
  rrdatas      = ["216.239.32.21", "216.239.34.21", "216.239.36.21", "216.239.38.21"]  # Google's App Engine IP addresses
}
