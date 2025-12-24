# Donkey Ideas Platform - PowerShell Setup & Run Script
# Run this script to set up and start the project

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Donkey Ideas Platform - Setup & Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
$projectPath = "C:\Users\beltr\Donkey Ideas"
Set-Location $projectPath
Write-Host "✓ Navigated to project directory" -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠ .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ .env file created. Please edit it with your database URL!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANT: Edit .env file and set DATABASE_URL before continuing!" -ForegroundColor Red
    Write-Host "Press any key to continue after editing .env..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Generate Prisma client
Write-Host ""
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
Set-Location "packages\database"
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Prisma client generation had issues (this is OK if DATABASE_URL is not set)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Prisma client generated" -ForegroundColor Green
}
Set-Location $projectPath

# Run database migrations (optional - will fail if DATABASE_URL not set)
Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Cyan
Write-Host "Note: This will fail if DATABASE_URL is not configured in .env" -ForegroundColor Yellow
Set-Location "packages\database"
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Database migration failed. Make sure DATABASE_URL is set in .env" -ForegroundColor Yellow
    Write-Host "You can still run the dev server, but database features won't work." -ForegroundColor Yellow
} else {
    Write-Host "✓ Database migrations completed" -ForegroundColor Green
}
Set-Location $projectPath

# Start development server
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting development server..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dashboard will be available at: http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm run dev
