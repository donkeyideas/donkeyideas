# Script to push Prisma schema to Neon database
# Usage: .\push-to-neon.ps1 "postgres://your-connection-string-here"

param(
    [Parameter(Mandatory=$true)]
    [string]$PostgresUrl
)

Write-Host "=== Pushing Prisma Schema to Neon ===" -ForegroundColor Cyan
Write-Host ""

# Set the DATABASE_URL environment variable
$env:DATABASE_URL = $PostgresUrl

Write-Host "✓ DATABASE_URL set" -ForegroundColor Green
Write-Host ""

# Push schema to database
Write-Host "Pushing schema to Neon database..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Schema pushed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Generate Prisma client
    Write-Host "Generating Prisma client..." -ForegroundColor Yellow
    npx prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Prisma client generated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== Done! ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Your Neon database now has all the tables." -ForegroundColor Green
        Write-Host "You can now log in to your application!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "✗ Failed to generate Prisma client" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "✗ Failed to push schema" -ForegroundColor Red
    Write-Host "Please check your connection string and try again." -ForegroundColor Yellow
}

