# AI_Avatar/terraform/modules/frontend/main.tf

# Note: We're assuming App Engine already exists and is managed outside Terraform
# If you need to create it, uncomment the following:

# resource "google_app_engine_application" "app" {
#   project     = var.project_id
#   location_id = var.region
# }

# Instead, we'll just create a data source to reference the existing App Engine app
data "google_app_engine_application" "app" {
  count = var.app_engine_exists ? 1 : 0
}