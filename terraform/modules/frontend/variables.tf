# AI_Avatar/terraform/modules/frontend/variables.tf

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "app_engine_exists" {
  description = "Whether the App Engine application already exists"
  type        = bool
  default     = true
}