# Scaling Runbook — Paradigm Absolute

## Overview

This runbook provides procedures for scaling Paradigm Absolute infrastructure to handle increased load, including horizontal and vertical scaling strategies.

**Audience:** DevOps Engineers, SREs  
**Last Updated:** June 19, 2026

---

## Scaling Triggers

### When to Scale Up

**Metrics Indicating Need to Scale:**
- CPU utilization >70% sustained for 5+ minutes
- Memory utilization >80% sustained for 5+ minutes
- Request queue depth >100
- Response time p95 >500ms
- Error rate >0.5%
- Database connection pool >80% utilized

**Business Triggers:**
- Product launch
- Marketing campaign
- Expected traffic spike
- New feature release
- Holiday season

### When to Scale Down

**Metrics Indicating Opportunity to Scale Down:**
- CPU utilization <30% sustained for 30+ minutes
- Memory utilization <40% sustained for 30+ minutes
- Request rate decreased by >50%
- Off-peak hours
- Cost optimization initiative

---

## Horizontal Scaling (Application)

### Manual Scaling

**Scale Up:**
```bash
# Increase replicas
kubectl scale deployment paradigm-app -n paradigm --replicas=20

# Verify scaling
kubectl get pods -n paradigm -l app=paradigm-app

# Monitor rollout
kubectl rollout status deployment/paradigm-app -n paradigm

# Check metrics
kubectl top pods -n paradigm
```

**Scale Down:**
```bash
# Decrease replicas
kubectl scale deployment paradigm-app -n paradigm --replicas=5

# Verify scaling
kubectl get pods -n paradigm -l app=paradigm-app

# Wait for graceful shutdown (30s default)
sleep 30

# Verify no errors
kubectl logs -n paradigm -l app=paradigm-app --tail=100 | grep ERROR
```

### Auto-Scaling (HPA)

**Current HPA Configuration:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: paradigm-app-hpa
  namespace: paradigm
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: paradigm-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

**Adjust HPA:**
```bash
# Increase max replicas
kubectl patch hpa paradigm-app-hpa -n paradigm \
  -p '{"spec":{"maxReplicas":50}}'

# Change CPU threshold
kubectl patch hpa paradigm-app-hpa -n paradigm \
  -p '{"spec":{"metrics":[{"type":"Resource","resource":{"name":"cpu","target":{"type":"Utilization","averageUtilization":60}}}]}}'

# Check HPA status
kubectl get hpa -n paradigm
kubectl describe hpa paradigm-app-hpa -n paradigm
```

---

## Vertical Scaling (Resources)

### Application Pods

**Increase Resources:**
```bash
# Update deployment
kubectl patch deployment paradigm-app -n paradigm \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"requests":{"cpu":"2000m","memory":"4Gi"},"limits":{"cpu":"4000m","memory":"8Gi"}}}]}}}}'

# Restart pods
kubectl rollout restart deployment/paradigm-app -n paradigm

# Monitor rollout
kubectl rollout status deployment/paradigm-app -n paradigm
```

**Resource Recommendations:**

| Load Level | CPU Request | CPU Limit | Memory Request | Memory Limit |
|------------|-------------|-----------|----------------|--------------|
| Low        | 500m        | 1000m     | 1Gi            | 2Gi          |
| Medium     | 1000m       | 2000m     | 2Gi            | 4Gi          |
| High       | 2000m       | 4000m     | 4Gi            | 8Gi          |
| Peak       | 4000m       | 8000m     | 8Gi            | 16Gi         |

---

## Database Scaling

### PostgreSQL (RDS)

**Vertical Scaling:**
```bash
# Modify instance class
aws rds modify-db-instance \
  --db-instance-identifier paradigm-postgres \
  --db-instance-class db.r6g.2xlarge \
  --apply-immediately

# Monitor modification
aws rds describe-db-instances \
  --db-instance-identifier paradigm-postgres \
  --query 'DBInstances[0].DBInstanceStatus'
```

**Read Replicas:**
```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier paradigm-postgres-replica-1 \
  --source-db-instance-identifier paradigm-postgres \
  --db-instance-class db.r6g.xlarge \
  --availability-zone us-east-1b

# Update application to use read replica for queries
kubectl patch configmap paradigm-config -n paradigm \
  -p '{"data":{"DATABASE_READ_URL":"postgres://paradigm-postgres-replica-1.xxx.rds.amazonaws.com:5432/paradigm"}}'
```

