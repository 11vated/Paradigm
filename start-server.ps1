# Start Paradigm server in background
$process = Start-Process -FilePath "npx" -ArgumentList "tsx", "server-full.ts" -PassThru -WindowStyle Hidden
Write-Output "Started server process ID: $($process.Id)"
Start-Sleep -Seconds 3
Write-Output "Server should be running at http://localhost:3000"
