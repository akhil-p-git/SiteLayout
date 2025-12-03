# S3 Module Variables

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "bucket_suffix" {
  description = "Suffix for bucket name"
  type        = string
  default     = ""
}

variable "enable_versioning" {
  description = "Enable bucket versioning"
  type        = bool
  default     = true
}

variable "enable_website" {
  description = "Enable static website hosting"
  type        = bool
  default     = false
}

variable "enable_lifecycle" {
  description = "Enable lifecycle rules"
  type        = bool
  default     = true
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["*"]
}
