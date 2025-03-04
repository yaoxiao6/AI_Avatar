# AI_Avatar/terraform/main.tf

# Ollama service with GPU acceleration
resource "google_cloud_run_service" "ollama" {
  name     = "ollama"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/ollama:latest"

        # Define the port
        ports {
          container_port = 11434
        }

        resources {
          limits = {
            cpu    = "4000m"
            memory = "8Gi"
            # Add GPU configuration with correct syntax
            "nvidia.com/gpu" = 1
          }
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

    metadata {
      annotations = {
        # Specify GPU type - T4 is a good starting point
        "run.googleapis.com/gpu-type" = "nvidia-tesla-t4"
        # Direct VPC egress if you need it
        # "run.googleapis.com/vpc-access-egress" = "all-traffic"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM binding to make the service public
resource "google_cloud_run_service_iam_binding" "ollama_public" {
  location = google_cloud_run_service.ollama.location
  service  = google_cloud_run_service.ollama.name
  role     = "roles/run.invoker"
  members  = [
    "allUsers",
  ]
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
resource "google_dns_managed_zone" "default" {
  name        = "yaoxiao-zone"
  dns_name    = "yaoxiao.org." # Correct format with single dot
  description = "DNS zone for yaoxiao.org."
}

# DNS records for App Engine
resource "google_dns_record_set" "frontend" {
  name         = "yaoxiao.org." # Make sure this matches the dns_name format
  managed_zone = google_dns_managed_zone.default.name
  type         = "A"
  ttl          = 300
  rrdatas      = ["216.239.32.21", "216.239.34.21", "216.239.36.21", "216.239.38.21"] # Google's App Engine IP addresses
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
  location    = google_cloud_run_service.flask_rag.location
  project     = var.project_id
  service     = google_cloud_run_service.flask_rag.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

# Allow public access to Node Backend
resource "google_cloud_run_service_iam_policy" "node_backend_noauth" {
  location    = google_cloud_run_service.node_backend.location
  project     = var.project_id
  service     = google_cloud_run_service.node_backend.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

# Allow public access to Ollama
resource "google_cloud_run_service_iam_policy" "ollama_noauth" {
  location    = google_cloud_run_service.ollama.location
  project     = var.project_id
  service     = google_cloud_run_service.ollama.name
  policy_data = data.google_iam_policy.noauth.policy_data
}
