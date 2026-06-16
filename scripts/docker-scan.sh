#!/bin/bash
# Docker Image Scanning and SBOM Generation Script for Paradigm Infinite
# Scans Docker images for vulnerabilities and generates Software Bill of Materials (SBOM)

set -e

# Configuration
IMAGE_NAME=${IMAGE_NAME:-"paradigm-absolute"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
OUTPUT_DIR="./security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

# Check if Trivy is installed
if ! command -v trivy &> /dev/null; then
    log_warn "Trivy is not installed. Installing..."
    # Install Trivy
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install trivy
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget -qO - https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    else
        log_error "Please install Trivy manually: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"
        exit 1
    fi
fi

# Check if Syft is installed
if ! command -v syft &> /dev/null; then
    log_warn "Syft is not installed. Installing..."
    # Install Syft
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install syft
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget -qO - https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
    else
        log_error "Please install Syft manually: https://github.com/anchore/syft#installation"
        exit 1
    fi
fi

log_info "Starting Docker image scanning and SBOM generation..."
log_info "Image: ${FULL_IMAGE}"
log_info "Output directory: ${OUTPUT_DIR}"
log_info "Timestamp: ${TIMESTAMP}"
echo ""

# Build Docker image if it doesn't exist
if ! docker image inspect "${FULL_IMAGE}" &> /dev/null; then
    log_info "Building Docker image..."
    docker build -t "${FULL_IMAGE}" .
fi

# Generate SBOM using Syft
log_info "Generating SBOM using Syft..."
syft "${FULL_IMAGE}" \
    --output spdx-json \
    --file "${OUTPUT_DIR}/sbom-${TIMESTAMP}.spdx.json" \
    --output cyclonedx-json \
    --file "${OUTPUT_DIR}/sbom-${TIMESTAMP}.cyclonedx.json"

log_info "SBOM generated: ${OUTPUT_DIR}/sbom-${TIMESTAMP}.spdx.json"
log_info "SBOM generated: ${OUTPUT_DIR}/sbom-${TIMESTAMP}.cyclonedx.json"
echo ""

# Scan for vulnerabilities using Trivy
log_info "Scanning for vulnerabilities using Trivy..."
trivy image "${FULL_IMAGE}" \
    --output "${OUTPUT_DIR}/vulnerability-scan-${TIMESTAMP}.json" \
    --format json \
    --severity HIGH,CRITICAL \
    --scanners vuln,config \
    --no-progress

trivy image "${FULL_IMAGE}" \
    --output "${OUTPUT_DIR}/vulnerability-scan-${TIMESTAMP}.txt" \
    --format table \
    --severity HIGH,CRITICAL \
    --scanners vuln,config \
    --no-progress

log_info "Vulnerability scan completed: ${OUTPUT_DIR}/vulnerability-scan-${TIMESTAMP}.json"
log_info "Vulnerability scan completed: ${OUTPUT_DIR}/vulnerability-scan-${TIMESTAMP}.txt"
echo ""

# Check for critical vulnerabilities
log_info "Checking for critical vulnerabilities..."
CRITICAL_COUNT=$(trivy image "${FULL_IMAGE}" --format json --severity CRITICAL --no-progress | jq -r '.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL") | .VulnerabilityID' | wc -l)
HIGH_COUNT=$(trivy image "${FULL_IMAGE}" --format json --severity HIGH --no-progress | jq -r '.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH") | .VulnerabilityID' | wc -l)

if [ "$CRITICAL_COUNT" -gt 0 ]; then
    log_error "Found ${CRITICAL_COUNT} CRITICAL vulnerabilities"
    exit 1
elif [ "$HIGH_COUNT" -gt 0 ]; then
    log_warn "Found ${HIGH_COUNT} HIGH vulnerabilities"
else
    log_info "No critical or high vulnerabilities found"
fi
echo ""

# Generate summary report
log_info "Generating summary report..."
cat > "${OUTPUT_DIR}/scan-summary-${TIMESTAMP}.txt" << EOF
Docker Image Scan Summary
=========================
Image: ${FULL_IMAGE}
Timestamp: ${TIMESTAMP}

Vulnerabilities:
- Critical: ${CRITICAL_COUNT}
- High: ${HIGH_COUNT}

Files Generated:
- SBOM (SPDX): ${OUTPUT_DIR}/sbom-${TIMESTAMP}.spdx.json
- SBOM (CycloneDX): ${OUTPUT_DIR}/sbom-${TIMESTAMP}.cyclonedx.json
- Vulnerability Scan (JSON): ${OUTPUT_DIR}/vulnerability-scan-${TIMESTAMP}.json
- Vulnerability Scan (Text): ${OUTPUT_DIR}/vulnerability-scan-${TIMESTAMP}.txt

Next Steps:
1. Review vulnerability scan results
2. Address critical and high vulnerabilities
3. Update base image if needed
4. Re-scan after fixes
EOF

log_info "Summary report generated: ${OUTPUT_DIR}/scan-summary-${TIMESTAMP}.txt"
echo ""

log_info "Docker image scanning and SBOM generation completed successfully!"
log_info "All reports saved to: ${OUTPUT_DIR}"
