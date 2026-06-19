#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Paradigm Absolute — Kubernetes Deployment Script
# Automated deployment to Kubernetes cluster
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="paradigm"
KUBECTL="kubectl"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

create_namespace() {
    log_info "Creating namespace..."
    kubectl apply -f namespace.yaml
}

create_secrets() {
    log_info "Creating secrets..."
    
    # Check if secrets already exist
    if kubectl get secret paradigm-secrets -n $NAMESPACE &> /dev/null; then
        log_warn "Secrets already exist. Skipping creation."
        return
    fi
    
    # Generate JWT secret if not provided
    if [ -z "$JWT_SECRET" ]; then
        log_warn "JWT_SECRET not set. Generating random secret..."
        JWT_SECRET=$(openssl rand -hex 32)
    fi
    
    # Generate Postgres password if not provided
    if [ -z "$POSTGRES_PASSWORD" ]; then
        log_warn "POSTGRES_PASSWORD not set. Generating random password..."
        POSTGRES_PASSWORD=$(openssl rand -hex 16)
    fi
    
    # Create secrets
    kubectl create secret generic paradigm-secrets \
        --from-literal=JWT_SECRET="$JWT_SECRET" \
        --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
        --from-literal=GEMINI_API_KEY="${GEMINI_API_KEY:-}" \
        --from-literal=ADMIN_USERNAME="${ADMIN_USERNAME:-admin}" \
        --from-literal=ADMIN_PASSWORD="${ADMIN_PASSWORD:-paradigm}" \
        --namespace=$NAMESPACE
    
    log_info "Secrets created successfully."
    log_warn "IMPORTANT: Save these credentials securely!"
    echo "JWT_SECRET: $JWT_SECRET"
    echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
}

deploy_resources() {
    log_info "Deploying Kubernetes resources..."
    
    # Apply in order
    kubectl apply -f rbac.yaml
    kubectl apply -f configmap.yaml
    kubectl apply -f pvc.yaml
    kubectl apply -f postgres-statefulset.yaml
    kubectl apply -f redis-deployment.yaml
    kubectl apply -f service.yaml
    
    log_info "Waiting for database to be ready..."
    kubectl wait --for=condition=ready pod -l component=database -n $NAMESPACE --timeout=300s
    
    log_info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l component=cache -n $NAMESPACE --timeout=120s
    
    kubectl apply -f deployment.yaml
    kubectl apply -f hpa.yaml
    kubectl apply -f ingress.yaml
    
    log_info "Resources deployed successfully."
}

wait_for_deployment() {
    log_info "Waiting for application deployment..."
    kubectl wait --for=condition=available deployment/paradigm-app -n $NAMESPACE --timeout=300s
    log_info "Application is ready!"
}

show_status() {
    log_info "Deployment status:"
    echo ""
    kubectl get all -n $NAMESPACE
    echo ""
    log_info "Ingress:"
    kubectl get ingress -n $NAMESPACE
}

# Main execution
main() {
    log_info "Starting Paradigm Absolute deployment..."
    
    check_prerequisites
    create_namespace
    create_secrets
    deploy_resources
    wait_for_deployment
    show_status
    
    log_info "Deployment complete!"
    log_info "Access the application at: https://paradigm.ai"
}

# Run main function
main "$@"

# Made with Bob
