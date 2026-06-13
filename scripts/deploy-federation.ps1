# Deploy multi-node federation cluster for v1.2 (PowerShell)
# Starts 3 federation nodes on ports 8787,8788,8789 with simulated distributed registry.
# Usage: pwsh scripts/deploy-federation.ps1

$ErrorActionPreference = "Stop"
$baseDir = Split-Path -Parent $PSScriptRoot
Set-Location $baseDir

Write-Host "Deploying Paradigm Infinite v1.2 distributed federation cluster..."

$nodes = @(
    @{port=8787; name="node1"},
    @{port=8788; name="node2"},
    @{port=8789; name="node3"}
)

$jobs = @()
foreach ($node in $nodes) {
    $env:PORT = $node.port
    $env:NODE_ID = $node.name
    Write-Host "Starting $($node.name) on port $($node.port)..."
    $job = Start-Job -ScriptBlock {
        param($port, $name, $dir)
        Set-Location $dir
        $env:PORT = $port
        $env:NODE_ID = $name
        node --input-type=module -e "
            import { startFederationServer } from './src/lib/federation/server.ts';
            const port = parseInt(process.env.PORT || '8787');
            const srv = startFederationServer(port);
            console.log('Federation node ' + process.env.NODE_ID + ' listening on ' + port);
            // Keep alive
            setInterval(() => {}, 100000);
        "
    } -ArgumentList $node.port, $node.name, $baseDir
    $jobs += $job
    Start-Sleep -Milliseconds 500
}

Write-Host "All nodes started. Waiting for health..."
Start-Sleep -Seconds 3

# Basic inter-node sync simulation
Write-Host "Simulating inter-node registry sync..."
foreach ($i in 0..2) {
    $p1 = $nodes[$i].port
    $p2 = $nodes[($i+1)%3].port
    try {
        $body = @{updates = @(@{seedHash="sync-test-$i"; fromNode=$nodes[$i].name})} | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:$p2/federation/sync/registry" -Method Post -Body $body -ContentType "application/json" | Out-Null
        Write-Host "Synced from $p1 to $p2"
    } catch {
        Write-Host "Sync note (nodes may still be starting): $_"
    }
}

Write-Host "Cluster deployed. Use client to offer seeds across nodes."
Write-Host "To stop: Get-Job | Stop-Job; Get-Job | Remove-Job"

# Keep script running or note for user to manage jobs
Read-Host "Press Enter to show status and exit (jobs will continue in background)" | Out-Null

Get-Job | Select-Object Id, State, Command | Format-Table -AutoSize