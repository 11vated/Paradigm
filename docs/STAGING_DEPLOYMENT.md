# Staging Environment Deployment Guide

This guide covers deploying Paradigm Infinite to a staging/preview environment.

## Overview

The staging environment provides a production-like environment for testing changes before production deployment. It uses separate infrastructure, databases, and configurations to ensure isolation from production.

## Prerequisites

- Docker and Docker Compose installed
- Git access to the Paradigm repository
- Basic knowledge of container orchestration
- Domain name configured (or use local DNS)

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd Paradigm

# Create staging environment file
cp staging.env.example .env.staging
# Edit .env.staging with your staging-specific values
```

### 2. Start Staging Environment

```bash
# Start all services
docker-compose -f docker-compose.staging.yml up -d

# View logs
docker-compose -f docker-compose.staging.yml logs -f

# Check service health
docker-compose -f docker-compose.staging.yml ps
```

### 3. Access Services

- **Application**: http://staging.paradigm.local:8080 (or https://staging.paradigm.local:8443)
- **Grafana**: http://grafana.staging.paradigm.local:3001 (default: admin/staging-grafana-password)
- **Prometheus**: http://prometheus.staging.paradigm.local:9091 (basic auth: prometheus/prometheus-staging-secret)

## Configuration

### Environment Variables

Key staging environment variables:

```bash
NODE_ENV=staging
DATABASE_URL=postgresql://paradigm:paradigm_staging_pass@postgres-staging:5432/paradigm_staging
REDIS_URL=redis://redis-staging:6379
JWT_SECRET=<staging-specific-secret>
LOG_LEVEL=debug
ENABLE_METRICS=true
PROMETHEUS_ENABLED=true
```

### Port Mappings

Staging uses different ports to avoid conflicts with development/production:

| Service | Staging Port | Production Port |
|---------|--------------|-----------------|
| App | 3001 | 3000 |
| HTTP Proxy | 8080 | 80 |
| HTTPS Proxy | 8443 | 443 |
| Prometheus | 9091 | 9090 |
| Grafana | 3002 | 3000 |

### DNS Configuration

For local testing, add to `/etc/hosts`:

```
127.0.0.1 staging.paradigm.local
127.0.0.1 grafana.staging.paradigm.local
127.0.0.1 prometheus.staging.paradigm.local
```

For remote deployment, configure DNS records pointing to your staging server.

## Operations

### View Logs

```bash
# All services
docker-compose -f docker-compose.staging.yml logs -f

# Specific service
docker-compose -f docker-compose.staging.yml logs -f app
docker-compose -f docker-compose.staging.yml logs -f postgres-staging
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.staging.yml restart

# Restart specific service
docker-compose -f docker-compose.staging.yml restart app
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.staging.yml up -d --build app
```

### Database Operations

```bash
# Access PostgreSQL
docker-compose -f docker-compose.staging.yml exec postgres-staging psql -U paradigm -d paradigm_staging

# Backup database
docker-compose -f docker-compose.staging.yml exec postgres-staging pg_dump -U paradigm paradigm_staging > backup.sql

# Restore database
docker-compose -f docker-compose.staging.yml exec -T postgres-staging psql -U paradigm paradigm_staging < backup.sql
```

### Clear Data

```bash
# Stop and remove volumes (WARNING: destroys all data)
docker-compose -f docker-compose.staging.yml down -v
```

## Monitoring

### Health Checks

```bash
# Application health
curl http://staging.paradigm.local:8080/api/health

# Substrate health
curl http://staging.paradigm.local:8080/api/substrate/health
```

### Metrics

- **Prometheus**: http://prometheus.staging.paradigm.local:9091
- **Grafana**: http://grafana.staging.paradigm.local:3001
- **Application Metrics**: http://staging.paradigm.local:8080/metrics

### Alerts

Staging uses the same alerting rules as production but with adjusted thresholds for the smaller scale. Review `monitoring/alert-rules.yml` for details.

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.staging.yml logs <service-name>

# Check resource usage
docker stats
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker-compose -f docker-compose.staging.yml ps postgres-staging

# Test connection
docker-compose -f docker-compose.staging.yml exec app npm run test:db
```

### Port Conflicts

If ports conflict with other services, modify the port mappings in `docker-compose.staging.yml`.

### SSL/TLS Issues

Staging uses self-signed certificates by default. Your browser will show a warning - this is expected. For production, use Let's Encrypt or your organization's certificates.

## Security Considerations

- Staging uses weaker security settings for testing (e.g., CORS allows all origins)
- Default passwords should be changed before deployment
- Staging should not be exposed to the public internet without proper authentication
- Use VPN or IP whitelisting for access control
- Regularly rotate secrets and passwords

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to staging
        run: |
          ssh user@staging-server 'cd /opt/paradigm && git pull && docker-compose -f docker-compose.staging.yml up -d --build'
```

## Cleanup

To completely remove the staging environment:

```bash
docker-compose -f docker-compose.staging.yml down -v
docker volume rm paradigm-staging-data paradigm-redis-staging-data paradigm-prometheus-staging-data paradigm-grafana-staging-data
```

## Next Steps

- [ ] Configure DNS records
- [ ] Set up SSL certificates
- [ ] Configure backup automation
- [ ] Set up log aggregation
- [ ] Configure monitoring alerts
- [ ] Document staging-specific procedures
