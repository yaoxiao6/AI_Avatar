# AI_Avatar/terraform/modules/node-backend/variables.tf

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

variable "cpu_limit" {
  description = "CPU limit for the Node backend service"
  type        = string
  default     = "1000m"
}

variable "memory_limit" {
  description = "Memory limit for the Node backend service"
  type        = string
  default     = "512Mi"
}

variable "timeout_seconds" {
  description = "Timeout in seconds for the Node backend service"
  type        = number
  default     = 300
}