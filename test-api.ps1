# Test Paradigm API endpoints

$baseUrl = "http://localhost:3000"
$passed = 0
$failed = 0

function Test-ApiCall {
    param($name, $script)
    try {
        $result = Invoke-RestMethod -Uri $script -Method Get -ErrorAction Stop
        Write-Host "✓ $name" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ $name - $_" -ForegroundColor Red
        return $false
    }
}

Write-Host "=== Paradigm API End-to-End Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test health endpoint
if (Test-ApiCall "Health Check" "$baseUrl/health") { $passed++ } else { $failed++ }

# Test ready endpoint
if (Test-ApiCall "Ready Check" "$baseUrl/ready") { $passed++ } else { $failed++ }

# Test stats endpoint
if (Test-ApiCall "Stats" "$baseUrl/api/stats") { $passed++ } else { $failed++ }

# Test seeds list
if (Test-ApiCall "List Seeds" "$baseUrl/api/seeds") { $passed++ } else { $failed++ }

# Test metrics endpoint
if (Test-ApiCall "Metrics" "$baseUrl/metrics") { $passed++ } else { $failed++ }

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Total: $($passed + $failed)" -ForegroundColor Yellow
