# ElastiCache Module Outputs

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
}
