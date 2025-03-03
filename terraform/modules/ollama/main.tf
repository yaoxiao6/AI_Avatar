# AI_Avatar/terraform/modules/ollama/main.tf

resource "google_cloud_run_service" "ollama" {
  name     = "ollama"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/ollama:latest"

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
      }

      timeout_seconds = var.timeout_seconds
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}