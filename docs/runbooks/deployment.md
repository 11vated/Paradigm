# Deployment Runbook — Paradigm Absolute

## Overview

This runbook provides step-by-step procedures for deploying Paradigm Absolute to production, including pre-deployment checks, deployment steps, validation, and rollback procedures.

**Audience:** DevOps Engineers, SREs  
**Estimated Time:** 45-60 minutes  
**Last Updated:** June 19, 2026

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (target: >95%)
- [ ] Code coverage >75%
- [ ] TypeScript compilation successful (0 errors)
- [ ] ESLint passing (0 errors)
- [ ] Quality contracts passing (13/13 at ≥0.995)
- [ ] Golden hashes verified
- [ ] Determinism check passed

### Infrastructure
- [ ] AWS resources provisioned (Terraform applied)
- [ ] EKS cluster accessible
- [ ] RDS database healthy
- [ ] ElastiCache Redis healthy
- [ ] S3 buckets created
- [ ] CloudFront distribution active
- [ ] Route53 DNS configured
- [ ] SSL certificates valid

### Security
- [ ] Vault unsealed and accessible
- [ ] All secrets configured
- [ ] WAF rules active
- [ ] Network policies applied
- [ ] RBAC configured
- [ ] Security scan passed (no critical vulnerabilities)

### Monitoring
- [ ] Prometheus operational
- [ ] Grafana dashboards accessible
- [ ] Alertmanager configured
- [ ] PagerDuty integration tested
- [ ] Slack notifications tested
- [ ] ELK stack operational

### Documentation
- [ ] Deployment plan reviewed
- [ ] Rollback plan reviewed
- [ ] On-call rotation confirmed
- [ ] Stakeholders notified

---

## Deployment Steps

### Step 1: Build and Push Docker Image

```bash
# Set version
export VERSION="v1.0.0"
export COMMIT_SHA=$(git rev-parse --short HEAD)
export IMAGE_TAG="${VERSION}-${COMMIT_SHA}"

# Build Docker image
docker build -f Dockerfile.production -t paradigm/app:${IMAGE_TAG} .

# Tag as latest
docker tag paradigm/app:${IMAGE_TAG} paradigm/app:latest

# Push to registry
docker push paradigm/app:${IMAGE_TAG}
docker push paradigm/app:latest

# Verify image
docker pull paradigm/app:${IMAGE_TAG}
docker inspect paradigm/app:${IMAGE_TAG}
```

**Expected Duration:** 5-7 minutes  
**Success Criteria:** Image pushed successfully, size <400MB

### Step 2: Update Kubernetes Manifests

```bash
# Update image tag in deployment
sed -i "s|image: paradigm/app:.*|image: paradigm/app:${IMAGE_TAG}|g" kubernetes/deployment.yaml

# Verify changes
git diff kubernetes/deployment.yaml

# Commit changes
git add kubernetes/deployment.yaml
git commit -m "Deploy ${IMAGE_TAG}"
git push origin main
```

**Expected Duration:** 2 minutes  
**Success Criteria:** Manifest updated with new image tag

### Step 3: Database Migrations

```bash
# Connect to database
kubectl port-forward -n paradigm svc/postgres 5432:5432 &

# Run migrations
npm run migrate:up

# Verify migrations
npm run migrate:status

# Stop port-forward
pkill -f "port-forward.*postgres"
```

**Expected Duration:** 3-5 minutes  
**Success Criteria:** All migrations applied successfully

### Step 4: Deploy to Kubernetes

```bash
# Apply ConfigMap changes
kubectl apply -f kubernetes/configmap.yaml

# Apply Secret changes (if any)
kubectl apply -f kubernetes/secret.yaml

# Deploy application (rolling update)
kubectl apply -f kubernetes/deployment.yaml

# Monitor rollout
kubectl rollout status deployment/paradigm-app -n paradigm --timeout=10m

# Verify pods
kubectl get pods -n paradigm -l app=paradigm-app
```

**Expected Duration:** 5-10 minutes  
**Success Criteria:** All pods running, 0 CrashLoopBackOff

### Step 5: Verify Deployment

