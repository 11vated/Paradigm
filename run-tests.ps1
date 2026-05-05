# Run end-to-end tests for Paradigm server

Write-Host "=== Starting Paradigm Server ===" -ForegroundColor Cyan
Start-Process -FilePath "npx" -ArgumentList "tsx", "server-full.ts" -WindowStyle Normal

Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "=== Running End-to-End Tests ===" -ForegroundColor Cyan

# Test health
Write-Host "Test 1: Health Check..." -NoNewline
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}

# Test ready
Write-Host "Test 2: Ready Check..." -NoNewline
try {
    $ready = Invoke-RestMethod -Uri "http://localhost:3000/ready" -Method Get -TimeoutSec 5
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}

# Test stats
Write-Host "Test 3: Stats..." -NoNewline
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:3000/api/stats" -Method Get -TimeoutSec 5
    Write-Host "PASSED (seeds: $($stats.seeds))" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}

# Test generate seed
Write-Host "Test 4: Generate Seed..." -NoNewline
try {
    $seed = Invoke-RestMethod -Uri "http://localhost:3000/api/seeds/generate" -Method Post -Body (@{prompt="hero"; domain="character"} | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 5
    Write-Host "PASSED (hash: $($seed.seed.$hash.Substring(0,16))..." -ForegroundColor Green
    $seedHash = $seed.seed.$hash
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
    $seedHash = $null
}

# Test grow seed
if ($seedHash) {
    Write-Host "Test 5: Grow Seed..." -NoNewline
    try {
        $grow = Invoke-RestMethod -Uri "http://localhost:3000/api/seeds/$seedHash/grow" -Method Post -TimeoutSec 5
        Write-Host "PASSED (type: $($grow.artifact.type))" -ForegroundColor Green
    } catch {
        Write-Host "FAILED: $_" -ForegroundColor Red
    }
}

# Test list seeds
Write-Host "Test 6: List Seeds..." -NoNewline
try {
    $seeds = Invoke-RestMethod -Uri "http://localhost:3000/api/seeds" -Method Get -TimeoutSec 5
    Write-Host "PASSED (count: $($seeds.count))" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Tests Complete ===" -ForegroundColor Cyan
Write-Host "Server is running in separate window. Close it manually when done." -ForegroundColor Yellow
