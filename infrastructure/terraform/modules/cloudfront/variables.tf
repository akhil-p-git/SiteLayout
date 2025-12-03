# CloudFront Module Variables

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "s3_bucket_id" {
  description = "S3 bucket ID for origin"
  type        = string
}

variable "s3_bucket_arn" {
  description = "S3 bucket ARN"
  type        = string
}

variable "s3_bucket_domain" {
  description = "S3 bucket regional domain name"
  type        = string
}

variable "alb_dns_name" {
  description = "ALB DNS name for API origin"
  type        = string
  default     = ""
}
