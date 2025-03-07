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

# IAM binding to make the service public
resource "google_cloud_run_service_iam_binding" "ollama_public" {
  location = google_cloud_run_service.ollama.location
  service  = google_cloud_run_service.ollama.name
  role     = "roles/run.invoker"
  members = [
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
  location    = var.region
  project     = var.project_id
  service     = google_cloud_run_service.flask_rag.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

# Allow public access to Node Backend
resource "google_cloud_run_service_iam_policy" "node_backend_noauth" {
  location    = var.region
  project     = var.project_id
  service     = google_cloud_run_service.node_backend.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

# Allow public access to Ollama
resource "google_cloud_run_service_iam_policy" "ollama_noauth" {
  location    = var.region
  project     = var.project_id
  service     = google_cloud_run_service.ollama.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "postgres" {
  name             = "postgres-instance"
  database_version = "POSTGRES_14"
  region           = var.region
  
  settings {
    tier = "db-f1-micro"  # Smallest tier for development, adjust as needed
    
    ip_configuration {
      ipv4_enabled    = true
      private_network = null  # For simplicity using public IP, consider using VPC for production
    }

    backup_configuration {
      enabled = true
      start_time = "02:00"  # 2 AM UTC
    }
  }

  deletion_protection = false  # Set to true for production
}

# Create a database
resource "google_sql_database" "database" {
  name     = "contactdb"
  instance = google_sql_database_instance.postgres.name
}

# Create a user
resource "google_sql_user" "user" {
  name     = "app-user"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password  # Use a variable for password
}

# Create a service account for Cloud SQL Auth Proxy
resource "google_service_account" "cloudsql_proxy" {
  account_id   = "cloudsql-proxy"
  display_name = "Cloud SQL Auth Proxy Service Account"
}

# Grant the service account access to Cloud SQL
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudsql_proxy.email}"
}

# Update the node_backend service to use Cloud SQL Auth Proxy
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
        
        # Database connection environment variables
        env {
          name  = "DB_HOST"
          value = "/cloudsql/${google_sql_database_instance.postgres.connection_name}"
        }
        
        env {
          name  = "DB_NAME"
          value = google_sql_database.database.name
        }
        
        env {
          name  = "DB_USER"
          value = google_sql_user.user.name
        }
        
        env {
          name = "DB_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_password.secret_id
              key  = "latest"
            }
          }
        }
      }
      
      # Cloud SQL Auth Proxy sidecar
      containers {
        image = "gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.1.0"
        
        args = [
          "--structured-logs",
          "--port=5432",
          "${google_sql_database_instance.postgres.connection_name}"
        ]
        
        # Resource limits for the proxy
        resources {
          limits = {
            cpu    = "500m"
            memory = "256Mi"
          }
        }
      }
      
      # Service account for Cloud SQL Auth Proxy
      service_account_name = google_service_account.cloudsql_proxy.email
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Secret for database password
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"
  
  replication {
    automatic = true
  }
}

# Set the secret value
resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

# Grant the node_backend service account access to the secret
resource "google_secret_manager_secret_iam_member" "db_password_accessor" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudsql_proxy.email}"
}

# SQL script to create the contact table
resource "null_resource" "create_table" {
  depends_on = [google_sql_database.database]

  provisioner "local-exec" {
    command = <<-EOT
      echo "
      CREATE TABLE IF NOT EXISTS contact (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        telephone VARCHAR(50),
        message TEXT,
        date_time_of_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      " > create_table.sql
      
      gcloud sql import sql ${google_sql_database_instance.postgres.name} \
        create_table.sql \
        --database=${google_sql_database.database.name} \
        --project=${var.project_id}
      
      rm create_table.sql
    EOT
  }
}
