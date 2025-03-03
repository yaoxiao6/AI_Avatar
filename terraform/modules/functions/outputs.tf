# AI_Avatar/terraform/modules/functions/outputs.tf

output "function_name" {
  value       = google_cloudfunctions2_function.ingest_pdf.name
  description = "The name of the deployed Cloud Function"
}

output "function_uri" {
  value       = google_cloudfunctions2_function.ingest_pdf.service_config[0].uri
  description = "The URI of the deployed Cloud Function"
}

output "pdf_bucket_name" {
  value       = google_storage_bucket.pdf_bucket.name
  description = "The name of the bucket for PDF uploads"
}