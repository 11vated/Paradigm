#!/bin/bash
set -e

ENVIRONMENT=${1:-staging}
REGISTRY=${REGISTRY:-docker.io/paradigm}
VERSION=${VERSION:-latest}

echo "Deploying Paradigm GSPL Platform to $ENVIRONMENT..."

case $ENVIRONMENT in
  staging)
    echo "Deploying to staging..."
    docker-compose -f docker-compose.yml up -d
    ;;

  production)
    echo "Deploying to production..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    ;;

  local)
    echo "Deploying to local..."
    docker-compose -f docker-compose.local.yml up -d
    ;;

  *)
    echo "Unknown environment: $ENVIRONMENT"
    echo "Valid environments: staging, production, local"
    exit 1
    ;;
esac

echo "Deployment complete!"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo ""
echo "Services:"
echo "  - API: http://localhost:3000"
echo "  - Web: http://localhost:80"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3001"