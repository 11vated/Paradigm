# Vault Configuration for Paradigm Absolute
# Secrets management for production environment

storage "consul" {
  address = "127.0.0.1:8500"
  path    = "vault/"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 0
  tls_cert_file = "/vault/tls/tls.crt"
  tls_key_file  = "/vault/tls/tls.key"
}

# API address for cluster communication
api_addr = "https://vault.paradigm.local:8200"
cluster_addr = "https://vault.paradigm.local:8201"

# UI configuration
ui = true

# Telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}

# High availability
ha_storage "consul" {
  address = "127.0.0.1:8500"
  path    = "vault-ha/"
}

# Seal configuration (AWS KMS)
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/paradigm-vault-unseal"
}

# Log level
log_level = "info"

# Disable mlock (for containerized environments)
disable_mlock = true

# Maximum lease TTL
max_lease_ttl = "768h"
default_lease_ttl = "168h"