```bash
# Check pod status
kubectl get pods -n paradigm

# Check logs
kubectl logs -n paradigm -l app=paradigm-app --tail=100

# Check service endpoints
kubectl get endpoints -n paradigm

# Test health endpoint
kubectl exec -n paradigm $(kubectl get pod -n paradigm -l app=paradigm-app -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:3000/api/health

# Test external access
curl https://api.paradigm.com/api/health
```

**Expected Duration:** 3-5 minutes  
**Success Criteria:** Health checks passing, no errors in logs

### Step 6: Smoke Tests

```bash
# Run smoke test suite
npm run test:smoke

# Test critical endpoints
curl -X POST https://api.paradigm.com/api/seeds/generate \
  -H "Content-Type: application/json" \
  -d '{"domain":"character","genes":{}}'

# Test authentication
curl -X POST https://api.paradigm.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@paradigm.com","password":"test123"}'

# Test WebSocket
wscat -c wss://api.paradigm.com/ws
```

**Expected Duration:** 5 minutes  
**Success Criteria:** All smoke tests passing

### Step 7: Monitor Metrics

```bash
# Open Grafana
open https://grafana.paradigm.com

# Check dashboards:
# - Application Overview (request rate, latency, errors)
# - Database Performance (connections, queries)
# - Infrastructure Health (CPU, memory, pods)

# Monitor for 10 minutes
# Watch for:
# - Error rate <0.1%
# - Response time p95 <500ms
# - No memory leaks
# - No connection pool exhaustion
```

**Expected Duration:** 10 minutes  
**Success Criteria:** All metrics within normal ranges

### Step 8: Enable Traffic

```bash
# If using blue-green deployment:
# Update Route53 to point to new environment
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://route53-update.json

# If using canary deployment:
# Gradually increase traffic to new version
kubectl patch deployment paradigm-app -n paradigm \
  -p '{"spec":{"replicas":10}}'

# Monitor traffic split
kubectl get pods -n paradigm -l version=new
```

**Expected Duration:** 5 minutes  
**Success Criteria:** Traffic flowing to new version

### Step 9: Post-Deployment Validation

```bash
# Run full test suite against production
npm run test:e2e -- --env=production

# Verify key features:
# - Seed generation
# - Seed breeding
# - Seed evolution
# - Friend creation
# - World generation
# - Quest generation

# Check error rates in Grafana
# Check logs in Kibana
# Verify no alerts firing
```

**Expected Duration:** 10 minutes  
**Success Criteria:** All tests passing, no errors

---

## Rollback Procedure

### When to Rollback

Rollback immediately if:
- Error rate >1%
- Response time p95 >2000ms
- Critical functionality broken
- Database corruption detected
- Security vulnerability discovered

### Rollback Steps

```bash
# Step 1: Identify previous version
export PREVIOUS_VERSION=$(kubectl get deployment paradigm-app -n paradigm -o jsonpath='{.metadata.annotations.previous-version}')

# Step 2: Rollback deployment
kubectl rollout undo deployment/paradigm-app -n paradigm

# Step 3: Monitor rollback
kubectl rollout status deployment/paradigm-app -n paradigm

# Step 4: Verify pods
kubectl get pods -n paradigm -l app=paradigm-app

# Step 5: Test health
curl https://api.paradigm.com/api/health

# Step 6: Rollback database (if needed)
npm run migrate:down

# Step 7: Update DNS (if changed)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://route53-rollback.json

# Step 8: Notify stakeholders
./scripts/notify-rollback.sh "${PREVIOUS_VERSION}"
```

**Expected Duration:** 5-10 minutes  
**Success Criteria:** Previous version running, metrics normal

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n paradigm

# Check events
kubectl get events -n paradigm --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n paradigm --previous

# Common issues:
# - Image pull errors: Check registry credentials
# - CrashLoopBackOff: Check application logs
# - Pending: Check resource quotas
```

### Database Connection Issues

```bash
# Check database status
kubectl exec -n paradigm postgres-0 -- pg_isready

# Check connection pool
kubectl exec -n paradigm <app-pod> -- curl http://localhost:3000/api/debug/pool

# Check network policy
kubectl describe networkpolicy -n paradigm

