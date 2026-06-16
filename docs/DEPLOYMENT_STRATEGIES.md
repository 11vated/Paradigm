# Deployment Strategies Guide

This guide covers the deployment strategies available for Paradigm Infinite: canary deployments and blue-green deployments.

## Overview

Paradigm Infinite supports multiple deployment strategies to ensure zero-downtime deployments and safe rollouts:

- **Canary Deployment**: Gradually roll out new version to a subset of users
- **Blue-Green Deployment**: Maintain two identical environments and switch traffic instantly

## Canary Deployment

### Concept

Canary deployment releases a new version to a small percentage of users first, monitors for issues, and gradually increases traffic if everything looks healthy.

### When to Use

- Testing new features with real users
- Validating performance characteristics
- Gradual rollout of significant changes
- A/B testing different versions

### Architecture

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Load Balancer│
└──────┬──────┘
       │
       ├─── 90% ────┐
       │             │
       ▼             ▼
┌──────────┐  ┌──────────┐
│  Stable  │  │  Canary  │
│ (v1.0)   │  │ (v1.1)   │
└──────────┘  └──────────┘
```

### Usage

```bash
# Deploy canary with 10% traffic
CANARY_PERCENT=10 ./scripts/deploy-canary.sh

# Deploy canary with custom configuration
CANARY_PERCENT=5 \
HEALTH_CHECK_URL=http://localhost:3000/api/health \
HEALTH_CHECK_TIMEOUT=60 \
./scripts/deploy-canary.sh
```

### Configuration

Environment variables for canary deployment:

- `CANARY_PERCENT`: Initial traffic percentage (default: 10)
- `MAX_CANARY_PERCENT`: Maximum traffic percentage (default: 50)
- `INCREMENT`: Traffic increment percentage (default: 10)
- `HEALTH_CHECK_URL`: Health check endpoint (default: http://localhost:3000/api/health)
- `HEALTH_CHECK_TIMEOUT`: Health check timeout in seconds (default: 30)
- `HEALTH_CHECK_INTERVAL`: Health check interval in seconds (default: 5)

### Process Flow

1. **Build**: Build new version as canary
2. **Deploy**: Deploy canary instance
3. **Health Check**: Verify canary is healthy
4. **Traffic Shift**: Gradually shift traffic (10% → 20% → 30% → ... → 50%)
5. **Monitor**: Monitor metrics and error rates at each step
6. **Promote**: Optionally promote canary to stable

### Rollback

If issues are detected at any point, the script automatically rolls back to the stable version.

## Blue-Green Deployment

### Concept

Blue-green deployment maintains two identical production environments (blue and green). The new version is deployed to the inactive environment, validated, and then traffic is switched instantly.

### When to Use

- Zero-downtime deployments
- Quick rollback capability
- Complete environment isolation
- Regulatory compliance requiring instant rollback

### Architecture

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Load Balancer│
└──────┬──────┘
       │
       │ (switches instantly)
       │
       ▼
┌──────────┐  ┌──────────┐
│  Blue    │  │  Green   │
│ (v1.0)   │  │ (v1.1)   │
│  ACTIVE  │  │ INACTIVE │
└──────────┘  └──────────┘
```

### Usage

```bash
# Deploy to green environment
./scripts/deploy-blue-green.sh

# Deploy with custom configuration
HEALTH_CHECK_URL=http://localhost:3000/api/health \
HEALTH_CHECK_TIMEOUT=60 \
SWITCHBACK_TIMEOUT=300 \
./scripts/deploy-blue-green.sh
```

### Configuration

Environment variables for blue-green deployment:

