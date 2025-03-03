# Create a Cloud Storage bucket for PDF storage
resource "google_storage_bucket" "pdf_storage" {
  name                        = "${var.project_id}-storage"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true  # Be careful with this in production

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  # Create the pdfs/ folder structure
  provisioner "local-exec" {
    command = "gsutil cp /dev/null gs://${var.project_id}-storage/pdfs/"
  }
}

# IAM binding for the service account to access the bucket
resource "google_storage_bucket_iam_binding" "pdf_storage_binding" {
  bucket = google_storage_bucket.pdf_storage.name
  role   = "roles/storage.objectAdmin"
  members = [
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com",
  ]
}

# Output the bucket name
output "pdf_storage_bucket" {
  value = google_storage_bucket.pdf_storage.name
}