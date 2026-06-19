#!/bin/bash
# Initialize Vault with Paradigm Absolute secrets
# Run this script after Vault is unsealed

set -e

VAULT_ADDR="${VAULT_ADDR:-https://vault.paradigm.local:8200}"
VAULT_TOKEN="${VAULT_TOKEN}"

if [ -z "$VAULT_TOKEN" ]; then
  echo "Error: VAULT_TOKEN environment variable must be set"
  exit 1
fi

echo "Initializing Vault secrets for Paradigm Absolute..."

# Enable secrets engines
echo "Enabling secrets engines..."
vault secrets enable -path=secret kv-v2
vault secrets enable -path=database database
vault secrets enable -path=transit transit
vault secrets enable -path=aws aws

# Create encryption key
echo "Creating transit encryption key..."
vault write -f transit/keys/paradigm

# Configure database secrets engine
echo "Configuring database secrets engine..."
vault write database/config/paradigm-postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="paradigm-app" \
  connection_url="postgresql://{{username}}:{{password}}@postgres.paradigm.local:5432/paradigm?sslmode=require" \
  username="vault" \
  password="$DB_VAULT_PASSWORD"

# Create database role
vault write database/roles/paradigm-app \
  db_name=paradigm-postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Configure AWS secrets engine
echo "Configuring AWS secrets engine..."
vault write aws/config/root \
  access_key="$AWS_ACCESS_KEY_ID" \
  secret_key="$AWS_SECRET_ACCESS_KEY" \
  region="us-east-1"

vault write aws/roles/paradigm-app \
  credential_type=iam_user \
  policy_document=-<<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::paradigm-seeds/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Store static secrets
echo "Storing static secrets..."

# JWT signing key
vault kv put secret/jwt/signing-key \
  key="$JWT_SIGNING_KEY" \
  algorithm="RS256"

# API keys
vault kv put secret/api-keys/openai \
  key="$OPENAI_API_KEY"

vault kv put secret/api-keys/anthropic \
  key="$ANTHROPIC_API_KEY"

# Redis credentials
vault kv put secret/redis/credentials \
  host="redis.paradigm.local" \
  port="6379" \
  password="$REDIS_PASSWORD"

# Blockchain keys (encrypted at rest)
vault kv put secret/blockchain/ethereum \
  private_key="$ETH_PRIVATE_KEY" \
  contract_address="$PARA_TOKEN_ADDRESS" \
  nft_contract_address="$SEED_NFT_ADDRESS"

# GSPL seed signing key
vault kv put secret/gspl/signing-key \
  private_key="$GSPL_SIGNING_KEY" \
  public_key="$GSPL_PUBLIC_KEY"

# C2PA manifest keys
vault kv put secret/c2pa/signing \
  certificate="$C2PA_CERTIFICATE" \
  private_key="$C2PA_PRIVATE_KEY"

# OAuth credentials
vault kv put secret/oauth/github \
  client_id="$GITHUB_CLIENT_ID" \
  client_secret="$GITHUB_CLIENT_SECRET"

vault kv put secret/oauth/google \
  client_id="$GOOGLE_CLIENT_ID" \
  client_secret="$GOOGLE_CLIENT_SECRET"

# Webhook secrets
vault kv put secret/webhooks/github \
  secret="$GITHUB_WEBHOOK_SECRET"

# Create and apply policy
echo "Creating application policy..."
vault policy write paradigm-app /vault/policies/paradigm-app.hcl

# Create AppRole for application authentication
echo "Creating AppRole..."
vault auth enable approle

vault write auth/approle/role/paradigm-app \
  token_policies="paradigm-app" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=0

# Get role ID and secret ID
ROLE_ID=$(vault read -field=role_id auth/approle/role/paradigm-app/role-id)
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/paradigm-app/secret-id)

echo ""
echo "Vault initialization complete!"
echo ""
echo "Application credentials:"
echo "VAULT_ROLE_ID=$ROLE_ID"
echo "VAULT_SECRET_ID=$SECRET_ID"
echo ""
echo "Store these securely in Kubernetes secrets."

# Made with Bob
