# CloudFront Module - CDN for Frontend

locals {
  name_prefix   = "${var.project_name}-${var.environment}"
  s3_origin_id  = "S3-${var.s3_bucket_id}"
  alb_origin_id = "ALB-${var.project_name}-${var.environment}"
}

# Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${local.name_prefix}-oac"
  description                       = "OAC for ${local.name_prefix} frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "${local.name_prefix} frontend distribution"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  origin {
    domain_name              = var.s3_bucket_domain
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # ALB Origin for API proxying (only if alb_dns_name is provided)
  dynamic "origin" {
    for_each = var.alb_dns_name != "" ? [1] : []
    content {
      domain_name = var.alb_dns_name
      origin_id   = local.alb_origin_id

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "http-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  # API cache behavior - proxy /api/* to ALB (only if alb_dns_name is provided)
  # Uses AWS managed policies to avoid restrictions on custom policies
  dynamic "ordered_cache_behavior" {
    for_each = var.alb_dns_name != "" ? [1] : []
    content {
      path_pattern           = "/api/*"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      target_origin_id       = local.alb_origin_id
      viewer_protocol_policy = "redirect-to-https"
      compress               = true

      # AWS Managed Policy: CachingDisabled
      cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
      # AWS Managed Policy: AllViewerExceptHostHeader (forwards all headers except Host)
      origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"  # Redirect to HTTPS since API also goes through CloudFront
    compress               = true

    cache_policy_id          = aws_cloudfront_cache_policy.main.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.main.id
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${local.name_prefix}-cloudfront"
  }
}

# Cache Policy
resource "aws_cloudfront_cache_policy" "main" {
  name        = "${local.name_prefix}-cache-policy"
  comment     = "Cache policy for ${local.name_prefix}"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 1

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Origin Request Policy
resource "aws_cloudfront_origin_request_policy" "main" {
  name    = "${local.name_prefix}-origin-request-policy"
  comment = "Origin request policy for ${local.name_prefix}"

  cookies_config {
    cookie_behavior = "none"
  }
  headers_config {
    header_behavior = "none"
  }
  query_strings_config {
    query_string_behavior = "none"
  }
}

# Use AWS managed policies for API - simpler and avoids restrictions
# Managed Policy: CachingDisabled = 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
# Managed Policy: AllViewerExceptHostHeader = b689b0a8-53d0-40ab-baf2-68738e2966ac

# S3 Bucket Policy to allow CloudFront access
resource "aws_s3_bucket_policy" "main" {
  bucket = var.s3_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${var.s3_bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}
