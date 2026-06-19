# Incident Response Runbook — Paradigm Absolute

## Overview

This runbook provides procedures for responding to production incidents, including detection, triage, resolution, and post-mortem analysis.

**Audience:** On-call Engineers, SREs, DevOps  
**Last Updated:** June 19, 2026

---

## Incident Severity Levels

### SEV-1: Critical (P0)
**Impact:** Complete service outage or data loss  
**Response Time:** Immediate (5 minutes)  
**Examples:**
- API completely down
- Database unavailable
- Data corruption
- Security breach
- Payment processing failure

**Actions:**
- Page entire on-call team
- Create war room
- Notify executive team
- Update status page immediately

### SEV-2: High (P1)
**Impact:** Major functionality degraded  
**Response Time:** 15 minutes  
**Examples:**
- Seed generation failing
- High error rate (>5%)
- Slow response times (>2s p95)
- Authentication issues
- Critical feature broken

**Actions:**
- Page primary on-call
- Create incident channel
- Notify engineering manager
- Update status page

### SEV-3: Medium (P2)
**Impact:** Minor functionality degraded  
**Response Time:** 1 hour  
**Examples:**
- Non-critical feature broken
- Moderate error rate (1-5%)
- Slow response times (1-2s p95)
- UI issues
- Third-party integration down

**Actions:**
- Notify on-call engineer
- Create ticket
- Update internal status

### SEV-4: Low (P3)
**Impact:** Minimal user impact  
**Response Time:** Next business day  
**Examples:**
- Cosmetic issues
- Low error rate (<1%)
- Documentation errors
- Minor performance degradation

**Actions:**
- Create ticket
- Schedule fix

---

## Incident Response Process

### Phase 1: Detection (0-5 minutes)

**Automated Detection:**
- PagerDuty alert triggered
- Grafana alert fired
- Synthetic monitoring failure
- Error rate threshold exceeded

**Manual Detection:**
- User report
- Support ticket
- Social media mention
- Internal discovery

**Initial Actions:**
1. Acknowledge alert in PagerDuty
2. Check Grafana dashboards
3. Review recent deployments
4. Check #incidents Slack channel

### Phase 2: Triage (5-15 minutes)

**Assess Severity:**
```bash
# Check service health
curl https://api.paradigm.com/api/health

# Check error rate
curl https://prometheus.paradigm.com/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])

# Check response time
curl https://prometheus.paradigm.com/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))

# Check pod status
kubectl get pods -n paradigm

# Check recent logs
kubectl logs -n paradigm -l app=paradigm-app --tail=100 --since=10m
```

**Determine Impact:**
- How many users affected?
- Which features are impacted?
- Is data at risk?
- Is security compromised?

**Assign Severity Level:**
- Use severity matrix above
- When in doubt, escalate

### Phase 3: Communication (Ongoing)

**Create Incident Channel:**
```
/incident create "Brief description" SEV-1
```

**Update Status Page:**
```bash
# Via API
curl -X POST https://status.paradigm.com/api/incidents \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -d '{
    "name": "API Degradation",
    "status": "investigating",
    "impact": "major",
    "components": ["api", "seed-generation"]
  }'
```

**Communication Templates:**

**Initial Update (Within 5 minutes):**
```
We are investigating reports of [issue]. Our team is actively working on this.
Status: Investigating
Impact: [Major/Minor]
ETA: Unknown
```

**Progress Update (Every 15-30 minutes):**
```
Update: We have identified the root cause as [cause]. We are implementing a fix.
Status: Identified
Impact: [Major/Minor]
ETA: [Time]
```

**Resolution Update:**
```
The issue has been resolved. All systems are operating normally.
Status: Resolved
Root Cause: [Brief explanation]
Prevention: [Steps taken]
```

### Phase 4: Investigation (15-60 minutes)

**Check Recent Changes:**
```bash
# Recent deployments
kubectl rollout history deployment/paradigm-app -n paradigm

# Recent commits
git log --oneline --since="2 hours ago"

# Recent configuration changes
kubectl diff -f kubernetes/
```

**Check System Health:**
```bash
# CPU and memory
kubectl top pods -n paradigm

# Disk usage
kubectl exec -n paradigm <pod> -- df -h

# Network connectivity
kubectl exec -n paradigm <pod> -- nc -zv postgres 5432
kubectl exec -n paradigm <pod> -- nc -zv redis 6379
```

