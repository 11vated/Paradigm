# AWS WAF Configuration for Paradigm Absolute
# Terraform configuration for Web Application Firewall

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# IP Set for admin whitelist
resource "aws_wafv2_ip_set" "admin_whitelist" {
  name               = "paradigm-admin-whitelist"
  description        = "Whitelisted IPs for admin access"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  
  addresses = [
    "203.0.113.0/24",  # Office network
    "198.51.100.0/24"  # VPN network
  ]

  tags = {
    Name        = "paradigm-admin-whitelist"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# WAF Web ACL
resource "aws_wafv2_web_acl" "paradigm" {
  name        = "paradigm-waf"
  description = "WAF rules for Paradigm Absolute platform"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {
        custom_response {
          response_code = 429
          custom_response_body_key = "rate_limit_exceeded"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitRule"
      sampled_requests_enabled  = true
    }
  }

  # SQL injection protection
  rule {
    name     = "SQLInjectionRule"
    priority = 2

    action {
      block {}
    }

    statement {
      sqli_match_statement {
        field_to_match {
          all_query_arguments {}
        }

        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }

        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "SQLInjectionRule"
      sampled_requests_enabled  = true
    }
  }

  # XSS protection
  rule {
    name     = "XSSRule"
    priority = 3

    action {
      block {}
    }

    statement {
      xss_match_statement {
        field_to_match {
          all_query_arguments {}
        }

        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }

        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "XSSRule"
      sampled_requests_enabled  = true
    }
  }

  # Geographic blocking
  rule {
    name     = "GeoBlockRule"
    priority = 4

    action {
      block {
        custom_response {
          response_code = 403
          custom_response_body_key = "geo_blocked"
        }
      }
    }

    statement {
      not_statement {
        statement {
          geo_match_statement {
            country_codes = ["US", "CA", "GB", "DE", "FR", "JP", "AU", "NZ", "SG", "KR"]
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "GeoBlockRule"
      sampled_requests_enabled  = true
    }
  }

  # Size constraint
  rule {
    name     = "SizeConstraintRule"
    priority = 5

    action {
      block {
        custom_response {
          response_code = 413
          custom_response_body_key = "payload_too_large"
        }
      }
    }

    statement {
      size_constraint_statement {
        field_to_match {
          body {}
        }
        comparison_operator = "GT"
        size                = 10485760  # 10MB

        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "SizeConstraintRule"
      sampled_requests_enabled  = true
    }
  }

  # Admin path protection
  rule {
    name     = "AdminPathProtection"
    priority = 7

    action {
      block {
        custom_response {
          response_code = 403
          custom_response_body_key = "admin_access_denied"
        }
      }
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string = "/admin"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "STARTS_WITH"
          }
        }

        statement {
          not_statement {
            statement {
              ip_set_reference_statement {
                arn = aws_wafv2_ip_set.admin_whitelist.arn
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AdminPathProtection"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "KnownBadInputsRule"
    priority = 8

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "KnownBadInputsRule"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "CoreRuleSet"
    priority = 9

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"

        excluded_rule {
          name = "SizeRestrictions_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "CoreRuleSet"
      sampled_requests_enabled  = true
    }
  }

  # Custom response bodies
  custom_response_body {
    key          = "rate_limit_exceeded"
    content      = "{\"error\":\"Rate limit exceeded. Please try again later.\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "geo_blocked"
    content      = "{\"error\":\"Access from your location is not permitted.\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "payload_too_large"
    content      = "{\"error\":\"Request payload too large. Maximum size is 10MB.\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "admin_access_denied"
    content      = "{\"error\":\"Admin access denied. Your IP is not whitelisted.\"}"
    content_type = "APPLICATION_JSON"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "ParadigmWAF"
    sampled_requests_enabled  = true
  }

  tags = {
    Name        = "paradigm-waf"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.paradigm.arn
}

# CloudWatch Log Group for WAF
resource "aws_cloudwatch_log_group" "waf" {
  name              = "/aws/wafv2/paradigm"
  retention_in_days = 30

  tags = {
    Name        = "paradigm-waf-logs"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# WAF Logging Configuration
resource "aws_wafv2_web_acl_logging_configuration" "paradigm" {
  resource_arn            = aws_wafv2_web_acl.paradigm.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}

# Outputs
output "waf_web_acl_id" {
  description = "The ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.paradigm.id
}

output "waf_web_acl_arn" {
  description = "The ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.paradigm.arn
}

output "admin_ip_set_arn" {
  description = "The ARN of the admin IP whitelist"
  value       = aws_wafv2_ip_set.admin_whitelist.arn
}

# Variables
variable "alb_arn" {
  description = "ARN of the Application Load Balancer"
  type        = string
}