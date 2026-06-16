# Docker Image Scanning and SBOM Generation Script for Paradigm Infinite (PowerShell)
# Scans Docker images for vulnerabilities and generates Software Bill of Materials (SBOM)

param(
    [string]$ImageName = "paradigm-absolute",
    [string]$ImageTag = "latest",
    [string]$OutputDir = "./security-reports"
)

$ErrorActionPreference = "Stop"

# Configuration
$FullImage = "${ImageName}:${ImageTag}"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Colors for output
function Log-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Log-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Check if Docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Log-Error "Docker is not installed"
    exit 1
}

# Check if Trivy is installed
if (-not (Get-Command trivy -ErrorAction SilentlyContinue)) {
    Log-Warn "Trivy is not installed. Please install from: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"
    exit 1
}

# Check if Syft is installed
if (-not (Get-Command syft -ErrorAction SilentlyContinue)) {
    Log-Warn "Syft is not installed. Please install from: https://github.com/anchore/syft#installation"
    exit 1
}

Log-Info "Starting Docker image scanning and SBOM generation..."
Log-Info "Image: $FullImage"
Log-Info "Output directory: $OutputDir"
Log-Info "Timestamp: $Timestamp"
Write-Host ""

# Build Docker image if it doesn't exist
$imageExists = docker image inspect $FullImage 2>$null
if (-not $imageExists) {
    Log-Info "Building Docker image..."
    docker build -t $FullImage .
}

# Generate SBOM using Syft
Log-Info "Generating SBOM using Syft..."
syft $FullImage --output spdx-json --file "$OutputDir/sbom-$Timestamp.spdx.json" --output cyclonedx-json --file "$OutputDir/sbom-$Timestamp.cyclonedx.json"

Log-Info "SBOM generated: $OutputDir/sbom-$Timestamp.spdx.json"
Log-Info "SBOM generated: $OutputDir/sbom-$Timestamp.cyclonedx.json"
Write-Host ""

# Scan for vulnerabilities using Trivy
Log-Info "Scanning for vulnerabilities using Trivy..."
trivy image $FullImage --output "$OutputDir/vulnerability-scan-$Timestamp.json" --format json --severity HIGH,CRITICAL --scanners vuln,config --no-progress
trivy image $FullImage --output "$OutputDir/vulnerability-scan-$Timestamp.txt" --format table --severity HIGH,CRITICAL --scanners vuln,config --no-progress

Log-Info "Vulnerability scan completed: $OutputDir/vulnerability-scan-$Timestamp.json"
Log-Info "Vulnerability scan completed: $OutputDir/vulnerability-scan-$Timestamp.txt"
Write-Host ""

# Check for critical vulnerabilities
Log-Info "Checking for critical vulnerabilities..."
$trivyJson = Get-Content "$OutputDir/vulnerability-scan-$Timestamp.json" | ConvertFrom-Json
$criticalCount = 0
$highCount = 0

foreach ($result in $trivyJson.Results) {
    if ($result.Vulnerabilities) {
        foreach ($vuln in $result.Vulnerabilities) {
            if ($vuln.Severity -eq "CRITICAL") {
                $criticalCount++
            } elseif ($vuln.Severity -eq "HIGH") {
                $highCount++
            }
        }
    }
}

if ($criticalCount -gt 0) {
    Log-Error "Found $criticalCount CRITICAL vulnerabilities"
    exit 1
} elseif ($highCount -gt 0) {
    Log-Warn "Found $highCount HIGH vulnerabilities"
} else {
    Log-Info "No critical or high vulnerabilities found"
}
Write-Host ""

# Generate summary report
Log-Info "Generating summary report..."
$summary = @"
Docker Image Scan Summary
=========================
Image: $FullImage
Timestamp: $Timestamp

Vulnerabilities:
- Critical: $criticalCount
- High: $highCount

Files Generated:
- SBOM (SPDX): $OutputDir/sbom-$Timestamp.spdx.json
- SBOM (CycloneDX): $OutputDir/sbom-$Timestamp.cyclonedx.json
- Vulnerability Scan (JSON): $OutputDir/vulnerability-scan-$Timestamp.json
- Vulnerability Scan (Text): $OutputDir/vulnerability-scan-$Timestamp.txt

Next Steps:
1. Review vulnerability scan results
2. Address critical and high vulnerabilities
3. Update base image if needed
4. Re-scan after fixes
"@

$summary | Out-File -FilePath "$OutputDir/scan-summary-$Timestamp.txt" -Encoding utf8

Log-Info "Summary report generated: $OutputDir/scan-summary-$Timestamp.txt"
Write-Host ""

Log-Info "Docker image scanning and SBOM generation completed successfully!"
Log-Info "All reports saved to: $OutputDir"
