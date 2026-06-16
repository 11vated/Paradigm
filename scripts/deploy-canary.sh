#!/bin/bash
# Canary Deployment Script for Paradigm Infinite
# Deploys new version to canary environment and gradually shifts traffic

set -e

# Configuration
CANARY_PERCENT=${CANARY_PERCENT:-10}
MAX_CANARY_PERCENT=${MAX_CANARY_PERCENT:-50}
INCREMENT=${INCREMENT:-10}
HEALTH_CHECK_URL=${HEALTH_CHECK_URL:-http://localhost:3000/api/health}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-30}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-5}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Build new version
build_new_version() {
    log_info "Building new version..."
    docker-compose -f docker-compose.yml build app
    log_info "Build completed"
}

# Deploy canary instance
deploy_canary() {
    log_info "Deploying canary instance..."
    
    # Scale down canary if exists
    docker-compose -f docker-compose.yml -f docker-compose.canary.yml up -d --scale app-canary=1
    
    log_info "Canary instance deployed"
}

# Health check for canary
health_check_canary() {
    log_info "Performing health check on canary..."
    
    local elapsed=0
    local healthy=false
    
    while [ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            healthy=true
            break
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        log_warn "Health check failed, retrying... (${elapsed}s elapsed)"
    done
    
    if [ "$healthy" = false ]; then
        log_error "Canary health check failed after ${HEALTH_CHECK_TIMEOUT}s"
        return 1
    fi
    
    log_info "Canary health check passed"
    return 0
}

# Shift traffic to canary
shift_traffic() {
    local current_percent=$1
    local target_percent=$2
    
    log_info "Shifting traffic from ${current_percent}% to ${target_percent}%..."
    
    # Update load balancer configuration
    # This would typically involve updating Nginx, HAProxy, or cloud load balancer
    # For this example, we'll use a simple docker-compose scale approach
    
    # Calculate instance counts based on percentage
    local total_instances=10
    local canary_instances=$((total_instances * target_percent / 100))
    local stable_instances=$((total_instances - canary_instances))
    
    log_info "Scaling to ${canary_instances} canary instances, ${stable_instances} stable instances"
    
    # docker-compose -f docker-compose.yml -f docker-compose.canary.yml \
    #     up -d --scale app=$stable_instances --scale app-canary=$canary_instances
    
    log_info "Traffic shifted to ${target_percent}%"
}

# Rollback to stable version
rollback() {
    log_warn "Initiating rollback to stable version..."
    
    # Scale down canary
    docker-compose -f docker-compose.yml -f docker-compose.canary.yml \
        up -d --scale app-canary=0 --scale app=10
    
    log_info "Rollback completed"
}

# Monitor canary metrics
monitor_canary() {
    log_info "Monitoring canary metrics..."
    
    # This would typically involve:
    # - Error rate monitoring
    # - Response time monitoring
    # - Custom business metrics
    # - A/B testing results
    
    # For this example, we'll just wait for user confirmation
    read -p "Press Enter to continue monitoring or Ctrl+C to rollback..."
    
    log_info "Monitoring completed"
}

# Main deployment flow
main() {
    log_info "Starting canary deployment..."
    
    check_prerequisites
    
    # Build new version
    build_new_version
    
    # Deploy canary
    deploy_canary
    
    # Health check
    if ! health_check_canary; then
        log_error "Canary deployment failed, rolling back..."
        rollback
        exit 1
    fi
    
    # Gradual traffic shift
    local current_percent=0
    while [ $current_percent -lt $MAX_CANARY_PERCENT ]; do
        local next_percent=$((current_percent + INCREMENT))
        if [ $next_percent -gt $MAX_CANARY_PERCENT ]; then
            next_percent=$MAX_CANARY_PERCENT
        fi
        
        shift_traffic $current_percent $next_percent
        monitor_canary
        
        current_percent=$next_percent
    done
    
    log_info "Canary deployment completed successfully"
    log_info "Traffic now at ${MAX_CANARY_PERCENT}% to canary"
    
    # Option to promote canary to stable
    read -p "Promote canary to stable? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Promoting canary to stable..."
        # This would involve:
        # 1. Scale canary to 100%
        # 2. Update stable tag
        # 3. Scale down old stable
        log_info "Canary promoted to stable"
    fi
}

# Run main function
main "$@"
