# Root Module Variables

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "site-layouts"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_db_name" {
  description = "Database name"
  type        = string
  default     = "sitelayouts"
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# ECS Configuration
variable "container_image" {
  description = "Docker image for backend container"
  type        = string
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 3001
}

variable "api_cpu" {
  description = "API task CPU units"
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "API task memory in MiB"
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "Desired count of API tasks"
  type        = number
  default     = 1
}

# Frontend Configuration
variable "frontend_domain" {
  description = "Custom domain for frontend (optional)"
  type        = string
  default     = ""
}

# JWT Secrets
variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
  default     = ""
}

# Mapbox Token
variable "mapbox_token" {
  description = "Mapbox access token"
  type        = string
  sensitive   = true
  default     = ""
}
