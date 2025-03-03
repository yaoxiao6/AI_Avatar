# AI_Avatar/terraform/modules/functions/variables.tf

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "flask_rag_url" {
  description = "URL of the Flask RAG service"
  type        = string
}