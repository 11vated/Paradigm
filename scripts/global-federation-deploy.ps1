# Global v1.3 Federation Deployment Simulator (pwsh)
# Deploys "global" cluster: bootstrap + regional nodes (US=8787, EU=8788, APAC=8789) + external contributor nodes.
# Uses existing multi-node logic + inter-cluster sync simulation.
# For real global: use this + Docker/K8s in regions, public DNS for endpoints.

param(
    [int]$NumRegional = 3,
    [int]$NumExternal = 2
)

$baseDir = Split-Path -Parent $PSScriptRoot
Set-Location $baseDir

Write-Host "=== Paradigm Infinite v1.3 Global Federation Deployment ==="
Write-Host "Regions: US (8787), EU (8788), APAC (8789)"
Write-Host "External contributors: $NumExternal nodes"

$regions = @(
    @{port=8787; region="US"; name="us-bootstrap"},
    @{port=8788; region="EU"; name="eu-node"},
    @{port=8789; region="APAC"; name="apac-node"}
)

$allNodes = $regions.Clone()
for ($i=1; $i -le $NumExternal; $i++) {
    $port = 8790 + $i
    $allNodes += @{port=$port; region="EXTERNAL"; name="external-contributor-$i"}
}

$jobs = @()
foreach ($node in $allNodes) {
    $env:PORT = $node.port
    $env:NODE_ID = $node.name
    $env:REGION = $node.region
    Write-Host "Starting $($node.name) ($($node.region)) on :$($node.port)..."
    $job = Start-Job -ScriptBlock {
        param($port, $name, $region, $dir)
        Set-Location $dir
        $env:PORT = $port
        $env:NODE_ID = $name
        $env:REGION = $region
        node --input-type=module -e "
            import { startFederationServer } from './src/lib/federation/server.ts';
            const port = parseInt(process.env.PORT);
            const srv = startFederationServer(port);
            console.log('GLOBAL NODE ' + process.env.NODE_ID + ' (' + process.env.REGION + ') on :' + port);
            setInterval(() => {}, 100000);
        "
    } -ArgumentList $node.port, $node.name, $node.region, $baseDir
    $jobs += $job
    Start-Sleep -Milliseconds 300
}

Write-Host "Waiting for nodes to stabilize..."
Start-Sleep -Seconds 4

# Simulate global inter-cluster sync (bootstrap from US to others)
Write-Host "Performing global inter-cluster registry sync..."
$usPort = 8787
foreach ($node in $allNodes | Where-Object { $_.port -ne $usPort }) {
    try {
        $body = @{updates = @(@{seedHash="global-v13-seed"; fromNode="us-bootstrap"; region="US"})} | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "http://localhost:$($node.port)/federation/sync/registry" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 | Out-Null
        Write-Host "  Synced global registry to $($node.name) ($($node.region))"
    } catch {
        Write-Host "  Sync to $($node.name) note: $($_.Exception.Message)"
    }
}

# Secure onboarding for external participants (generate keys, sign registration)
Write-Host "Simulating secure external onboarding..."
node --input-type=module -e "
import { deriveKeyPair, signSovereign } from './src/lib/sovereignty/ecdsa.ts';
import { FederationClient } from './src/lib/federation/client.ts';
(async () => {
  const externalSeed = 'external-contributor-global-v13';
  const keys = deriveKeyPair(externalSeed);
  const client = new FederationClient({nodeId: 'external-global', privateKeySeed: externalSeed});
  const regSeed = { \$hash: 'external-reg-v13', type: 'onboard', region: 'global' };
  try {
    const res = await client.offer('http://localhost:8787', regSeed);
    console.log('EXTERNAL_ONBOARD_SUCCESS:', res);
  } catch(e) {
    console.log('EXTERNAL_ONBOARD_NOTE:', e.message);
  }
})();
" 2>&1 | Select-String -Pattern "ONBOARD|success|note" | Out-String

Write-Host "Global federation cluster deployed (simulated regions + external)."
Write-Host "Public endpoints (for real global): expose 8787+ via Caddy/DNS in regions."
Write-Host "To stop: Get-Job | Stop-Job; Get-Job | Remove-Job"
Get-Job | Select Id, State | Out-String
