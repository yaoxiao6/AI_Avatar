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

# flask-rag service with Cloud Storage integration
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
            memory = "1024Mi"  # Increased for ChromaDB operations
          }
        }

        env {
          name  = "OLLAMA_BASE_URL"
          value = data.google_cloud_run_service.ollama_rag.status[0].url
        }
        
        env {
          name  = "GCS_BUCKET_NAME"
          value = google_storage_bucket.chroma_db_bucket.name
        }
        
        env {
          name  = "CHROMA_DB_PATH"
          value = "/app/chroma_db"
        }
      }

      timeout_seconds = 900
      
      # Service account for the Cloud Run service
      service_account_name = google_service_account.flask_rag_sa.email
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
  
  # Make sure the bucket is created before the service
  depends_on = [
    google_storage_bucket.chroma_db_bucket
  ]
}

# Create a service account for the Flask RAG service
resource "google_service_account" "flask_rag_sa" {
  account_id   = "flask-rag-sa"
  display_name = "Service Account for Flask RAG"
}

# Grant Storage Object Admin role to the service account
resource "google_storage_bucket_iam_member" "flask_rag_sa_storage_admin" {
  bucket = google_storage_bucket.chroma_db_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.flask_rag_sa.email}"
}

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
          name  = "FLASK_RAG_URL"
          value = google_cloud_run_service.flask_rag.status[0].url
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
