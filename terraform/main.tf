# AI_Avatar/terraform/main.tf

# Data source to get the URL of the ollama-rag Cloud Run service
data "google_cloud_run_service" "ollama_rag" {
  name     = "ollama-rag"
  location = var.region
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
          value = data.google_cloud_run_service.ollama_rag.status[0].url
        }
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
