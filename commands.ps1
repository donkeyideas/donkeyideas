# Quick PowerShell Commands for Donkey Ideas Platform

# ============================================
# SETUP (Run once)
# ============================================

# Navigate to project
function Go-ToProject {
    Set-Location "C:\Users\beltr\Donkey Ideas"
    Write-Host "✓ Navigated to project directory" -ForegroundColor Green
}

# Install all dependencies
function Install-Dependencies {
    Go-ToProject
    npm install
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
}

# Generate Prisma client
function Generate-Prisma {
    Go-ToProject
    Set-Location "packages\database"
    npm run db:generate
    Set-Location "..\..\"
    Write-Host "✓ Prisma client generated" -ForegroundColor Green
}

# Run database migrations
function Migrate-Database {
    Go-ToProject
    Set-Location "packages\database"
    npm run db:migrate
    Set-Location "..\..\"
    Write-Host "✓ Database migrated" -ForegroundColor Green
}

# ============================================
# DEVELOPMENT
# ============================================

# Start development server
function Start-Dev {
    Go-ToProject
    Write-Host "Starting development server..." -ForegroundColor Cyan
    Write-Host "Dashboard: http://localhost:3001" -ForegroundColor Green
    npm run dev
}

# Open Prisma Studio
function Open-PrismaStudio {
    Go-ToProject
    Set-Location "packages\database"
    npm run db:studio
}

# ============================================
# QUICK SETUP (All-in-one)
# ============================================

# Complete setup and start
function Setup-And-Run {
    Go-ToProject
    
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
    
    Write-Host "Generating Prisma client..." -ForegroundColor Cyan
    Set-Location "packages\database"
    npm run db:generate
    Set-Location "..\..\"
    
    Write-Host "Starting dev server..." -ForegroundColor Cyan
    npm run dev
}

# ============================================
# USAGE EXAMPLES
# ============================================

# To use these functions, dot-source this file:
# . .\commands.ps1
#
# Then run:
# Setup-And-Run
# Start-Dev
# Generate-Prisma
# etc.


