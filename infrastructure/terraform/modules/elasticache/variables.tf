# ElastiCache Module Variables

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "subnet_group_name" {
  description = "ElastiCache subnet group name"
  type        = string
}

variable "security_group_id" {
  description = "Security group ID"
  type        = string
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}
