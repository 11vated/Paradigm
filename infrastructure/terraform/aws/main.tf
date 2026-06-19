# ═══════════════════════════════════════════════════════════════════════════
# Paradigm Absolute — AWS Infrastructure (Terraform)
# Complete AWS deployment with EKS, RDS, ElastiCache, S3, CloudFront
# ═══════════════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
  
  backend "s3" {
    bucket = "paradigm-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "paradigm-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Paradigm Absolute"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ─── Variables ──────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "paradigm-production"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

# ─── VPC ────────────────────────────────────────────────────────────────────

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# ─── EKS Cluster ────────────────────────────────────────────────────────────

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  cluster_name    = var.cluster_name
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  cluster_endpoint_public_access = true
  
  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 3
      max_size     = 10
      
      instance_types = ["t3.xlarge"]
      capacity_type  = "ON_DEMAND"
      
      labels = {
        role = "general"
      }
      
      tags = {
        NodeGroup = "general"
      }
    }
    
    compute = {
      desired_size = 2
      min_size     = 2
      max_size     = 20
      
      instance_types = ["c5.2xlarge"]
      capacity_type  = "SPOT"
      
      labels = {
        role = "compute"
      }
      
      taints = [{
        key    = "workload"
        value  = "compute"
        effect = "NoSchedule"
      }]
      
      tags = {
        NodeGroup = "compute"
      }
    }
  }
}

# ─── RDS PostgreSQL ─────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "paradigm" {
  name       = "${var.cluster_name}-db-subnet"
  subnet_ids = module.vpc.private_subnets
  
  tags = {
    Name = "${var.cluster_name}-db-subnet"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.cluster_name}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "paradigm" {
  identifier     = "${var.cluster_name}-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "paradigm"
  username = "paradigm"
  password = random_password.db_password.result
  
  db_subnet_group_name   = aws_db_subnet_group.paradigm.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  multi_az               = true
  publicly_accessible    = false
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.cluster_name}-final-snapshot"
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  tags = {
    Name = "${var.cluster_name}-db"
  }
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# ─── ElastiCache Redis ──────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "paradigm" {
  name       = "${var.cluster_name}-cache-subnet"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "elasticache" {
  name        = "${var.cluster_name}-elasticache-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_replication_group" "paradigm" {
  replication_group_id       = "${var.cluster_name}-redis"
  replication_group_description = "Redis cluster for Paradigm Absolute"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 3
  parameter_group_name = "default.redis7"
  port                 = 6379
  
  subnet_group_name  = aws_elasticache_subnet_group.paradigm.name
  security_group_ids = [aws_security_group.elasticache.id]
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "mon:05:00-mon:07:00"
  
  tags = {
    Name = "${var.cluster_name}-redis"
  }
}

# ─── S3 Buckets ─────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.cluster_name}-artifacts"
  
  tags = {
    Name = "${var.cluster_name}-artifacts"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── CloudFront CDN ─────────────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "paradigm" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Paradigm Absolute CDN"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"
  
  origin {
    domain_name = aws_s3_bucket.artifacts.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.artifacts.id}"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.paradigm.cloudfront_access_identity_path
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.artifacts.id}"
    
    forwarded_values {
      query_string = false
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
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
    Name = "${var.cluster_name}-cdn"
  }
}

resource "aws_cloudfront_origin_access_identity" "paradigm" {
  comment = "Paradigm Absolute OAI"
}

# ─── Route53 DNS ────────────────────────────────────────────────────────────

resource "aws_route53_zone" "paradigm" {
  name = "paradigm.ai"
  
  tags = {
    Name = "paradigm.ai"
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.paradigm.zone_id
  name    = "www.paradigm.ai"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.paradigm.domain_name
    zone_id                = aws_cloudfront_distribution.paradigm.hosted_zone_id
    evaluate_target_health = false
  }
}

# ─── Outputs ────────────────────────────────────────────────────────────────

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.paradigm.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = aws_elasticache_replication_group.paradigm.primary_endpoint_address
  sensitive   = true
}

output "s3_bucket" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.artifacts.id
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.paradigm.domain_name
}