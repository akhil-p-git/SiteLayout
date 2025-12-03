# ElastiCache Module - Redis

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_elasticache_parameter_group" "main" {
  family = "redis7"
  name   = "${local.name_prefix}-redis7-params"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  tags = {
    Name = "${local.name_prefix}-redis7-params"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "Redis cluster for ${local.name_prefix}"

  node_type            = var.node_type
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  subnet_group_name  = var.subnet_group_name
  security_group_ids = [var.security_group_id]

  automatic_failover_enabled = var.environment == "production" ? true : false
  multi_az_enabled          = var.environment == "production" ? true : false

  at_rest_encryption_enabled = true
  transit_encryption_enabled = false

  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "mon:05:00-mon:07:00"

  apply_immediately = true

  tags = {
    Name = "${local.name_prefix}-redis"
  }
}
