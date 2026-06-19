# Paradigm Absolute — Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying Paradigm Absolute to a production Kubernetes cluster.

## 📋 Prerequisites

- Kubernetes cluster (v1.28+)
- `kubectl` CLI tool installed and configured
- NGINX Ingress Controller installed
- cert-manager for SSL/TLS certificates (optional but recommended)
- Persistent storage provisioner

## 🚀 Quick Start

### 1. Set Environment Variables

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export POSTGRES_PASSWORD=$(openssl rand -hex 16)
export GEMINI_API_KEY="your-api-key"  # Optional
```

### 2. Deploy Using Script

```bash
cd k8s
./deploy.sh
```

### 3. Verify Deployment

```bash
kubectl get all -n paradigm
kubectl get ingress -n paradigm
```

## 📁 File Structure

```
k8s/
├── README.md                    # This file
├── deploy.sh                    # Automated deployment script
├── namespace.yaml               # Namespace definition
├── configmap.yaml               # Configuration values
├── secret.yaml                  # Secrets template
├── rbac.yaml                    # Service account and permissions
├── deployment.yaml              # Application deployment
├── service.yaml                 # Service definitions
├── postgres-statefulset.yaml    # PostgreSQL database
├── redis-deployment.yaml        # Redis cache
├── pvc.yaml                     # Persistent volume claims
├── ingress.yaml                 # Ingress configuration
└── hpa.yaml                     # Horizontal pod autoscaler
```

## 🔧 Manual Deployment

If you prefer to deploy manually:

### Step 1: Create Namespace

```bash
kubectl apply -f namespace.yaml
```

### Step 2: Create Secrets

```bash
kubectl create secret generic paradigm-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -hex 32) \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -hex 16) \
  --from-literal=GEMINI_API_KEY="your-api-key" \
  --namespace=paradigm
```

### Step 3: Deploy Infrastructure

```bash
kubectl apply -f rbac.yaml
kubectl apply -f configmap.yaml
kubectl apply -f pvc.yaml
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f service.yaml
```

### Step 4: Wait for Database

```bash
kubectl wait --for=condition=ready pod -l component=database -n paradigm --timeout=300s
```

### Step 5: Deploy Application

```bash
kubectl apply -f deployment.yaml
kubectl apply -f hpa.yaml
kubectl apply -f ingress.yaml
```

### Step 6: Verify

```bash
kubectl get pods -n paradigm
kubectl logs -f deployment/paradigm-app -n paradigm
```

## 🔐 Security Configuration

### Secrets Management

The deployment uses Kubernetes Secrets for sensitive data:

- `JWT_SECRET`: Authentication token secret
- `POSTGRES_PASSWORD`: Database password
- `GEMINI_API_KEY`: Optional AI API key

**Important:** Never commit actual secrets to version control. Use the template in `secret.yaml` as a reference only.

### RBAC

The deployment includes a ServiceAccount with minimal permissions:

- Read ConfigMaps
- Read Secrets
- Read Services
- Read Pods (for health checks)

### Network Policies

Consider adding NetworkPolicies to restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: paradigm-network-policy
  namespace: paradigm
spec:
  podSelector:
    matchLabels:
      app: paradigm-absolute
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - to:
    - podSelector:
        matchLabels:
          component: database
  - to:
    - podSelector:
        matchLabels:
          component: cache
```

## 📊 Resource Requirements

### Minimum Cluster

- **Control Plane:** 3 nodes (4 vCPU, 8GB RAM each)
- **Worker Nodes:** 5 nodes (8 vCPU, 16GB RAM each)
- **Storage:** 200GB total (100GB PostgreSQL + 50GB app data + 10GB Redis + 40GB buffer)

### Application Pods

**Paradigm App:**
- Requests: 500m CPU, 1Gi memory
- Limits: 2000m CPU, 2Gi memory
- Replicas: 3-20 (auto-scaled)