**Connection Pooling:**
```bash
# Increase max_connections
aws rds modify-db-parameter-group \
  --db-parameter-group-name paradigm-postgres-params \
  --parameters "ParameterName=max_connections,ParameterValue=500,ApplyMethod=immediate"

# Reboot instance (if needed)
aws rds reboot-db-instance \
  --db-instance-identifier paradigm-postgres
```

**Storage Scaling:**
```bash
# Increase storage
aws rds modify-db-instance \
  --db-instance-identifier paradigm-postgres \
  --allocated-storage 1000 \
  --apply-immediately
```

### Redis (ElastiCache)

**Vertical Scaling:**
```bash
# Modify node type
aws elasticache modify-replication-group \
  --replication-group-id paradigm-redis \
  --cache-node-type cache.r6g.xlarge \
  --apply-immediately
```

**Horizontal Scaling (Add Shards):**
```bash
# Add shard to cluster
aws elasticache increase-replica-count \
  --replication-group-id paradigm-redis \
  --new-replica-count 3 \
  --apply-immediately
```

---

## Kubernetes Node Scaling

### Manual Node Scaling

**Add Nodes:**
```bash
# Update node group
aws eks update-nodegroup-config \
  --cluster-name paradigm-eks \
  --nodegroup-name paradigm-nodes \
  --scaling-config minSize=5,maxSize=30,desiredSize=10

# Verify nodes
kubectl get nodes
```

**Remove Nodes:**
```bash
# Drain node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Update node group
aws eks update-nodegroup-config \
  --cluster-name paradigm-eks \
  --nodegroup-name paradigm-nodes \
  --scaling-config minSize=3,maxSize=20,desiredSize=5

# Delete node
kubectl delete node <node-name>
```

### Cluster Autoscaler

**Current Configuration:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --cloud-provider=aws
        - --namespace=kube-system
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/paradigm-eks
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
```

**Adjust Autoscaler:**
```bash
# Increase scale-up aggressiveness
kubectl patch deployment cluster-autoscaler -n kube-system \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"cluster-autoscaler","command":["./cluster-autoscaler","--cloud-provider=aws","--scale-down-delay-after-add=5m"]}]}}}}'

# Check autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler
```

---

## CDN Scaling (CloudFront)

### Increase Cache Capacity

**Adjust Cache Behaviors:**
```bash
# Update distribution
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --distribution-config file://cloudfront-config.json

# Invalidate cache (if needed)
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### Add Edge Locations

**Enable Additional Regions:**
```json
{
  "PriceClass": "PriceClass_All",
  "Enabled": true
}
```

---

## Load Balancer Scaling

### Application Load Balancer

**Increase Capacity:**
```bash
# ALB scales automatically, but you can:
# 1. Add more target groups
# 2. Increase target health check frequency
# 3. Adjust connection draining timeout

# Update target group
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/paradigm/1234567890abcdef \
  --health-check-interval-seconds 10 \
  --healthy-threshold-count 2
```

---

## Scaling Checklist

### Pre-Scaling
- [ ] Review current metrics
- [ ] Identify bottlenecks
- [ ] Estimate required capacity
- [ ] Check budget constraints
- [ ] Notify team
- [ ] Schedule maintenance window (if needed)

### During Scaling
- [ ] Execute scaling commands
- [ ] Monitor metrics in real-time
- [ ] Watch for errors
- [ ] Verify new resources healthy
- [ ] Test critical functionality

### Post-Scaling
- [ ] Verify metrics improved
- [ ] Check error rates
- [ ] Review costs
- [ ] Update documentation
- [ ] Schedule follow-up review

---

## Cost Optimization

### Right-Sizing

**Analyze Resource Usage:**
```bash
# Get resource usage over time
kubectl top pods -n paradigm --containers

# Analyze with Prometheus
curl 'https://prometheus.paradigm.com/api/v1/query?query=avg_over_time(container_cpu_usage_seconds_total[7d])'
```

**Recommendations:**
- Review resource requests/limits monthly
- Use spot instances for non-critical workloads
- Scale down during off-peak hours
- Use reserved instances for baseline capacity

### Auto-Scaling Policies

