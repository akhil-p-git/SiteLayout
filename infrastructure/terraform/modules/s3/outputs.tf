# S3 Module Outputs

output "bucket_id" {
  description = "S3 bucket ID"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.main.arn
}

output "bucket_regional_domain_name" {
  description = "S3 bucket regional domain name"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

output "bucket_website_endpoint" {
  description = "S3 bucket website endpoint"
  value       = var.enable_website ? aws_s3_bucket_website_configuration.main[0].website_endpoint : null
}
