# AI_Avatar/terraform/variables.tf

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "ai-avatar-451519"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "domain" {
  description = "Custom domain"
  type        = string
  default     = "yaoxiao.org."
}