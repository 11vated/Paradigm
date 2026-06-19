# Security Incident Runbook — Paradigm Absolute

## Overview

This runbook provides procedures for responding to security incidents, including detection, containment, eradication, recovery, and post-incident analysis.

**Audience:** Security Team, DevOps Engineers, SREs  
**Last Updated:** June 19, 2026

---

## Incident Classification

### Severity Levels

**SEV-1: Critical Security Incident**
- **Impact:** Active breach, data exfiltration, ransomware
- **Response Time:** Immediate (5 minutes)
- **Examples:** Database breach, credential theft, active attack
- **Actions:** Page entire security team, notify executive team, activate IR plan

**SEV-2: High Security Incident**
- **Impact:** Potential breach, vulnerability exploitation attempt
- **Response Time:** 15 minutes
- **Examples:** Failed intrusion attempts, suspicious activity, vulnerability discovered
- **Actions:** Page security lead, investigate immediately, prepare containment

**SEV-3: Medium Security Incident**
- **Impact:** Security policy violation, minor vulnerability
- **Response Time:** 1 hour
- **Examples:** Weak password, misconfiguration, outdated dependency
- **Actions:** Create ticket, investigate, remediate

**SEV-4: Low Security Incident**
- **Impact:** Informational, no immediate threat
- **Response Time:** Next business day
- **Examples:** Security scan findings, policy questions
- **Actions:** Document, schedule review

---

## Incident Response Process

### Phase 1: Detection & Identification (0-15 minutes)

**Automated Detection:**
- WAF blocks (>100/minute)
- Failed authentication attempts (>50/minute)
- Unusual database queries
- Vault access violations
- Network policy violations
- IDS/IPS alerts

**Manual Detection:**
- User report
- Security audit finding
- Penetration test result
- Threat intelligence

**Initial Assessment:**
```bash
# Check WAF blocks
aws wafv2 get-sampled-requests \
  --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:regional/webacl/paradigm/xxx \
  --rule-metric-name RateLimitRule \
  --scope REGIONAL \
  --time-window StartTime=$(date -u -d '10 minutes ago' +%s),EndTime=$(date -u +%s) \
  --max-items 100

# Check failed auth attempts
kubectl logs -n paradigm -l app=paradigm-app --since=10m | grep "Authentication failed"

# Check Vault audit log
kubectl exec -n vault vault-0 -- cat /vault/logs/audit.log | tail -100

# Check database connections
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### Phase 2: Containment (15-30 minutes)

**Immediate Actions:**

**1. Isolate Affected Systems:**
```bash
# Block suspicious IP at WAF
aws wafv2 update-ip-set \
  --id xxx \
  --scope REGIONAL \
  --addresses "1.2.3.4/32"

# Block at network level
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-suspicious-ip
  namespace: paradigm
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 1.2.3.4/32
EOF

# Revoke compromised credentials
kubectl exec -n vault vault-0 -- vault token revoke -accessor <accessor-id>
```

**2. Enable Enhanced Logging:**
```bash
# Increase log verbosity
kubectl patch configmap paradigm-config -n paradigm \
  -p '{"data":{"LOG_LEVEL":"debug"}}'

# Enable audit logging
kubectl patch configmap paradigm-config -n paradigm \
  -p '{"data":{"AUDIT_ENABLED":"true"}}'

# Restart pods
kubectl rollout restart deployment/paradigm-app -n paradigm
```

**3. Preserve Evidence:**
```bash
# Capture pod logs
kubectl logs -n paradigm -l app=paradigm-app --all-containers > incident-logs-$(date +%Y%m%d-%H%M%S).log

# Capture network traffic
kubectl exec -n paradigm <pod> -- tcpdump -w /tmp/capture.pcap

# Export database audit log
kubectl exec -n paradigm postgres-0 -- pg_dump -U paradigm -t audit_log > audit-$(date +%Y%m%d-%H%M%S).sql

# Upload to secure storage
aws s3 cp incident-logs-*.log s3://paradigm-security-incidents/$(date +%Y%m%d)/
```

### Phase 3: Eradication (30-120 minutes)

**Remove Threat:**

**1. Malware/Backdoor:**
```bash
# Scan for malware
kubectl exec -n paradigm <pod> -- clamscan -r /app

# Remove malicious files
kubectl exec -n paradigm <pod> -- rm -f /app/malicious-file.js

# Rebuild from clean image
kubectl set image deployment/paradigm-app -n paradigm app=paradigm/app:clean-version
```

**2. Compromised Credentials:**
```bash
# Rotate all secrets
./scripts/rotate-secrets.sh

