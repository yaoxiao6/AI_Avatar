# AI_Avatar/terraform/main.tf

# Data source to get the URL of the ollama-rag Cloud Run service
data "google_cloud_run_service" "ollama_rag" {
  name     = "ollama-rag"
  location = var.region
}

# Create a storage bucket for ChromaDB persistence
resource "google_storage_bucket" "chroma_db_bucket" {
  name     = "ai-avatar-chroma-db"
  location = var.region
  # Set appropriate storage class
  storage_class = "STANDARD"
  # Enable versioning for data safety
  versioning {
    enabled = true
  }
  # Optional: Set lifecycle rules if needed
  lifecycle_rule {
    condition {
      age = 30  # Days
    }
    action {
      type = "Delete"
    }
  }
}

# We no longer need flask-rag service

# We're using PostgreSQL for contact storage, so GCS bucket is not needed

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
          name  = "OLLAMA_SERVER_ADDRESS"
          value = data.google_cloud_run_service.ollama_rag.status[0].url
        }
        
        env {
          name  = "FIREBASE_PROJECT_ID"
          value = var.project_id
        }
        
        # Add database configuration
        env {
          name  = "DB_HOST"
          value = "cloud-run-postgres-instance"
        }
        
        env {
          name  = "DB_PORT"
          value = "5432"
        }
        
        env {
          name  = "DB_NAME"
          value = "ai_avatar_db"
        }
        
        env {
          name  = "DB_USER"
          value = "ai_avatar_user"
        }
        
        env {
          name  = "DB_PASSWORD"
          value = "HiGcp1004!"  # In production, use secret manager
        }
        
        env {
          name  = "DB_SSL"
          value = "true"
        }
      }
      
      # Service account for the Cloud Run service
      service_account_name = google_service_account.node_backend_sa.email
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
  
  # No specific dependencies needed
}

# Create a service account for the Node.js backend
resource "google_service_account" "node_backend_sa" {
  account_id   = "node-backend-sa"
  display_name = "Service Account for Node Backend"
}

# We're using PostgreSQL for contact storage, no GCP storage IAM needed

# IAM policy to make services public
data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

# We no longer need flask-rag IAM policy

resource "google_cloud_run_service_iam_policy" "node_backend_noauth" {
  location    = var.region
  project     = var.project_id
  service     = google_cloud_run_service.node_backend.name
  policy_data = data.google_iam_policy.noauth.policy_data
  depends_on = [google_cloud_run_service.node_backend]
}