**Scheduled Scaling:**
```yaml
# Scale up during business hours
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: paradigm-app-hpa-business-hours
spec:
  minReplicas: 10  # 9 AM - 5 PM
  maxReplicas: 30

# Scale down during off-hours
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: paradigm-app-hpa-off-hours
spec:
  minReplicas: 3   # 5 PM - 9 AM
  maxReplicas: 10
```

---

## Monitoring Scaling Operations

### Key Metrics

**Application:**
- Request rate
- Response time (p50, p95, p99)
- Error rate
- CPU utilization
- Memory utilization
- Pod count

**Database:**
- Connection count
- Query latency
- Cache hit rate
- Replication lag
- Disk I/O

**Infrastructure:**
- Node count
- Node CPU/memory
- Network throughput
- Disk usage

### Grafana Dashboards

**Scaling Dashboard:**
- Current vs. desired replicas
- Scaling events timeline
- Resource utilization trends
- Cost per hour
- Efficiency metrics

---

## Troubleshooting

### Pods Not Scaling

**Check HPA:**
```bash
kubectl describe hpa paradigm-app-hpa -n paradigm
kubectl get hpa -n paradigm -o yaml
```

**Common Issues:**
- Metrics server not running
- Resource requests not set
- HPA misconfigured
- Node capacity exhausted

### Nodes Not Scaling

**Check Cluster Autoscaler:**
```bash
kubectl logs -n kube-system -l app=cluster-autoscaler --tail=100
```

**Common Issues:**
- IAM permissions missing
- Node group at max capacity
- Insufficient IP addresses
- AWS service limits

### Database Performance Degraded After Scaling

**Check:**
- Connection pool size
- Query performance
- Replication lag
- Cache hit rate

**Fix:**
```bash
# Increase connection pool
kubectl patch configmap paradigm-config -n paradigm \
  -p '{"data":{"DB_POOL_SIZE":"50"}}'

# Restart application
kubectl rollout restart deployment/paradigm-app -n paradigm
```

---

## Emergency Scaling

### Rapid Scale-Up (< 5 minutes)

```bash
# 1. Scale application immediately
kubectl scale deployment paradigm-app -n paradigm --replicas=50

# 2. Increase HPA max
kubectl patch hpa paradigm-app-hpa -n paradigm \
  -p '{"spec":{"maxReplicas":100}}'

# 3. Add nodes
aws eks update-nodegroup-config \
  --cluster-name paradigm-eks \
  --nodegroup-name paradigm-nodes \
  --scaling-config desiredSize=20

# 4. Monitor
watch kubectl get pods -n paradigm
```

### Rapid Scale-Down (Cost Emergency)

```bash
# 1. Scale down application
kubectl scale deployment paradigm-app -n paradigm --replicas=3

# 2. Reduce HPA max
kubectl patch hpa paradigm-app-hpa -n paradigm \
  -p '{"spec":{"maxReplicas":10}}'

# 3. Remove nodes
aws eks update-nodegroup-config \
  --cluster-name paradigm-eks \
  --nodegroup-name paradigm-nodes \
  --scaling-config desiredSize=3

# 4. Verify
kubectl get nodes
kubectl get pods -n paradigm
```

---

## Capacity Planning

### Growth Projections

| Metric | Current | 3 Months | 6 Months | 12 Months |
|--------|---------|----------|----------|-----------|
| Users | 10K | 50K | 100K | 500K |
| Requests/sec | 1K | 5K | 10K | 50K |
| Seeds/day | 100K | 500K | 1M | 5M |
| Storage (TB) | 1 | 5 | 10 | 50 |

### Resource Requirements

**Application Pods:**
- Current: 3-20 replicas
- 3 months: 10-50 replicas
- 6 months: 20-100 replicas
- 12 months: 50-200 replicas

**Database:**
- Current: db.r6g.xlarge
- 3 months: db.r6g.2xlarge
- 6 months: db.r6g.4xlarge
- 12 months: db.r6g.8xlarge + read replicas

**Nodes:**
- Current: 3-20 nodes
- 3 months: 5-30 nodes
- 6 months: 10-50 nodes
- 12 months: 20-100 nodes

---

## Contacts

**DevOps Lead:** devops-lead@paradigm.com  
**Cloud Architect:** cloud-architect@paradigm.com  
**Finance (Cost Approval):** finance@paradigm.com

---

**Last Updated:** June 19, 2026  
**Next Review:** July 19, 2026