# Force password reset for all users
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "UPDATE users SET password_reset_required = true;"

# Revoke all active sessions
kubectl exec -n paradigm redis-0 -- redis-cli FLUSHDB
```

**3. Vulnerability Patching:**
```bash
# Update dependencies
npm audit fix

# Rebuild and deploy
docker build -t paradigm/app:patched .
docker push paradigm/app:patched
kubectl set image deployment/paradigm-app -n paradigm app=paradigm/app:patched
```

### Phase 4: Recovery (1-4 hours)

**Restore Normal Operations:**

**1. Verify System Integrity:**
```bash
# Run security scan
trivy image paradigm/app:latest

# Verify checksums
sha256sum /app/*.js | diff - checksums.txt

# Test functionality
npm run test:security
```

**2. Restore from Clean Backup (if needed):**
```bash
# Restore database
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier paradigm-postgres-clean \
  --db-snapshot-identifier paradigm-pre-incident

# Restore files
aws s3 sync s3://paradigm-seeds-backup/ s3://paradigm-seeds/ --delete
```

**3. Gradual Service Restoration:**
```bash
# Start with minimal replicas
kubectl scale deployment paradigm-app -n paradigm --replicas=1

# Monitor for 15 minutes
watch kubectl get pods -n paradigm

# Gradually increase
kubectl scale deployment paradigm-app -n paradigm --replicas=5
kubectl scale deployment paradigm-app -n paradigm --replicas=10
```

### Phase 5: Post-Incident (24-48 hours)

**Analysis & Documentation:**

**1. Root Cause Analysis:**
- How did the attacker gain access?
- What vulnerabilities were exploited?
- What data was accessed/exfiltrated?
- How long was the attacker present?
- What systems were compromised?

**2. Timeline Reconstruction:**
```bash
# Analyze logs
cat incident-logs-*.log | grep "suspicious-ip" | sort

# Database audit trail
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT * FROM audit_log WHERE timestamp BETWEEN '2026-06-19 10:00:00' AND '2026-06-19 12:00:00' ORDER BY timestamp;"

# WAF logs
aws logs filter-log-events \
  --log-group-name /aws/wafv2/paradigm \
  --start-time $(date -d '2 hours ago' +%s)000 \
  --filter-pattern "1.2.3.4"
```

**3. Impact Assessment:**
- Users affected: [Number]
- Data compromised: [Description]
- Downtime: [Duration]
- Financial impact: $[Amount]
- Reputational impact: [Assessment]

---

## Common Security Incidents

### 1. SQL Injection Attack

**Detection:**
```bash
# WAF blocks
aws wafv2 get-sampled-requests --rule-metric-name SQLInjectionRule

# Application logs
kubectl logs -n paradigm -l app=paradigm-app | grep "SQL injection"
```

**Response:**
```bash
# Block attacker IP
aws wafv2 update-ip-set --addresses "1.2.3.4/32"

# Review affected queries
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT query FROM pg_stat_statements WHERE query LIKE '%UNION%' OR query LIKE '%DROP%';"

# Patch vulnerability
# Update code to use parameterized queries
git commit -m "Fix SQL injection vulnerability"
git push
```

### 2. Credential Stuffing Attack

**Detection:**
```bash
# Failed login attempts
kubectl logs -n paradigm -l app=paradigm-app | grep "Login failed" | wc -l

# Rate limit triggers
curl https://prometheus.paradigm.com/api/v1/query?query=rate(http_requests_total{status="429"}[5m])
```

**Response:**
```bash
# Enable CAPTCHA
kubectl patch configmap paradigm-config -n paradigm \
  -p '{"data":{"CAPTCHA_ENABLED":"true"}}'

# Force MFA for all users
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "UPDATE users SET mfa_required = true;"

# Block attack source
aws wafv2 update-ip-set --addresses "1.2.3.0/24"
```

### 3. DDoS Attack

**Detection:**
```bash
# Request rate spike
curl https://prometheus.paradigm.com/api/v1/query?query=rate(http_requests_total[1m])

# WAF rate limit blocks
aws wafv2 get-sampled-requests --rule-metric-name RateLimitRule
```

**Response:**
```bash
# Enable CloudFront DDoS protection
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --distribution-config file://cloudfront-ddos-config.json

# Reduce WAF rate limit temporarily
aws wafv2 update-web-acl --rate-limit 500

# Scale up infrastructure
kubectl scale deployment paradigm-app -n paradigm --replicas=50
```

### 4. Data Exfiltration

**Detection:**
```bash
# Unusual data transfer
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BytesDownloaded \
  --dimensions Name=BucketName,Value=paradigm-seeds \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Suspicious database queries
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT * FROM pg_stat_statements WHERE calls > 1000 ORDER BY calls DESC LIMIT 10;"
```

**Response:**
```bash
# Block data export
kubectl patch configmap paradigm-config -n paradigm \
  -p '{"data":{"EXPORT_DISABLED":"true"}}'

# Revoke API keys
kubectl exec -n vault vault-0 -- vault kv delete secret/api-keys/compromised

# Enable data loss prevention
aws s3api put-bucket-policy --bucket paradigm-seeds --policy file://dlp-policy.json
```

### 5. Insider Threat

**Detection:**
```bash
# Unusual admin activity
kubectl logs -n paradigm -l app=paradigm-app | grep "admin" | grep -E "(DELETE|DROP|TRUNCATE)"

# After-hours access
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "SELECT * FROM audit_log WHERE action = 'admin_access' AND EXTRACT(HOUR FROM timestamp) NOT BETWEEN 9 AND 17;"
```

**Response:**
```bash
# Suspend user account
kubectl exec -n paradigm postgres-0 -- psql -U paradigm -c "UPDATE users SET suspended = true WHERE id = 'suspicious-user-id';"

# Revoke access
kubectl exec -n vault vault-0 -- vault token revoke -accessor <accessor-id>

# Enable enhanced monitoring
kubectl patch configmap paradigm-config -n paradigm \
  -p '{"data":{"ADMIN_AUDIT_LEVEL":"verbose"}}'
```

---

## Notification Procedures

### Internal Notifications

**Immediate (SEV-1):**
- Security team (PagerDuty)
- CTO (phone)
- CEO (phone)
- Legal (email)

**Within 1 Hour (SEV-1/SEV-2):**
- Engineering team (Slack)
- Customer support (email)
- PR team (email)

### External Notifications

**Regulatory (if applicable):**
- GDPR: 72 hours
- HIPAA: 60 days
- PCI DSS: Immediately

**Customer Notifications:**
- Affected users: Within 24 hours
- All users: Within 48 hours (if widespread)
- Public disclosure: After containment

**Template:**
```
Subject: Security Incident Notification

Dear [User],

We are writing to inform you of a security incident that may have affected your account.

What Happened:
[Brief description]

What Information Was Involved:
[List of data types]

What We Are Doing:
[Response actions]

What You Should Do:
[User actions]

For More Information:
security@paradigm.com

Sincerely,
Paradigm Security Team
```

---

## Evidence Collection

### Digital Forensics

**Preserve Evidence:**
```bash
# Create forensic image
kubectl exec -n paradigm <pod> -- dd if=/dev/sda of=/tmp/forensic-image.dd bs=4M

# Calculate hash
kubectl exec -n paradigm <pod> -- sha256sum /tmp/forensic-image.dd

# Secure transfer
kubectl cp paradigm/<pod>:/tmp/forensic-image.dd ./evidence/
```

**Chain of Custody:**
- Document who collected evidence
- Document when evidence was collected
- Document where evidence is stored
- Document who has accessed evidence

---

## Legal & Compliance

### Reporting Requirements

**GDPR (EU):**
- Report to supervisory authority within 72 hours
- Notify affected individuals without undue delay
- Document breach in internal records

**HIPAA (US Healthcare):**
- Report to HHS within 60 days
- Notify affected individuals within 60 days
- Notify media if >500 individuals affected

**PCI DSS (Payment Cards):**
- Notify payment brands immediately
- Notify acquiring bank immediately
- Forensic investigation required

### Legal Hold

**Preserve All Evidence:**
- Do not delete logs
- Do not modify systems
- Do not destroy backups
- Document all actions

---

## Post-Incident Improvements

### Security Enhancements

**Immediate (Week 1):**
- Patch vulnerabilities
- Rotate credentials
- Update WAF rules
- Enhance monitoring

**Short-term (Month 1):**
- Security training
- Process improvements
- Tool upgrades
- Penetration testing

**Long-term (Quarter 1):**
- Architecture review
- Security audit
- Compliance certification
- Disaster recovery drill

---

## Contacts

**Security Team Lead:** security-lead@paradigm.com / +1-555-0104  
**Incident Commander:** incident-commander@paradigm.com / +1-555-0105  
**Legal Counsel:** legal@paradigm.com / +1-555-0106  
**PR/Communications:** pr@paradigm.com / +1-555-0107  
**Forensics Partner:** forensics@partner.com / +1-555-0108

**Emergency Hotline:** +1-555-SECURITY (24/7)

---

**Last Updated:** June 19, 2026  
**Next Review:** July 19, 2026  
**Next Security Drill:** July 1, 2026