# Cloud Function to process PDF files
resource "google_cloudfunctions2_function" "ingest_pdf_function" {
  name        = "ingest-pdf"
  location    = var.region
  description = "Function to process PDF files and send them to the RAG service"

  build_config {
    runtime     = "python310"
    entry_point = "process_pdf"
    source {
      storage_source {
        bucket = "${var.project_id}-source-code"
        object = "function-source.zip"
      }
    }
  }

  service_config {
    max_instance_count = 10
    min_instance_count = 0
    available_memory   = "256Mi"
    timeout_seconds    = 540
    environment_variables = {
      API_ENDPOINT = google_cloud_run_service.flask_rag.status[0].url
      PDF_FOLDER   = "pdfs/"
    }
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.storage.object.v1.finalized"
    event_filters {
      attribute = "bucket"
      value     = google_storage_bucket.pdf_storage.name
    }
  }

  depends_on = [
    google_cloud_run_service.flask_rag,
    google_storage_bucket.pdf_storage
  ]
}

# Source code bucket for Cloud Functions
resource "google_storage_bucket" "function_source" {
  name                        = "${var.project_id}-source-code"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true
}

# Output the function URL
output "ingest_pdf_function_url" {
  value = google_cloudfunctions2_function.ingest_pdf_function.service_config[0].uri
}