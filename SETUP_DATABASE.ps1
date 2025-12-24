# Database Setup Helper Script
# This script helps you set up the database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Setup Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\Users\beltr\Donkey Ideas"
Set-Location $projectPath

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# Copy .env to packages/database so Prisma can find it
Write-Host "Copying .env to packages/database..." -ForegroundColor Cyan
Copy-Item ".env" "packages\database\.env" -Force
Write-Host "✓ .env copied to packages/database" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Options" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need a PostgreSQL database. Choose an option:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Free Cloud Database (Recommended)" -ForegroundColor Green
Write-Host "  1. Go to https://supabase.com (free PostgreSQL)" -ForegroundColor White
Write-Host "  2. Create a free account and project" -ForegroundColor White
Write-Host "  3. Copy the connection string" -ForegroundColor White
Write-Host "  4. Edit .env file and paste it as DATABASE_URL" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Local PostgreSQL" -ForegroundColor Green
Write-Host "  1. Install PostgreSQL from https://www.postgresql.org/download/" -ForegroundColor White
Write-Host "  2. Create database: createdb donkey_ideas" -ForegroundColor White
Write-Host "  3. Update DATABASE_URL in .env with your local credentials" -ForegroundColor White
Write-Host ""
Write-Host "Option 3: Use SQLite for Development (Easier)" -ForegroundColor Green
Write-Host "  I can help you switch to SQLite - just ask!" -ForegroundColor White
Write-Host ""

# Check current DATABASE_URL
$envContent = Get-Content ".env" -Raw
if ($envContent -match 'DATABASE_URL="postgresql://user:password@localhost:5432/donkey_ideas') {
    Write-Host "⚠️  DATABASE_URL is still set to placeholder value!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please edit .env file and set a real DATABASE_URL" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Would you like to open .env file now? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        notepad ".env"
    }
} else {
    Write-Host "✓ DATABASE_URL appears to be configured" -ForegroundColor Green
}

Write-Host ""
Write-Host "After setting DATABASE_URL, run:" -ForegroundColor Cyan
Write-Host "  cd packages\database" -ForegroundColor White
Write-Host "  npm run db:migrate" -ForegroundColor White
Write-Host "  cd ..\.." -ForegroundColor White
Write-Host "  .\CREATE_ADMIN.ps1" -ForegroundColor White


