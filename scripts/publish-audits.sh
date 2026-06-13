# scripts/publish-audits.sh (or .ps1)
# Run after nightly or release to copy proofs to the public docs portal
cp -r .paradigm/audit-logs/* docs/audit/ || true
cp .paradigm/reproducibility-log.jsonl docs/audit/ || true
echo "Audit logs published to docs/audit/ for transparency"
