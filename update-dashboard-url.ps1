# PowerShell script to update dashboard URL in main.js
# Usage: .\update-dashboard-url.ps1 "https://your-dashboard-url.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$DashboardUrl
)

$mainJsPath = "apps\desktop\main.js"

if (Test-Path $mainJsPath) {
    $content = Get-Content $mainJsPath -Raw
    
    # Replace the DASHBOARD_URL line
    $newLine = "const DASHBOARD_URL = '$DashboardUrl';"
    $content = $content -replace "const DASHBOARD_URL = process\.env\.DASHBOARD_URL \|\| '[^']*';", $newLine
    
    Set-Content -Path $mainJsPath -Value $content -NoNewline
    
    Write-Host "✅ Dashboard URL updated to: $DashboardUrl" -ForegroundColor Green
    Write-Host "Updated file: $mainJsPath" -ForegroundColor Gray
} else {
    Write-Host "❌ Error: main.js not found at $mainJsPath" -ForegroundColor Red
    exit 1
}