**Check Dependencies:**
```bash
# Database
kubectl exec -n paradigm postgres-0 -- pg_isready

# Redis
kubectl exec -n paradigm redis-0 -- redis-cli ping

# External APIs
curl -I https://api.openai.com/v1/models
```

**Analyze Logs:**
```bash
# Application logs
kubectl logs -n paradigm -l app=paradigm-app --tail=1000 | grep ERROR

# Database logs
kubectl logs -n paradigm postgres-0 --tail=500

# Nginx logs
kubectl logs -n paradigm -l app=nginx --tail=500
```

**Check Metrics:**
- Open Grafana dashboards
- Look for anomalies in:
  - Request rate
  - Error rate
  - Response time
  - CPU/memory usage
  - Database connections
  - Cache hit rate

### Phase 5: Mitigation (Immediate)

**Quick Fixes:**

**Rollback Deployment:**
```bash
kubectl rollout undo deployment/paradigm-app -n paradigm
kubectl rollout status deployment/paradigm-app -n paradigm
```

**Scale Up:**
```bash
kubectl scale deployment paradigm-app -n paradigm --replicas=20
```

**Restart Pods:**
```bash
kubectl rollout restart deployment/paradigm-app -n paradigm
```

**Clear Cache:**
```bash
kubectl exec -n paradigm redis-0 -- redis-cli FLUSHALL
```

**Kill Problematic Connections:**
```bash
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < now() - interval '5 minutes';"
```

**Enable Maintenance Mode:**
```bash
kubectl patch configmap paradigm-config -n paradigm \
  -p '{"data":{"MAINTENANCE_MODE":"true"}}'
kubectl rollout restart deployment/paradigm-app -n paradigm
```

### Phase 6: Resolution (Variable)

**Implement Fix:**
1. Identify root cause
2. Develop fix
3. Test fix in staging
4. Deploy fix to production
5. Verify resolution

**Verification Checklist:**
- [ ] Error rate back to normal (<0.1%)
- [ ] Response time back to normal (<500ms p95)
- [ ] All pods healthy
- [ ] No errors in logs
- [ ] Metrics stable for 15 minutes
- [ ] User reports resolved

### Phase 7: Post-Incident (Within 24 hours)

**Close Incident:**
```bash
# Update status page
curl -X PATCH https://status.paradigm.com/api/incidents/$INCIDENT_ID \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -d '{"status": "resolved"}'

# Close PagerDuty incident
pagerduty incident resolve $INCIDENT_ID

# Archive Slack channel
/archive #incident-2026-06-19-api-down
```

**Document Incident:**
- Timeline of events
- Root cause analysis
- Impact assessment
- Resolution steps
- Lessons learned

---

## Common Incidents

### API Down

**Symptoms:**
- Health check failing
- 502/503 errors
- No response from API

**Investigation:**
```bash
# Check pods
kubectl get pods -n paradigm

# Check logs
kubectl logs -n paradigm -l app=paradigm-app --tail=100

# Check ingress
kubectl describe ingress -n paradigm

# Check service
kubectl describe service paradigm-app -n paradigm
```

**Resolution:**
- Restart pods: `kubectl rollout restart deployment/paradigm-app -n paradigm`
- Scale up: `kubectl scale deployment paradigm-app -n paradigm --replicas=10`
- Check resource limits
- Check database connectivity

### Database Connection Pool Exhausted

**Symptoms:**
- "Too many connections" errors
- Slow queries
- Timeouts

**Investigation:**
```bash
# Check connections
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT count(*) FROM pg_stat_activity;"

# Check idle connections
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';"
```

**Resolution:**
```bash
# Kill idle connections
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '5 minutes';"

# Increase max_connections (temporary)
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "ALTER SYSTEM SET max_connections = 300;"
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT pg_reload_conf();"

# Scale down application (reduce connection pressure)
kubectl scale deployment paradigm-app -n paradigm --replicas=5
```

### High Memory Usage / OOM Kills

**Symptoms:**
- Pods restarting frequently
- OOMKilled status
- Slow performance

**Investigation:**
```bash
# Check memory usage
kubectl top pods -n paradigm

# Check pod events
kubectl describe pod <pod-name> -n paradigm | grep -A 10 Events

# Check memory limits
kubectl get deployment paradigm-app -n paradigm -o yaml | grep -A 5 resources
```

**Resolution:**
```bash
# Increase memory limits
kubectl patch deployment paradigm-app -n paradigm \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"limits":{"memory":"4Gi"}}}]}}}}'

# Restart pods
kubectl rollout restart deployment/paradigm-app -n paradigm

# Investigate memory leaks (long-term)
kubectl exec -n paradigm <pod> -- node --heap-prof app.js
```

