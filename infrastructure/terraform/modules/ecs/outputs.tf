# ECS Module Outputs

output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "api_service_name" {
  description = "API service name"
  value       = aws_ecs_service.api.name
}

output "api_task_definition_arn" {
  description = "API task definition ARN"
  value       = aws_ecs_task_definition.api.arn
}
