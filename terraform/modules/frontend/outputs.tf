# AI_Avatar/terraform/modules/frontend/outputs.tf

output "url" {
  value = "https://${var.project_id}.appspot.com"
  description = "URL of the frontend application"
}