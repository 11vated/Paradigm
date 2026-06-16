# Docker Image Scanning and SBOM Guide

This guide covers Docker image scanning and Software Bill of Materials (SBOM) generation for Paradigm Infinite.

## Overview

Docker image scanning identifies vulnerabilities in container images, while SBOM generation provides a complete inventory of software components. These practices are essential for security compliance and supply chain transparency.

## Prerequisites

### Required Tools

- **Docker**: Container runtime
- **Trivy**: Vulnerability scanner
- **Syft**: SBOM generator

### Installation

#### Trivy

```bash
# macOS
brew install trivy

# Linux
wget -qO - https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Windows
choco install trivy
```

#### Syft

```bash
# macOS
brew install syft

# Linux
wget -qO - https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Windows
choco install syft
```

## Running Scans

### Linux/macOS

```bash
# Run scan with default settings
npm run docker:scan

# Run with custom image name
IMAGE_NAME=my-image IMAGE_TAG=v1.0.0 npm run docker:scan
```

### Windows

```powershell
# Run scan with default settings
npm run docker:scan:win

# Run with custom image name
powershell -ExecutionPolicy Bypass -File scripts/docker-scan.ps1 -ImageName my-image -ImageTag v1.0.0
```

## Scan Results

Scans generate the following files in the `security-reports/` directory:

### SBOM Files

- `sbom-{timestamp}.spdx.json` - SPDX format SBOM
- `sbom-{timestamp}.cyclonedx.json` - CycloneDX format SBOM

### Vulnerability Scan Files

- `vulnerability-scan-{timestamp}.json` - JSON format vulnerability report
- `vulnerability-scan-{timestamp}.txt` - Human-readable vulnerability report

### Summary Report

- `scan-summary-{timestamp}.txt` - Summary of scan results

## Understanding SBOM

### SPDX Format

The Software Package Data Exchange (SPDX) format provides:
- Package identification
- License information
- Dependency relationships
- Security advisories

### CycloneDX Format

The CycloneDX format provides:
- Component inventory
- Vulnerability information
- Dependency graph
- Metadata

## Understanding Vulnerability Scans

### Severity Levels

- **CRITICAL**: Immediate action required
- **HIGH**: Should be addressed soon
- **MEDIUM**: Address when possible
- **LOW**: Address in next update cycle

### Scan Types

- **Vulnerability Scanner**: Checks for known CVEs
- **Config Scanner**: Checks for misconfigurations
- **Secret Scanner**: Checks for exposed secrets

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Docker Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t paradigm-absolute:latest .
      
      - name: Install Trivy
        run: |
          wget -qO - https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
      
      - name: Install Syft
        run: |
          wget -qO - https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
      
      - name: Run vulnerability scan
        run: |
          trivy image paradigm-absolute:latest \
            --severity HIGH,CRITICAL \
            --exit-code 1 \
            --format table
      
      - name: Generate SBOM
        run: |
          syft paradigm-absolute:latest \
            --output spdx-json \
            --file sbom.json
      
      - name: Upload SBOM
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: sbom.json
```

### Docker Compose Integration

```yaml
version: '3.8'
services:
  scan:
    image: aquasec/trivy:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: image paradigm-absolute:latest --severity HIGH,CRITICAL
    depends_on:
      - app
```

## Best Practices

1. **Scan Regularly**: Scan images after every build
2. **Fix Critical Issues**: Address critical vulnerabilities immediately
3. **Update Base Images**: Keep base images up to date
4. **Use Minimal Images**: Use Alpine or distroless images when possible
5. **Scan Dependencies**: Scan application dependencies separately
6. **Maintain SBOM**: Keep SBOMs for compliance and auditing
7. **Automate Scanning**: Integrate scanning into CI/CD pipeline
8. **Monitor CVEs**: Subscribe to security advisories

## Troubleshooting

### Trivy Not Found

**Error**: `trivy: command not found`

**Solution**: Install Trivy following the prerequisites section.

### Docker Image Not Found

**Error**: `Error: No such image: paradigm-absolute:latest`

**Solution**: Build the Docker image first:
```bash
docker build -t paradigm-absolute:latest .
```

### Permission Denied

**Error**: `Permission denied: ./scripts/docker-scan.sh`

**Solution**: Make the script executable:
```bash
chmod +x scripts/docker-scan.sh
```

### Scan Timeout

**Error**: Scan takes too long or times out

**Solution**: 
- Use a smaller base image
- Exclude unnecessary directories
- Increase timeout in CI/CD configuration

## Compliance

### SBOM Requirements

Many regulations require SBOMs:
- **Executive Order 14028**: US federal software supply chain security
- **EU Cyber Resilience Act**: EU cybersecurity requirements
- **NIST SP 800-161**: US supply chain risk management

### Vulnerability Disclosure

Follow responsible disclosure:
1. Identify vulnerability
2. Assess impact
3. Plan remediation
4. Implement fix
5. Update SBOM
6. Disclose to users

## Advanced Usage

### Custom Trivy Configuration

Create `.trivy.yaml`:

```yaml
severity:
  - CRITICAL
  - HIGH

vulnerability:
  type:
    - os
    - library

scan:
  skip-dirs:
    - /tmp
    - /var/cache

report:
  format: json
  output: vulnerability-report.json
```

### Custom Syft Configuration

Create `.syft.yaml`:

```yaml
scan:
  scope: all-layers
  exclude:
    - /usr/local/lib/node_modules/**
```

### Integration with Dependency Track

Upload SBOM to Dependency Track for continuous monitoring:

```bash
curl -X POST \
  -H "X-API-Key: <api-key>" \
  -F "autoCreate=true" \
  -F "projectName=paradigm-absolute" \
  -F "projectVersion=latest" \
  -F "bom=@sbom.json" \
  http://dependency-track-server/api/v1/upload/bom
```

## Next Steps

- [ ] Integrate Docker scanning into CI/CD pipeline
- [ ] Set up automated vulnerability alerts
- [ ] Configure Dependency Track integration
- [ ] Establish vulnerability remediation SLAs
- [ ] Create SBOM retention policy
- [ ] Train team on security best practices
