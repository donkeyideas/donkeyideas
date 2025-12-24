# Create Admin User Script
# This script creates an admin user in the database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Admin User" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\Users\beltr\Donkey Ideas"
Set-Location $projectPath

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with DATABASE_URL first." -ForegroundColor Yellow
    exit 1
}

# Check if DATABASE_URL is set
$envContent = Get-Content ".env" -Raw
if (-not $envContent -match "DATABASE_URL") {
    Write-Host "❌ DATABASE_URL not found in .env file!" -ForegroundColor Red
    Write-Host "Please add DATABASE_URL to .env file first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Running database seed to create admin user..." -ForegroundColor Cyan
Write-Host ""

Set-Location "packages\database"
npm run db:seed

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Login Credentials:" -ForegroundColor Yellow
    Write-Host "  Email: admin@donkeyideas.com" -ForegroundColor White
    Write-Host "  Password: Admin123!" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Change this password after first login!" -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "❌ Failed to create admin user" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. DATABASE_URL is set in .env" -ForegroundColor Yellow
    Write-Host "  2. Database is running and accessible" -ForegroundColor Yellow
    Write-Host "  3. Migrations have been run (npm run db:migrate)" -ForegroundColor Yellow
}

Set-Location $projectPath


