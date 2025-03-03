# AI_Avatar/terraform/modules/functions/main.tf

# Create a Cloud Storage bucket for the function source code
resource "google_storage_bucket" "function_bucket" {
  name     = "${var.project_id}-function-source"
  location = var.region
  uniform_bucket_level_access = true
}

# Create a bucket for PDF uploads to trigger the function
resource "google_storage_bucket" "pdf_bucket" {
  name     = "${var.project_id}-pdf-uploads"
  location = var.region
  uniform_bucket_level_access = true
}

# ZIP the function source code
data "archive_file" "function_source" {
  type        = "zip"
  source_dir  = "${path.module}/../../../event-driven-functions"
  output_path = "${path.module}/../../../event-driven-functions.zip"
}

# Upload the source code to the bucket
resource "google_storage_bucket_object" "function_source" {
  name   = "function-source-${data.archive_file.function_source.output_md5}.zip"
  bucket = google_storage_bucket.function_bucket.name
  source = data.archive_file.function_source.output_path
}

# Create the Cloud Function
resource "google_cloudfunctions2_function" "ingest_pdf" {
  name     = "ingest-pdf"
  location = var.region
  
  build_config {
    runtime     = "python310"
    entry_point = "process_pdf"
    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count = 10
    min_instance_count = 0
    available_memory   = "256M"
    timeout_seconds    = 60
    environment_variables = {
      PDF_FOLDER     = "pdfs/"
      API_ENDPOINT   = var.flask_rag_url
    }
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.storage.object.v1.finalized"
    event_filters {
      attribute = "bucket"
      value     = google_storage_bucket.pdf_bucket.name
    }
  }
}