# Backup & Recovery Runbook — Paradigm Absolute

## Overview

This runbook provides procedures for backing up and recovering Paradigm Absolute data, including databases, files, configurations, and disaster recovery scenarios.

**Audience:** DevOps Engineers, SREs, Database Administrators  
**Last Updated:** June 19, 2026

---

## Backup Strategy

### RTO/RPO Targets

| Component | RPO (Data Loss) | RTO (Recovery Time) |
|-----------|-----------------|---------------------|
| Database | 5 minutes | 30 minutes |
| Redis Cache | 15 minutes | 15 minutes |
| S3 Files | 1 hour | 1 hour |
| Configuration | 0 (version controlled) | 15 minutes |
| Secrets | 0 (Vault HA) | 5 minutes |

### Backup Schedule

**Automated Backups:**
- **Database:** Continuous (WAL archiving) + Daily snapshots
- **Redis:** Every 15 minutes (RDB) + AOF
- **S3:** Versioning enabled (automatic)
- **Configuration:** Git commits (automatic)
- **Secrets:** Vault snapshots (daily)

**Retention Policy:**
- **Hourly:** 24 hours
- **Daily:** 30 days
- **Weekly:** 12 weeks
- **Monthly:** 12 months
- **Yearly:** 7 years (compliance)

---

## Database Backup & Recovery

### PostgreSQL (RDS)

**Automated Backups:**
```bash
# RDS automated backups are enabled by default
aws rds describe-db-instances \
  --db-instance-identifier paradigm-postgres \
  --query 'DBInstances[0].BackupRetentionPeriod'

# Verify backup window
aws rds describe-db-instances \
  --db-instance-identifier paradigm-postgres \
  --query 'DBInstances[0].PreferredBackupWindow'
```

**Manual Snapshot:**
```bash
# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier paradigm-postgres \
  --db-snapshot-identifier paradigm-manual-$(date +%Y%m%d-%H%M%S)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier paradigm-postgres

# Copy snapshot to another region (DR)
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:paradigm-manual-20260619-120000 \
  --target-db-snapshot-identifier paradigm-dr-20260619-120000 \
  --region us-west-2
```

**Point-in-Time Recovery:**
```bash
# Restore to specific time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier paradigm-postgres \
  --target-db-instance-identifier paradigm-postgres-restored \
  --restore-time 2026-06-19T12:00:00Z

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier paradigm-postgres-restored \
  --db-snapshot-identifier paradigm-manual-20260619-120000
```

**Verify Backup:**
```bash
# Check latest backup
aws rds describe-db-instances \
  --db-instance-identifier paradigm-postgres \
  --query 'DBInstances[0].LatestRestorableTime'

# Test restore (staging)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier paradigm-postgres-test \
  --db-snapshot-identifier paradigm-manual-20260619-120000 \
  --db-instance-class db.t3.medium

# Verify data
kubectl run -it --rm psql --image=postgres:15 --restart=Never -- \
  psql -h paradigm-postgres-test.xxx.rds.amazonaws.com -U paradigm -d paradigm -c "SELECT COUNT(*) FROM seeds;"
```

### Redis (ElastiCache)

**Automated Backups:**
```bash
# Verify backup configuration
aws elasticache describe-replication-groups \
  --replication-group-id paradigm-redis \
  --query 'ReplicationGroups[0].SnapshotRetentionLimit'

# List snapshots
aws elasticache describe-snapshots \
  --replication-group-id paradigm-redis
```

**Manual Snapshot:**
```bash
# Create snapshot
aws elasticache create-snapshot \
  --replication-group-id paradigm-redis \
  --snapshot-name paradigm-redis-manual-$(date +%Y%m%d-%H%M%S)

# Copy snapshot to S3 (for long-term storage)
aws elasticache copy-snapshot \
  --source-snapshot-name paradigm-redis-manual-20260619-120000 \
  --target-snapshot-name paradigm-redis-archive-20260619-120000 \
  --target-bucket paradigm-backups
```

**Recovery:**
```bash
# Restore from snapshot
aws elasticache create-replication-group \
  --replication-group-id paradigm-redis-restored \
  --replication-group-description "Restored from snapshot" \
  --snapshot-name paradigm-redis-manual-20260619-120000 \
  --cache-node-type cache.r6g.large \
  --engine redis
```

---

## File Backup & Recovery

### S3 Buckets

**Versioning (Enabled):**
```bash
# Verify versioning
aws s3api get-bucket-versioning --bucket paradigm-seeds

# List versions
aws s3api list-object-versions --bucket paradigm-seeds --prefix seeds/

# Restore specific version
aws s3api copy-object \
  --bucket paradigm-seeds \
  --copy-source paradigm-seeds/seeds/abc123.json?versionId=xyz789 \
  --key seeds/abc123.json
```

**Cross-Region Replication:**
```bash
# Verify replication
aws s3api get-bucket-replication --bucket paradigm-seeds

# Check replication status
aws s3api head-object \
  --bucket paradigm-seeds-replica \
  --key seeds/abc123.json \
  --query 'ReplicationStatus'
```

