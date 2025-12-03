# ECS Module Variables

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "ECS security group ID"
  type        = string
}

variable "target_group_arn" {
  description = "ALB target group ARN"
  type        = string
}

variable "container_image" {
  description = "Container image"
  type        = string
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 3001
}

variable "api_cpu" {
  description = "API task CPU"
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "API task memory"
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "API desired task count"
  type        = number
  default     = 1
}

variable "api_min_count" {
  description = "API minimum task count"
  type        = number
  default     = 1
}

variable "api_max_count" {
  description = "API maximum task count"
  type        = number
  default     = 4
}

variable "db_secret_arn" {
  description = "Database credentials secret ARN"
  type        = string
}

variable "redis_url" {
  description = "Redis connection URL"
  type        = string
}

variable "s3_bucket_name" {
  description = "S3 bucket name for storage"
  type        = string
}

variable "s3_bucket_arn" {
  description = "S3 bucket ARN"
  type        = string
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
}

variable "frontend_url" {
  description = "Frontend URL for CORS"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention days"
  type        = number
  default     = 30
}