- `BLUE_ENV`: Blue environment name (default: blue)
- `GREEN_ENV`: Green environment name (default: green)
- `HEALTH_CHECK_URL`: Health check endpoint (default: http://localhost:3000/api/health)
- `HEALTH_CHECK_TIMEOUT`: Health check timeout in seconds (default: 60)
- `HEALTH_CHECK_INTERVAL`: Health check interval in seconds (default: 5)
- `SWITCHBACK_TIMEOUT`: Monitoring duration in seconds (default: 300)

### Process Flow

1. **Build**: Build new version for green environment
2. **Deploy**: Deploy to green environment (inactive)
3. **Health Check**: Verify green environment is healthy
4. **Smoke Tests**: Run smoke tests on green environment
5. **Switch Traffic**: Instantly switch all traffic to green
6. **Monitor**: Monitor green environment for specified duration
7. **Cleanup**: Stop blue environment (old version)

### Rollback

If issues are detected during monitoring, the script instantly switches traffic back to blue (the previous stable version).

## Load Balancer Configuration

The blue-green deployment uses Nginx as a load balancer to route traffic between environments.

### Configuration File

`nginx-load-balancer.conf` contains the Nginx configuration with:

- Upstream server configuration for blue and green
- Weight-based traffic routing (controlled by deployment scripts)
- Rate limiting
- SSL/TLS configuration
- Security headers
- Health checks

### Updating Weights

To control traffic distribution, update the upstream weights in `nginx-load-balancer.conf`:

```nginx
upstream paradigm_backend {
    server app-blue:3000 weight=100;  # 100% to blue
    server app-green:3000 weight=0;    # 0% to green
}
```

Then reload Nginx:

```bash
docker-compose -f docker-compose.blue-green.yml exec load-balancer nginx -s reload
```

## Monitoring

### Health Checks

Both strategies use health checks to verify deployment success:

```bash
# Check application health
curl http://localhost:3000/api/health

# Check substrate health
curl http://localhost:3000/api/substrate/health
```

### Metrics

Monitor the following metrics during deployments:

- Error rate
- Response time (p50, p95, p99)
- Request rate
- CPU/memory usage
- Database connection pool
- Redis connection pool

### Prometheus Integration

Both deployment strategies integrate with Prometheus for monitoring:

- Application metrics: `/metrics`
- Load balancer metrics: `http://localhost:8080/nginx_status`
- Custom deployment metrics can be added

## Comparison

| Feature | Canary | Blue-Green |
|---------|--------|------------|
| Deployment Speed | Gradual | Instant |
| Rollback Speed | Gradual | Instant |
| Risk Exposure | Limited (subset of users) | Full (if issues after switch) |
| Resource Usage | Additional for canary | Double (both environments) |
| Complexity | Medium | Low |
| Best For | A/B testing, gradual rollout | Zero-downtime, instant rollback |

## Best Practices

### Canary Deployment

1. Start with small traffic percentage (5-10%)
2. Monitor metrics closely at each increment
3. Set appropriate timeouts for health checks
4. Have clear rollback criteria
5. Document canary-specific configurations

### Blue-Green Deployment

1. Ensure environments are truly identical
2. Test green environment thoroughly before switch
3. Use database migrations that work with both versions
4. Have automated rollback triggers
5. Keep blue environment available for quick rollback

### General

1. Always test in staging first
2. Use feature flags for additional safety
3. Monitor logs during deployment
4. Have post-deployment verification steps
5. Document deployment procedures

## Troubleshooting

### Canary Deployment Issues

**Health check fails:**
```bash
# Check canary logs
docker-compose -f docker-compose.canary.yml logs app-canary

# Manual health check
curl http://localhost:3000/api/health
```

**Traffic not shifting:**
- Verify load balancer configuration
- Check upstream weights
- Reload Nginx configuration

### Blue-Green Deployment Issues

**Green environment unhealthy:**
```bash
# Check green logs
docker-compose -f docker-compose.blue-green.yml logs app-green

# Manual health check
curl http://localhost:3001/api/health
```

**Traffic not switching:**
- Verify deployment state file
- Check load balancer configuration
- Manually update upstream weights

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Canary Deployment

on:
  push:
    branches: [main]

jobs:
  canary-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy canary
        run: |
          ssh user@production-server 'cd /opt/paradigm && ./scripts/deploy-canary.sh'
      
      - name: Wait for validation
        run: sleep 300
      
      - name: Promote to stable
        if: success()
        run: |
          ssh user@production-server 'cd /opt/paradigm && ./scripts/promote-canary.sh'
```

### Blue-Green Deployment

```yaml
name: Blue-Green Deployment

on:
  push:
    branches: [main]

jobs:
  blue-green-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to green
        run: |
          ssh user@production-server 'cd /opt/paradigm && ./scripts/deploy-blue-green.sh'
```

## Security Considerations

1. Secure deployment scripts with proper authentication
2. Use encrypted secrets for environment variables
3. Restrict access to deployment endpoints
4. Audit deployment logs
5. Use separate credentials for staging/production

## Next Steps

- [ ] Configure load balancer SSL certificates
- [ ] Set up automated monitoring alerts
- [ ] Integrate with CI/CD pipeline
- [ ] Create runbooks for common issues
- [ ] Train team on deployment procedures
