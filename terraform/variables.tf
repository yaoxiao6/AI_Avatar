# variables.tf
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "domain" {
  description = "Custom domain"
  type        = string
  default     = "yaoxiao.org"
}