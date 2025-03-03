# AI_Avatar/terraform/modules/flask-rag/variables.tf

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "ollama_url" {
  description = "URL of the Ollama service"
  type        = string
}

variable "cpu_limit" {
  description = "CPU limit for the Flask RAG service"
  type        = string
  default     = "1000m"
}

variable "memory_limit" {
  description = "Memory limit for the Flask RAG service"
  type        = string
  default     = "512Mi"
}

variable "timeout_seconds" {
  description = "Timeout in seconds for the Flask RAG service"
  type        = number
  default     = 900
}