**PostgreSQL:**
- Requests: 500m CPU, 2Gi memory
- Limits: 2000m CPU, 4Gi memory
- Storage: 100Gi

**Redis:**
- Requests: 100m CPU, 512Mi memory
- Limits: 500m CPU, 1Gi memory
- Storage: 10Gi

## 🔄 Auto-Scaling

The deployment includes Horizontal Pod Autoscaler (HPA) configuration:

- **Min Replicas:** 3
- **Max Replicas:** 20
- **CPU Target:** 70%
- **Memory Target:** 80%

Scale behavior:
- **Scale Up:** Fast (100% increase or 4 pods per 30s)
- **Scale Down:** Gradual (50% decrease or 2 pods per 60s, 5min stabilization)

## 🌐 Ingress Configuration

The ingress is configured with:

- **SSL/TLS:** Automatic via cert-manager
- **Rate Limiting:** 100 req/s per IP
- **CORS:** Enabled for specified origins
- **WebSocket:** Supported
- **Body Size Limit:** 10MB

### Custom Domain

Update `ingress.yaml` to use your domain:

```yaml
spec:
  tls:
  - hosts:
    - your-domain.com
    - www.your-domain.com
    secretName: your-tls-cert
  rules:
  - host: your-domain.com
    # ...
```

## 📈 Monitoring

### Health Checks

The application includes health endpoints:

- **Liveness:** `/health` (checks if app is running)
- **Readiness:** `/health` (checks if app is ready to serve traffic)

### Prometheus Metrics

The deployment is annotated for Prometheus scraping:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3000"
  prometheus.io/path: "/metrics"
```

## 🔧 Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n paradigm
kubectl describe pod <pod-name> -n paradigm
```

### View Logs

```bash
# Application logs
kubectl logs -f deployment/paradigm-app -n paradigm

# Database logs
kubectl logs -f statefulset/postgres -n paradigm

# Redis logs
kubectl logs -f deployment/redis -n paradigm
```

### Check Events

```bash
kubectl get events -n paradigm --sort-by='.lastTimestamp'
```

### Common Issues

**Pods not starting:**
- Check if secrets are created: `kubectl get secrets -n paradigm`
- Check if PVCs are bound: `kubectl get pvc -n paradigm`
- Check resource availability: `kubectl describe nodes`

**Database connection errors:**
- Verify PostgreSQL is running: `kubectl get pods -l component=database -n paradigm`
- Check database logs: `kubectl logs statefulset/postgres -n paradigm`
- Verify connection string in ConfigMap

**Ingress not working:**
- Check ingress controller: `kubectl get pods -n ingress-nginx`
- Verify ingress resource: `kubectl describe ingress paradigm-ingress -n paradigm`
- Check DNS resolution

## 🔄 Updates and Rollbacks

### Update Application

```bash
# Update image
kubectl set image deployment/paradigm-app paradigm=ghcr.io/11vated/paradigm:v2.1.0 -n paradigm

# Check rollout status
kubectl rollout status deployment/paradigm-app -n paradigm
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/paradigm-app -n paradigm

# Rollback to specific revision
kubectl rollout undo deployment/paradigm-app --to-revision=2 -n paradigm
```

### View Rollout History

```bash
kubectl rollout history deployment/paradigm-app -n paradigm
```

## 🗑️ Cleanup

### Delete All Resources

```bash
kubectl delete namespace paradigm
```

### Delete Specific Resources

```bash
kubectl delete -f deployment.yaml
kubectl delete -f service.yaml
# etc.
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)

## 🆘 Support

For issues or questions:
- GitHub Issues: https://github.com/11vated/Paradigm/issues
- Documentation: https://paradigm.ai/docs
- Email: support@paradigm.ai

---

**Last Updated:** June 2026  
**Version:** 2.0.0  
**Paradigm Absolute** — Deterministic Synthetic Evolution Operating System