# AI_Avatar/terraform/modules/networking/variables.tf

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "domain" {
  description = "Custom domain"
  type        = string
}

variable "ollama_service" {
  description = "The Ollama Cloud Run service resource"
  type        = any
}

variable "flask_rag_service" {
  description = "The Flask RAG Cloud Run service resource"
  type        = any
}

variable "node_backend_service" {
  description = "The Node backend Cloud Run service resource"
  type        = any
}

variable "app_engine_ips" {
  description = "IP addresses for App Engine"
  type        = list(string)
  default     = ["216.239.32.21", "216.239.34.21", "216.239.36.21", "216.239.38.21"]
}