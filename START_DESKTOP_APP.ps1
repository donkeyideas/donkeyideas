# Script to start dashboard server and desktop app together
# This will start the dashboard in the background, wait for it to be ready, then launch the desktop app

Write-Host "🚀 Starting Donkey Ideas Desktop App..." -ForegroundColor Cyan
Write-Host ""

# Start dashboard server in background
Write-Host "📡 Starting dashboard server..." -ForegroundColor Yellow
$dashboardJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\beltr\Donkey Ideas"
    npm run dev
}

# Wait for server to be ready (check if port 3001 is responding)
Write-Host "⏳ Waiting for dashboard server to start..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$serverReady = $false

while ($attempt -lt $maxAttempts -and -not $serverReady) {
    Start-Sleep -Seconds 2
    $attempt++
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        $serverReady = $true
        Write-Host "✅ Dashboard server is ready!" -ForegroundColor Green
    } catch {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

if (-not $serverReady) {
    Write-Host ""
    Write-Host "❌ Dashboard server failed to start after $($maxAttempts * 2) seconds" -ForegroundColor Red
    Write-Host "   Please start it manually: npm run dev" -ForegroundColor Yellow
    Stop-Job $dashboardJob
    Remove-Job $dashboardJob
    exit 1
}

Write-Host ""
Write-Host "🖥️  Launching desktop app..." -ForegroundColor Cyan
Write-Host ""

# Start desktop app
Set-Location "C:\Users\beltr\Donkey Ideas\apps\desktop"
npm run dev

# Cleanup: Stop the dashboard job when desktop app closes
Write-Host ""
Write-Host "🛑 Stopping dashboard server..." -ForegroundColor Yellow
Stop-Job $dashboardJob
Remove-Job $dashboardJob
Write-Host "✅ Done!" -ForegroundColor Green

