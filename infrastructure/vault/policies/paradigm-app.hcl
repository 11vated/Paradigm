# Vault Policy for Paradigm Application
# Defines what secrets the application can access

# Database credentials
path "database/creds/paradigm-app" {
  capabilities = ["read"]
}

# JWT signing keys
path "secret/data/jwt/*" {
  capabilities = ["read"]
}

# API keys
path "secret/data/api-keys/*" {
  capabilities = ["read"]
}

# Encryption keys
path "transit/encrypt/paradigm" {
  capabilities = ["update"]
}

path "transit/decrypt/paradigm" {
  capabilities = ["update"]
}

# AWS credentials
path "aws/creds/paradigm-app" {
  capabilities = ["read"]
}

# Redis credentials
path "secret/data/redis/*" {
  capabilities = ["read"]
}

# Blockchain keys (read-only for security)
path "secret/data/blockchain/*" {
  capabilities = ["read"]
}

# GSPL seed signing keys
path "secret/data/gspl/signing-key" {
  capabilities = ["read"]
}

# C2PA manifest keys
path "secret/data/c2pa/*" {
  capabilities = ["read"]
}

# OAuth credentials
path "secret/data/oauth/*" {
  capabilities = ["read"]
}

# Webhook secrets
path "secret/data/webhooks/*" {
  capabilities = ["read"]
}

# Allow token renewal
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Allow token lookup
path "auth/token/lookup-self" {
  capabilities = ["read"]
}