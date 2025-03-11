# AI_Avatar/terraform/main.tf

# Create a GKE cluster for Ollama
resource "google_container_cluster" "ollama_cluster" {
  name     = "ollama-cluster"
  location = var.region

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  # Network configuration
  network    = "default"
  subnetwork = "default"
}

# Create a node pool with GPU for Ollama
resource "google_container_node_pool" "ollama_nodes" {
  name       = "ollama-node-pool"
  location   = var.region
  cluster    = google_container_cluster.ollama_cluster.name
  node_count = 1  # Starting with 1 node

  # Node configuration
  node_config {
    machine_type = "n1-standard-4"  # 4 vCPUs, 15GB RAM
    
    # Reduce disk size to fit within quota
    disk_size_gb = 100
    disk_type    = "pd-standard"  # Use standard persistent disk instead of SSD

    # GPU configuration
    guest_accelerator {
      type  = "nvidia-l4"
      count = 1
    }

    # Enable required OAuth scopes for the node
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Add labels to the nodes
    labels = {
      app = "ollama"
    }

    # Add service account for node
    service_account = "default"
  }

  # Install GPU drivers automatically
  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Kubernetes provider to deploy Ollama to GKE
provider "kubernetes" {
  host                   = "https://${google_container_cluster.ollama_cluster.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.ollama_cluster.master_auth.0.cluster_ca_certificate)
}

data "google_client_config" "default" {}

# Kubernetes Deployment for Ollama
resource "kubernetes_deployment" "ollama" {
  metadata {
    name = "ollama"
    labels = {
      app = "ollama"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "ollama"
      }
    }

    template {
      metadata {
        labels = {
          app = "ollama"
        }
      }

      spec {
        container {
          image = "gcr.io/${var.project_id}/ollama:latest"
          name  = "ollama"

          # Resource limits and requests
          resources {
            limits = {
              cpu    = "4"
              memory = "16Gi"
              "nvidia.com/gpu" = 1
            }
            requests = {
              cpu    = "2"
              memory = "8Gi"
            }
          }

          # Container port
          port {
            container_port = 11434
          }

          # Environment variables
          env {
            name  = "OLLAMA_HOST"
            value = "0.0.0.0"
          }

          # Volume mounts for model persistence
          volume_mount {
            name       = "ollama-models"
            mount_path = "/root/.ollama"
          }

          # Liveness probe - checks if service is responsive
          liveness_probe {
            http_get {
              path = "/api/tags"
              port = 11434
            }
            initial_delay_seconds = 300  # Allow time for initial model loading
            period_seconds        = 60   # Check every minute
            timeout_seconds       = 10
            failure_threshold     = 3    # Three failures trigger a restart
          }

          # Readiness probe - ensures service is ready to accept traffic
          readiness_probe {
            http_get {
              path = "/api/tags"
              port = 11434
            }
            initial_delay_seconds = 60   # Start checking earlier than liveness
            period_seconds        = 30
            timeout_seconds       = 10
            failure_threshold     = 5    # More tolerant for readiness
            success_threshold     = 1    # One success is enough to be ready
          }
        }

        # Node selector to ensure pods are scheduled on GPU nodes
        node_selector = {
          "cloud.google.com/gke-accelerator" = "nvidia-tesla-t4"
        }

        # Volume for model persistence
        volume {
          name = "ollama-models"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.ollama_models.metadata.0.name
          }
        }
      }
    }
  }

  depends_on = [
    google_container_node_pool.ollama_nodes,
    kubernetes_persistent_volume_claim.ollama_models
  ]
}

# Persistent Volume Claim for Ollama models
resource "kubernetes_persistent_volume_claim" "ollama_models" {
  metadata {
    name = "ollama-models-pvc"
  }
  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "20Gi" # Storage size for models
      }
    }
    storage_class_name = "standard"
  }
}

# Kubernetes Service for Ollama
resource "kubernetes_service" "ollama" {
  metadata {
    name = "ollama-service"
  }
  spec {
    selector = {
      app = kubernetes_deployment.ollama.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 11434
    }
    type = "LoadBalancer"
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
          value = "http://${kubernetes_service.ollama.status.0.load_balancer.0.ingress.0.ip}"
        }
      }

      timeout_seconds = 900
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [kubernetes_service.ollama]
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