# Test connectivity
kubectl exec -n paradigm <app-pod> -- nc -zv postgres 5432
```

### High Error Rate

```bash
# Check application logs
kubectl logs -n paradigm -l app=paradigm-app --tail=1000 | grep ERROR

# Check Grafana for error patterns
open https://grafana.paradigm.com/d/app-overview

# Check Sentry for exceptions
open https://sentry.io/paradigm/app

# Common causes:
# - Database connection pool exhausted
# - Redis connection issues
# - External API failures
# - Memory leaks
```

### Slow Response Times

```bash
# Check database slow queries
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis latency
kubectl exec -n paradigm redis-0 -- redis-cli --latency

# Check application metrics
curl https://api.paradigm.com/api/metrics

# Profile application
kubectl exec -n paradigm <app-pod> -- node --prof app.js
```

---

## Post-Deployment Tasks

### Immediate (Within 1 hour)
- [ ] Monitor metrics for anomalies
- [ ] Review error logs
- [ ] Verify all alerts configured
- [ ] Update deployment documentation
- [ ] Notify stakeholders of successful deployment

### Short-term (Within 24 hours)
- [ ] Review performance metrics
- [ ] Analyze user feedback
- [ ] Check for any edge cases
- [ ] Update runbook with lessons learned
- [ ] Schedule post-mortem (if issues occurred)

### Long-term (Within 1 week)
- [ ] Analyze cost impact
- [ ] Review capacity planning
- [ ] Update disaster recovery plan
- [ ] Conduct load testing
- [ ] Plan next deployment

---

## Deployment Schedule

### Recommended Deployment Windows

**Production:**
- Tuesday-Thursday, 10:00 AM - 2:00 PM EST
- Avoid Mondays (weekend issues) and Fridays (limited support)
- Avoid holidays and major events

**Staging:**
- Any weekday, 9:00 AM - 5:00 PM EST

**Emergency Hotfixes:**
- Any time, with on-call approval

---

## Communication Plan

### Pre-Deployment
- [ ] Notify #engineering channel (2 hours before)
- [ ] Notify #ops channel (1 hour before)
- [ ] Update status page (30 minutes before)
- [ ] Email stakeholders (if major release)

### During Deployment
- [ ] Post updates in #deployments channel
- [ ] Update status page with progress
- [ ] Keep stakeholders informed of any issues

### Post-Deployment
- [ ] Announce completion in #engineering
- [ ] Update status page (deployment complete)
- [ ] Send summary email to stakeholders
- [ ] Document any issues encountered

---

## Contacts

**On-Call Engineer:** Check PagerDuty rotation  
**DevOps Lead:** devops-lead@paradigm.com  
**Engineering Manager:** eng-manager@paradigm.com  
**CTO:** cto@paradigm.com

**Emergency Escalation:**
1. On-call engineer (PagerDuty)
2. DevOps lead (Slack + phone)
3. Engineering manager (Slack + phone)
4. CTO (phone only)

---

## Appendix

### Useful Commands

```bash
# Get pod logs
kubectl logs -f -n paradigm <pod-name>

# Execute command in pod
kubectl exec -it -n paradigm <pod-name> -- /bin/sh

# Port forward to service
kubectl port-forward -n paradigm svc/paradigm-app 3000:3000

# Scale deployment
kubectl scale deployment paradigm-app -n paradigm --replicas=5

# Get resource usage
kubectl top pods -n paradigm

# Describe deployment
kubectl describe deployment paradigm-app -n paradigm
```

### Monitoring URLs

- **Grafana:** https://grafana.paradigm.com
- **Prometheus:** https://prometheus.paradigm.com
- **Kibana:** https://kibana.paradigm.com
- **Sentry:** https://sentry.io/paradigm/app
- **PagerDuty:** https://paradigm.pagerduty.com

### Documentation Links

- [Architecture Overview](../ARCHITECTURE.md)
- [API Documentation](../API.md)
- [Security Guide](../SECURITY.md)
- [Incident Response](./incident-response.md)
- [Scaling Guide](./scaling.md)

---

**Last Deployment:** [Date]  
**Deployed By:** [Name]  
**Version:** [Version]  
**Status:** [Success/Rollback]