### Redis Connection Issues

**Symptoms:**
- Cache misses
- Slow response times
- Connection timeouts

**Investigation:**
```bash
# Check Redis health
kubectl exec -n paradigm redis-0 -- redis-cli ping

# Check connections
kubectl exec -n paradigm redis-0 -- redis-cli CLIENT LIST

# Check memory
kubectl exec -n paradigm redis-0 -- redis-cli INFO memory
```

**Resolution:**
```bash
# Restart Redis
kubectl rollout restart statefulset/redis -n paradigm

# Clear cache (if corrupted)
kubectl exec -n paradigm redis-0 -- redis-cli FLUSHALL

# Increase maxmemory (if needed)
kubectl exec -n paradigm redis-0 -- redis-cli CONFIG SET maxmemory 4gb
```

### Slow Database Queries

**Symptoms:**
- High response times
- Database CPU at 100%
- Query timeouts

**Investigation:**
```bash
# Check slow queries
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check active queries
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;"
```

**Resolution:**
```bash
# Kill long-running queries
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';"

# Add missing indexes (after analysis)
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "CREATE INDEX CONCURRENTLY idx_seeds_hash ON seeds(hash);"

# Increase work_mem (temporary)
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "ALTER SYSTEM SET work_mem = '50MB';"
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT pg_reload_conf();"
```

### SSL Certificate Expired

**Symptoms:**
- HTTPS errors
- Certificate warnings
- API inaccessible

**Investigation:**
```bash
# Check certificate expiry
echo | openssl s_client -servername api.paradigm.com -connect api.paradigm.com:443 2>/dev/null | openssl x509 -noout -dates

# Check cert-manager
kubectl get certificates -n paradigm
kubectl describe certificate paradigm-tls -n paradigm
```

**Resolution:**
```bash
# Renew certificate
kubectl delete certificate paradigm-tls -n paradigm
kubectl apply -f kubernetes/certificate.yaml

# Force renewal
kubectl annotate certificate paradigm-tls -n paradigm cert-manager.io/issue-temporary-certificate="true"
```

---

## Escalation Procedures

### Level 1: On-Call Engineer
- **Response Time:** 5 minutes
- **Contact:** PagerDuty
- **Scope:** All SEV-3 and SEV-4 incidents

### Level 2: Senior Engineer
- **Response Time:** 15 minutes
- **Contact:** PagerDuty + Slack
- **Scope:** All SEV-2 incidents, escalated SEV-3

### Level 3: Engineering Manager
- **Response Time:** 30 minutes
- **Contact:** Phone + Slack
- **Scope:** All SEV-1 incidents, escalated SEV-2

### Level 4: CTO
- **Response Time:** 1 hour
- **Contact:** Phone only
- **Scope:** Critical SEV-1 incidents, security breaches

---

## Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

## Incident Summary
- **Date:** [Date]
- **Duration:** [Start] - [End] ([Duration])
- **Severity:** SEV-[1-4]
- **Impact:** [Description]
- **Root Cause:** [Brief description]

## Timeline
- **[Time]:** Incident detected
- **[Time]:** Investigation started
- **[Time]:** Root cause identified
- **[Time]:** Fix implemented
- **[Time]:** Incident resolved

## Root Cause Analysis
[Detailed explanation of what went wrong and why]

## Impact Assessment
- **Users Affected:** [Number/Percentage]
- **Revenue Impact:** $[Amount]
- **Downtime:** [Duration]
- **Data Loss:** [Yes/No, details]

## Resolution
[Detailed explanation of how the incident was resolved]

## Action Items
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]
- [ ] [Action 3] - Owner: [Name] - Due: [Date]

## Lessons Learned
### What Went Well
- [Item 1]
- [Item 2]

### What Could Be Improved
- [Item 1]
- [Item 2]

### Prevention Measures
- [Measure 1]
- [Measure 2]
```

---

## Contacts

**On-Call Rotation:** https://paradigm.pagerduty.com/schedules  
**Incident Channel:** #incidents  
**Status Page:** https://status.paradigm.com  
**Runbooks:** https://docs.paradigm.com/runbooks

**Emergency Contacts:**
- **DevOps Lead:** +1-555-0101
- **Engineering Manager:** +1-555-0102
- **CTO:** +1-555-0103
- **Security Team:** security@paradigm.com

---

**Last Updated:** June 19, 2026  
**Next Review:** July 19, 2026