**Backup to Glacier:**
```bash
# Configure lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket paradigm-seeds \
  --lifecycle-configuration file://lifecycle-policy.json

# lifecycle-policy.json:
{
  "Rules": [
    {
      "Id": "Archive old seeds",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

**Recovery:**
```bash
# Restore from Glacier
aws s3api restore-object \
  --bucket paradigm-seeds \
  --key seeds/abc123.json \
  --restore-request Days=7,GlacierJobParameters={Tier=Standard}

# Check restore status
aws s3api head-object \
  --bucket paradigm-seeds \
  --key seeds/abc123.json \
  --query 'Restore'

# Download after restore
aws s3 cp s3://paradigm-seeds/seeds/abc123.json ./
```

---

## Configuration Backup & Recovery

### Kubernetes Manifests

**Backup:**
```bash
# Export all resources
kubectl get all -n paradigm -o yaml > backup-$(date +%Y%m%d).yaml

# Export specific resources
kubectl get configmap -n paradigm -o yaml > configmaps-$(date +%Y%m%d).yaml
kubectl get secret -n paradigm -o yaml > secrets-$(date +%Y%m%d).yaml
kubectl get deployment -n paradigm -o yaml > deployments-$(date +%Y%m%d).yaml

# Backup to S3
aws s3 cp backup-$(date +%Y%m%d).yaml s3://paradigm-backups/kubernetes/
```

**Recovery:**
```bash
# Restore from backup
kubectl apply -f backup-20260619.yaml

# Verify
kubectl get all -n paradigm
```

### Vault Secrets

**Backup:**
```bash
# Create Vault snapshot
kubectl exec -n vault vault-0 -- vault operator raft snapshot save /tmp/vault-snapshot-$(date +%Y%m%d).snap

# Copy snapshot out
kubectl cp vault/vault-0:/tmp/vault-snapshot-20260619.snap ./vault-snapshot-20260619.snap

# Upload to S3
aws s3 cp vault-snapshot-20260619.snap s3://paradigm-backups/vault/
```

**Recovery:**
```bash
# Download snapshot
aws s3 cp s3://paradigm-backups/vault/vault-snapshot-20260619.snap ./

# Copy to pod
kubectl cp vault-snapshot-20260619.snap vault/vault-0:/tmp/

# Restore snapshot
kubectl exec -n vault vault-0 -- vault operator raft snapshot restore /tmp/vault-snapshot-20260619.snap
```

---

## Disaster Recovery Scenarios

### Scenario 1: Complete Database Loss

**Detection:**
- Database unreachable
- All queries failing
- RDS instance terminated

**Recovery Steps:**
```bash
# 1. Identify latest snapshot
LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
  --db-instance-identifier paradigm-postgres \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-1].DBSnapshotIdentifier' \
  --output text)

# 2. Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier paradigm-postgres-new \
  --db-snapshot-identifier $LATEST_SNAPSHOT \
  --db-instance-class db.r6g.xlarge \
  --multi-az

# 3. Wait for availability
aws rds wait db-instance-available \
  --db-instance-identifier paradigm-postgres-new

# 4. Update application configuration
kubectl patch configmap paradigm-config -n paradigm \
  -p '{"data":{"DATABASE_URL":"postgres://paradigm-postgres-new.xxx.rds.amazonaws.com:5432/paradigm"}}'

# 5. Restart application
kubectl rollout restart deployment/paradigm-app -n paradigm

# 6. Verify connectivity
kubectl exec -n paradigm $(kubectl get pod -n paradigm -l app=paradigm-app -o jsonpath='{.items[0].metadata.name}') -- \
  curl -s http://localhost:3000/api/health
```

**Expected Recovery Time:** 30 minutes  
**Data Loss:** <5 minutes (last snapshot)

### Scenario 2: Complete Region Failure

**Detection:**
- All AWS services in region unavailable
- Cannot reach any resources
- Multi-AZ failover not working

**Recovery Steps:**
```bash
# 1. Activate DR region (us-west-2)
export AWS_REGION=us-west-2

# 2. Restore database from cross-region snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier paradigm-postgres-dr \
  --db-snapshot-identifier paradigm-dr-latest \
  --region us-west-2

# 3. Deploy Kubernetes to DR cluster
kubectl config use-context paradigm-eks-dr
kubectl apply -f kubernetes/

# 4. Update DNS to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://route53-dr.json

# 5. Verify application
curl https://api.paradigm.com/api/health
```

**Expected Recovery Time:** 2 hours  
**Data Loss:** <1 hour (cross-region replication lag)

### Scenario 3: Accidental Data Deletion

**Detection:**
- User reports missing data
- Audit logs show DELETE operations
- Data integrity check fails

**Recovery Steps:**
```bash
# 1. Identify deletion time
kubectl logs -n paradigm -l app=paradigm-app --since=24h | grep DELETE

