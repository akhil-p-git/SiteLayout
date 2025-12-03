# Root Terraform Configuration
# Orchestrates all modules for Site Layouts infrastructure

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  container_port     = var.container_port
}

# RDS Module (PostgreSQL with PostGIS)
module "rds" {
  source = "./modules/rds"

  project_name         = var.project_name
  environment          = var.environment
  db_subnet_group_name = module.vpc.db_subnet_group_name
  security_group_id    = module.vpc.rds_security_group_id
  db_instance_class    = var.rds_instance_class
  db_allocated_storage = var.rds_allocated_storage
  db_name              = var.rds_db_name
  db_username          = "sitelayouts_admin"
}

# ElastiCache Module (Redis)
module "elasticache" {
  source = "./modules/elasticache"

  project_name      = var.project_name
  environment       = var.environment
  subnet_group_name = module.vpc.elasticache_subnet_group_name
  security_group_id = module.vpc.elasticache_security_group_id
  node_type         = var.redis_node_type
}

# S3 Module (File Storage)
module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

# S3 Module for Frontend (Static Hosting)
module "frontend_s3" {
  source = "./modules/s3"

  project_name  = var.project_name
  environment   = var.environment
  bucket_suffix = "frontend"
  enable_website = true
}

# CloudFront for Frontend (with API proxy to ALB)
module "cloudfront" {
  source = "./modules/cloudfront"

  project_name      = var.project_name
  environment       = var.environment
  s3_bucket_id      = module.frontend_s3.bucket_id
  s3_bucket_arn     = module.frontend_s3.bucket_arn
  s3_bucket_domain  = module.frontend_s3.bucket_regional_domain_name
  alb_dns_name      = module.alb.alb_dns_name
}

# ALB Module
module "alb" {
  source = "./modules/alb"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.vpc.alb_security_group_id
  container_port        = var.container_port
  health_check_path     = "/health"
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = data.aws_region.current.name

  private_subnet_ids    = module.vpc.private_subnet_ids
  ecs_security_group_id = module.vpc.ecs_tasks_security_group_id
  target_group_arn      = module.alb.target_group_arn

  container_image = var.container_image
  container_port  = var.container_port
  api_cpu         = var.api_cpu
  api_memory      = var.api_memory
  api_desired_count = var.api_desired_count

  # Database configuration
  db_secret_arn = module.rds.db_password_secret_arn

  # Redis configuration
  redis_url = module.elasticache.redis_url

  # S3 configuration
  s3_bucket_name = module.s3.bucket_id
  s3_bucket_arn  = module.s3.bucket_arn

  # JWT secrets
  jwt_secret         = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result
  jwt_refresh_secret = var.jwt_refresh_secret != "" ? var.jwt_refresh_secret : random_password.jwt_refresh_secret.result

  # Frontend URL for CORS (use HTTPS since API also goes through CloudFront)
  frontend_url = "https://${module.cloudfront.distribution_domain_name}"
}

# Random passwords for JWT if not provided
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

# ECR Repository for Backend
resource "aws_ecr_repository" "backend" {
  name                 = "${local.name_prefix}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backend-ecr"
  })
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
