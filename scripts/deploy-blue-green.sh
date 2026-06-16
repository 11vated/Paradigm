#!/bin/bash
# Blue-Green Deployment Script for Paradigm Infinite
# Deploys new version to green environment, validates, then switches traffic

set -e

# Configuration
BLUE_ENV=${BLUE_ENV:-blue}
GREEN_ENV=${GREEN_ENV:-green}
HEALTH_CHECK_URL=${HEALTH_CHECK_URL:-http://localhost:3000/api/health}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-60}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-5}
SWITCHBACK_TIMEOUT=${SWITCHBACK_TIMEOUT:-300}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_blue() {
    echo -e "${BLUE}[BLUE-GREEN]${NC} $1"
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

# Determine current active environment
get_current_environment() {
    # Check which environment is currently active by checking load balancer or DNS
    # For simplicity, we'll use a state file
    if [ -f ".deployment-state" ]; then
        cat .deployment-state
    else
        echo "blue"
    fi
}

# Set active environment
set_active_environment() {
    local env=$1
    echo "$env" > .deployment-state
    log_blue "Active environment set to: $env"
}

# Build new version for green environment
build_green() {
    log_info "Building new version for green environment..."
    docker-compose -f docker-compose.blue-green.yml build app-green
    log_info "Build completed"
}

# Deploy to green environment
deploy_green() {
    log_info "Deploying to green environment..."
    
    # Start green environment
    docker-compose -f docker-compose.blue-green.yml up -d app-green
    
    log_info "Green environment deployed"
}

# Health check for green environment
health_check_green() {
    log_info "Performing health check on green environment..."
    
    # Get green environment port
    local green_port=3001
    
    local elapsed=0
    local healthy=false
    
    while [ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -f -s "http://localhost:${green_port}/api/health" > /dev/null 2>&1; then
            healthy=true
            break
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        log_warn "Health check failed, retrying... (${elapsed}s elapsed)"
    done
    
    if [ "$healthy" = false ]; then
        log_error "Green environment health check failed after ${HEALTH_CHECK_TIMEOUT}s"
        return 1
    fi
    
    log_info "Green environment health check passed"
    return 0
}

# Run smoke tests on green environment
run_smoke_tests() {
    log_info "Running smoke tests on green environment..."
    
    local green_port=3001
    
    # Test critical endpoints
    local endpoints=(
        "/api/health"
        "/api/substrate/health"
        "/api/domains"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if ! curl -f -s "http://localhost:${green_port}${endpoint}" > /dev/null 2>&1; then
            log_error "Smoke test failed for endpoint: $endpoint"
            return 1
        fi
    done
    
    log_info "Smoke tests passed"
    return 0
}

# Switch traffic from blue to green
switch_traffic() {
    log_blue "Switching traffic from blue to green..."
    
    # This would typically involve:
    # 1. Updating load balancer configuration
    # 2. Updating DNS records
    # 3. Updating service discovery
    
    # For this example, we'll update a load balancer configuration
    # In production, this would be Nginx, HAProxy, AWS ALB, etc.
    
    # Update state file
    set_active_environment "green"
    
    log_blue "Traffic switched to green environment"
}

# Rollback to blue environment
rollback() {
    log_warn "Initiating rollback to blue environment..."
    
    # Stop green environment
    docker-compose -f docker-compose.blue-green.yml stop app-green
    
    # Switch traffic back to blue
    set_active_environment "blue"
    
    log_info "Rollback completed"
}

# Monitor green environment
monitor_green() {
    log_info "Monitoring green environment for ${SWITCHBACK_TIMEOUT}s..."
    
    local green_port=3001
    local start_time=$(date +%s)
    local end_time=$((start_time + SWITCHBACK_TIMEOUT))
    
    while [ $(date +%s) -lt $end_time ]; do
        # Check health
        if ! curl -f -s "http://localhost:${green_port}/api/health" > /dev/null 2>&1; then
            log_error "Green environment health check failed during monitoring"
            return 1
        fi
        
        # Check error rates (would integrate with Prometheus in production)
        # Check response times
        # Check custom business metrics
        
        sleep 10
    done
    
    log_info "Monitoring completed successfully"
    return 0
}

# Cleanup old blue environment after successful deployment
cleanup_old_environment() {
    log_info "Cleaning up old blue environment..."
    
    # Stop blue environment
    docker-compose -f docker-compose.blue-green.yml stop app-blue
    
    log_info "Old blue environment stopped"
}

# Main deployment flow
main() {
    log_blue "Starting blue-green deployment..."
    
    check_prerequisites
    
    # Get current active environment
    local current_env=$(get_current_environment)
    log_blue "Current active environment: $current_env"
    
    # Build new version
    build_green
    
    # Deploy to green
    deploy_green
    
    # Health check
    if ! health_check_green; then
        log_error "Green deployment failed, rolling back..."
        rollback
        exit 1
    fi
    
    # Smoke tests
    if ! run_smoke_tests; then
        log_error "Smoke tests failed, rolling back..."
        rollback
        exit 1
    fi
    
    # Switch traffic
    switch_traffic
    
    # Monitor green environment
    if ! monitor_green; then
        log_error "Monitoring detected issues, rolling back..."
        rollback
        exit 1
    fi
    
    # Cleanup old environment
    cleanup_old_environment
    
    log_blue "Blue-green deployment completed successfully"
    log_blue "Green environment is now live"
}

# Run main function
main "$@"
