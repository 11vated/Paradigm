@echo off
echo Starting Paradigm server...
start /b npx tsx server-full.ts
timeout /t 3 > nul
echo Testing endpoints...
curl -s http://localhost:3000/health
echo.
curl -s http://localhost:3000/api/stats
echo.
echo Tests complete.
pause