# 2. Restore database to point before deletion
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier paradigm-postgres \
  --target-db-instance-identifier paradigm-postgres-recovery \
  --restore-time 2026-06-19T11:55:00Z

# 3. Extract deleted data
kubectl run -it --rm psql --image=postgres:15 --restart=Never -- \
  psql -h paradigm-postgres-recovery.xxx.rds.amazonaws.com -U paradigm -d paradigm \
  -c "COPY (SELECT * FROM seeds WHERE deleted_at IS NOT NULL) TO STDOUT CSV HEADER" > deleted-seeds.csv

# 4. Restore data to production
kubectl run -it --rm psql --image=postgres:15 --restart=Never -- \
  psql -h paradigm-postgres.xxx.rds.amazonaws.com -U paradigm -d paradigm \
  -c "\COPY seeds FROM 'deleted-seeds.csv' CSV HEADER"

# 5. Verify restoration
kubectl exec -n paradigm $(kubectl get pod -n paradigm -l app=paradigm-app -o jsonpath='{.items[0].metadata.name}') -- \
  curl -s http://localhost:3000/api/seeds/count
```

**Expected Recovery Time:** 1 hour  
**Data Loss:** 0 (point-in-time recovery)

### Scenario 4: Ransomware Attack

**Detection:**
- Files encrypted
- Ransom note found
- Unusual file modifications

**Recovery Steps:**
```bash
# 1. Isolate affected systems
kubectl scale deployment paradigm-app -n paradigm --replicas=0
aws ec2 modify-security-group-rules --group-id sg-xxx --ingress-rules "[]"

# 2. Identify last clean backup
aws s3api list-object-versions --bucket paradigm-seeds \
  --query 'Versions[?LastModified<`2026-06-19T10:00:00Z`]'

# 3. Restore from clean backup
aws s3 sync s3://paradigm-seeds-replica/ s3://paradigm-seeds/ \
  --delete \
  --exclude "*" \
  --include "*.json"

# 4. Restore database from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier paradigm-postgres-clean \
  --db-snapshot-identifier paradigm-manual-20260619-090000

# 5. Scan for malware
# Run security scan on all systems

# 6. Restore service
kubectl scale deployment paradigm-app -n paradigm --replicas=10
```

**Expected Recovery Time:** 4 hours  
**Data Loss:** Variable (depends on attack detection time)

---

## Backup Verification

### Monthly Backup Test

**Procedure:**
```bash
# 1. Restore to test environment
./scripts/restore-to-test.sh

# 2. Run integrity checks
npm run test:integrity

# 3. Verify data completeness
psql -h test-db -U paradigm -d paradigm -c "SELECT COUNT(*) FROM seeds;"
psql -h test-db -U paradigm -d paradigm -c "SELECT COUNT(*) FROM users;"

# 4. Test application functionality
npm run test:e2e -- --env=test

# 5. Document results
echo "Backup test completed: $(date)" >> backup-test-log.txt
```

**Success Criteria:**
- All data restored successfully
- No corruption detected
- Application fully functional
- Recovery time within RTO

---

## Backup Monitoring

### Metrics to Monitor

**Database:**
- Last backup time
- Backup size
- Backup duration
- Backup success rate

**S3:**
- Replication lag
- Version count
- Storage usage
- Glacier restore requests

**Vault:**
- Snapshot age
- Snapshot size
- HA status

### Alerts

**Critical:**
- Backup failed (3 consecutive failures)
- Backup age >24 hours
- Replication lag >1 hour
- Vault unsealed

**Warning:**
- Backup duration >1 hour
- Storage usage >80%
- Replication lag >15 minutes

---

## Backup Costs

### Monthly Estimates

**RDS Backups:**
- Automated backups: Included (up to DB size)
- Manual snapshots: $0.095/GB-month
- Cross-region copy: $0.02/GB transfer

**S3:**
- Standard storage: $0.023/GB-month
- Versioning overhead: ~20% additional
- Glacier: $0.004/GB-month
- Cross-region replication: $0.02/GB transfer

**Total Monthly Cost:**
- Database backups: ~$50/month (500GB)
- S3 backups: ~$100/month (4TB)
- Glacier archives: ~$20/month (5TB)
- **Total:** ~$170/month

---

## Compliance

### Retention Requirements

**GDPR:**
- User data: Retain for service duration + 30 days
- Deleted data: Purge after 30 days
- Backup encryption: Required

**SOC 2:**
- Backup testing: Quarterly
- Backup documentation: Required
- Backup monitoring: Required

**HIPAA:**
- Backup encryption: Required (AES-256)
- Access logging: Required
- Retention: 6 years minimum

---

## Contacts

**Database Administrator:** dba@paradigm.com  
**DevOps Lead:** devops-lead@paradigm.com  
**Security Team:** security@paradigm.com  
**Compliance Officer:** compliance@paradigm.com

---

**Last Updated:** June 19, 2026  
**Next Review:** July 19, 2026  
**Next Backup Test:** July 1, 2026