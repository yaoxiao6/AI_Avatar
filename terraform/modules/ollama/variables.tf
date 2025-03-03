# AI_Avatar/terraform/modules/ollama/variables.tf

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "cpu_limit" {
  description = "CPU limit for the Ollama service"
  type        = string
  default     = "2000m"
}

variable "memory_limit" {
  description = "Memory limit for the Ollama service"
  type        = string
  default     = "4Gi"
}

variable "timeout_seconds" {
  description = "Timeout in seconds for the Ollama service"
  type        = number
  default     = 900
}