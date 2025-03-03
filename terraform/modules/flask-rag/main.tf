# AI_Avatar/terraform/modules/flask-rag/main.tf

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
            cpu    = var.cpu_limit
            memory = var.memory_limit
          }
        }

        env {
          name  = "OLLAMA_BASE_URL"
          value = var.ollama_url
        }
      }

      timeout_seconds = var.timeout_seconds
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}