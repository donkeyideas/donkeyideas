# Quick Start Guide - PowerShell Commands

## Option 1: Run the Setup Script (Recommended)

```powershell
cd "C:\Users\beltr\Donkey Ideas"
.\RUN_PROJECT.ps1
```

## Option 2: Manual Commands

### Step 1: Navigate to Project
```powershell
cd "C:\Users\beltr\Donkey Ideas"
```

### Step 2: Install Dependencies (First Time Only)
```powershell
npm install
```

### Step 3: Set Up Environment (First Time Only)
```powershell
# Copy .env.example to .env if it doesn't exist
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }

# Edit .env file and add your DATABASE_URL
# Example: DATABASE_URL="postgresql://user:password@localhost:5432/donkey_ideas?schema=public"
notepad .env
```

### Step 4: Generate Prisma Client
```powershell
cd packages\database
npm run db:generate
cd ..\..
```

### Step 5: Run Database Migrations (Requires DATABASE_URL)
```powershell
cd packages\database
npm run db:migrate
cd ..\..
```

**Note:** If you don't have a database set up yet, you can skip this step. The app will still run, but database features won't work.

### Step 6: Start Development Server
```powershell
npm run dev
```

The dashboard will be available at: **http://localhost:3001**

## Quick Commands Reference

### Start Development Server
```powershell
npm run dev
```

### Generate Prisma Client
```powershell
cd packages\database
npm run db:generate
cd ..\..
```

### Run Database Migrations
```powershell
cd packages\database
npm run db:migrate
cd ..\..
```

### Open Prisma Studio (Database GUI)
```powershell
cd packages\database
npm run db:studio
cd ..\..
```

### Install Dependencies
```powershell
npm install
```

### Build for Production
```powershell
npm run build
```

## Troubleshooting

### If npm install fails:
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### If Prisma errors:
- Make sure DATABASE_URL is set in .env
- Check that PostgreSQL is running
- Verify database exists: `createdb donkey_ideas` (if using PostgreSQL locally)

### If port 3001 is already in use:
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## Environment Variables

Edit `.env` file with these required variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/donkey_ideas?schema=public"
JWT_SECRET="your-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
NEXTAUTH_SECRET="your-nextauth-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3001"
```

## First Time Setup Checklist

- [ ] Install Node.js 20+ LTS
- [ ] Install PostgreSQL 15+ (or use cloud database)
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Edit `.env` with your DATABASE_URL
- [ ] Run `npm run db:generate`
- [ ] Run `npm run db:migrate`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3001
- [ ] Register a new account
- [ ] Create your first company


