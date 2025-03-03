# AI_Avatar/terraform/modules/frontend/main.tf

resource "google_app_engine_application" "app" {
  project     = var.project_id
  location_id = var.region
}