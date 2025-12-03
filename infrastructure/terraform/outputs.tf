# Root Module Outputs

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "api_url" {
  description = "API URL (ALB)"
  value       = "http://${module.alb.alb_dns_name}"
}

output "frontend_url" {
  description = "Frontend URL (CloudFront)"
  value       = "https://${module.cloudfront.distribution_domain_name}"
}

output "frontend_bucket" {
  description = "Frontend S3 bucket name"
  value       = module.frontend_s3.bucket_id
}

output "storage_bucket" {
  description = "Storage S3 bucket name"
  value       = module.s3.bucket_id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS API service name"
  value       = module.ecs.api_service_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.redis_primary_endpoint
}

output "db_secret_arn" {
  description = "Database credentials secret ARN"
  value       = module.rds.db_password_secret_arn
}
