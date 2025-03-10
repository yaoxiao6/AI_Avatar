# AI_Avatar/terraform/main.tf

# Ollama service with GPU acceleration
resource "google_cloud_run_service" "ollama" {
  name     = "ollama"
  location = var.region
  metadata {
    annotations = {
      "run.googleapis.com/launch-stage" = "BETA"
    }
  }
  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale": "1"
        "run.googleapis.com/cpu-throttling": "false"
      }
    }
    spec {
      containers {
        image = "gcr.io/${var.project_id}/ollama:latest"
        resources {
          limits = {
            cpu    = "4"
            memory = "16Gi"
            # Add GPU configuration with correct syntax
            "nvidia.com/gpu" = 1
          }
        }
        # Define the port
        ports {
          container_port = 11434
        }
        # Add startup probe with longer timeouts
        startup_probe {
          tcp_socket {
            port = 11434
          }
          initial_delay_seconds = 10
          period_seconds        = 240
          timeout_seconds       = 10
          failure_threshold     = 5
        }

        # Add environment variables
        env {
          name  = "OLLAMA_HOST"
          value = "0.0.0.0"
        }
      }
      # Increase timeout for model loading
      timeout_seconds = 1200
    }
  }
  traffic {
    percent         = 100
    latest_revision = true
  }
}

# flask-rag service without startup_probe
resource "google_cloud_run_service" "flask_rag" {
  name     = "flask-rag"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/flask-rag:latest"

        # Define the port
        ports {
          container_port = 8080
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }

        env {
          name  = "OLLAMA_BASE_URL"
          value = google_cloud_run_service.ollama.status[0].url
        }

        # startup_probe removed
      }

      timeout_seconds = 900
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
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
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
        env {
          name  = "FLASK_RAG_URL"
          value = google_cloud_run_service.flask_rag.status[0].url
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Cloud DNS zone with corrected domain format
# resource "google_dns_managed_zone" "default" {
#   name        = "yaoxiao-zone"
#   dns_name    = "yaoxiao.org." # Correct format with single dot
#   description = "DNS zone for yaoxiao.org."
# }

# # DNS records for App Engine
# resource "google_dns_record_set" "frontend" {
#   name         = "yaoxiao.org." # Make sure this matches the dns_name format
#   managed_zone = google_dns_managed_zone.default.name
#   type         = "A"
#   ttl          = 300
#   rrdatas      = ["216.239.32.21", "216.239.34.21", "216.239.36.21", "216.239.38.21"] # Google's App Engine IP addresses
# }

# IAM policy to make services public
data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "flask_rag_noauth" {
  location    = var.region
  project     = var.project_id
  service     = google_cloud_run_service.flask_rag.name
  policy_data = data.google_iam_policy.noauth.policy_data
  depends_on = [google_cloud_run_service.flask_rag]
}

resource "google_cloud_run_service_iam_policy" "node_backend_noauth" {
  location    = var.region
  project     = var.project_id
  service     = google_cloud_run_service.node_backend.name
  policy_data = data.google_iam_policy.noauth.policy_data
  depends_on = [google_cloud_run_service.node_backend]
}

resource "google_cloud_run_service_iam_policy" "ollama_noauth" {
  location    = var.region
  project     = var.project_id
  service     = google_cloud_run_service.ollama.name
  policy_data = data.google_iam_policy.noauth.policy_data
  depends_on = [google_cloud_run_service.ollama]
}