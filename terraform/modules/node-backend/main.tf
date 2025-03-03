# AI_Avatar/terraform/modules/node-backend/main.tf

resource "google_cloud_run_service" "node_backend" {
  name     = "node-backend"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/node-backend:latest"
        
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
          name  = "FLASK_RAG_URL"
          value = var.flask_rag_url
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