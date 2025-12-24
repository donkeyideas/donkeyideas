# Update Database URL Script
# This script helps you update the DATABASE_URL in .env

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Update DATABASE_URL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\Users\beltr\Donkey Ideas"
Set-Location $projectPath

Write-Host "Your Supabase project: ncjsexetlyzmgiqqdcpu" -ForegroundColor Green
Write-Host ""
Write-Host "To get your connection string:" -ForegroundColor Yellow
Write-Host "1. Go to: https://supabase.com/dashboard/project/ncjsexetlyzmgiqqdcpu" -ForegroundColor White
Write-Host "2. Click: Project Settings → Database" -ForegroundColor White
Write-Host "3. Copy the 'Connection string' (URI format)" -ForegroundColor White
Write-Host "4. It should look like:" -ForegroundColor White
Write-Host "   postgresql://postgres:[PASSWORD]@db.ncjsexetlyzmgiqqdcpu.supabase.co:5432/postgres" -ForegroundColor Cyan
Write-Host ""
Write-Host "OR use Connection Pooling (better for Next.js):" -ForegroundColor Yellow
Write-Host "   postgresql://postgres.ncjsexetlyzmgiqqdcpu:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "Do you have your database password? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    $password = Read-Host "Enter your Supabase database password" -AsSecureString
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
    
    Write-Host ""
    Write-Host "Choose connection type:" -ForegroundColor Yellow
    Write-Host "1. Direct connection (port 5432)" -ForegroundColor White
    Write-Host "2. Connection pooling (port 6543) - Recommended" -ForegroundColor White
    $connType = Read-Host "Enter choice (1 or 2)"
    
    if ($connType -eq "2") {
        # Connection pooling - need to get region
        Write-Host ""
        Write-Host "What region is your Supabase project in?" -ForegroundColor Yellow
        Write-Host "Common: us-west-1, us-east-1, eu-west-1, ap-southeast-1" -ForegroundColor White
        $region = Read-Host "Enter region (e.g., us-west-1)"
        
        $connectionString = "postgresql://postgres.ncjsexetlyzmgiqqdcpu:$passwordPlain@aws-0-$region.pooler.supabase.com:6543/postgres"
    } else {
        # Direct connection
        $connectionString = "postgresql://postgres:$passwordPlain@db.ncjsexetlyzmgiqqdcpu.supabase.co:5432/postgres"
    }
    
    # Update .env file
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace 'DATABASE_URL=".*"', "DATABASE_URL=`"$connectionString`""
    Set-Content ".env" -Value $envContent -NoNewline
    
    # Copy to packages/database
    Copy-Item ".env" "packages\database\.env" -Force
    
    Write-Host ""
    Write-Host "✓ DATABASE_URL updated!" -ForegroundColor Green
    Write-Host "✓ .env copied to packages/database" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now run:" -ForegroundColor Cyan
    Write-Host "  cd packages\database" -ForegroundColor White
    Write-Host "  npm run db:migrate" -ForegroundColor White
    Write-Host "  cd ..\.." -ForegroundColor White
    Write-Host "  .\CREATE_ADMIN.ps1" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "To find your password:" -ForegroundColor Yellow
    Write-Host "1. Go to Supabase dashboard" -ForegroundColor White
    Write-Host "2. Project Settings → Database" -ForegroundColor White
    Write-Host "3. Look for 'Database password' or reset it" -ForegroundColor White
    Write-Host ""
    Write-Host "Or manually edit .env file:" -ForegroundColor Yellow
    Write-Host "  notepad .env" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again or manually copy .env to packages/database" -ForegroundColor Yellow
}


