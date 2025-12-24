# Quick Database Setup Guide

## The Problem
Prisma needs `DATABASE_URL` to be accessible. The `.env` file is in the root, but Prisma runs from `packages/database` and needs the `.env` there too.

## Solution 1: Free Cloud Database (Easiest - Recommended)

### Using Supabase (Free PostgreSQL)

1. **Go to https://supabase.com**
2. **Sign up for free account**
3. **Create a new project**
4. **Go to Project Settings → Database**
5. **Copy the "Connection string" (URI format)**
6. **Edit `.env` file** and replace DATABASE_URL:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```
7. **Copy .env to packages/database:**
   ```powershell
   Copy-Item ".env" "packages\database\.env" -Force
   ```
8. **Run migrations:**
   ```powershell
   cd packages\database
   npm run db:migrate
   cd ..\..
   ```

### Using Railway (Free PostgreSQL)

1. **Go to https://railway.app**
2. **Sign up and create new project**
3. **Add PostgreSQL database**
4. **Copy the connection string**
5. **Update `.env` file**
6. **Copy .env to packages/database** (same as above)

## Solution 2: Local PostgreSQL

1. **Install PostgreSQL:**
   - Download from https://www.postgresql.org/download/windows/
   - Install with default settings
   - Remember the postgres user password

2. **Create database:**
   ```powershell
   # Open PostgreSQL command line
   psql -U postgres
   
   # Create database
   CREATE DATABASE donkey_ideas;
   
   # Exit
   \q
   ```

3. **Update `.env` file:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/donkey_ideas?schema=public"
   ```

4. **Copy .env and run migrations:**
   ```powershell
   Copy-Item ".env" "packages\database\.env" -Force
   cd packages\database
   npm run db:migrate
   cd ..\..
   ```

## Solution 3: Use SQLite (No Setup Required)

If you want to skip PostgreSQL setup, I can help you switch to SQLite. Just ask!

## Quick Fix Commands

After setting DATABASE_URL in `.env`:

```powershell
# Copy .env to packages/database
cd "C:\Users\beltr\Donkey Ideas"
Copy-Item ".env" "packages\database\.env" -Force

# Run migrations
cd packages\database
npm run db:migrate
cd ..\..

# Create admin user
.\CREATE_ADMIN.ps1
```

## Verify Setup

After migrations, you should see:
```
✓ Applied migration: 2024...
```

Then create admin user:
```
✓ Admin user created!
  Email: admin@donkeyideas.com
  Password: Admin123!
```

## Still Having Issues?

1. **Check .env file exists** in both root and `packages/database`
2. **Verify DATABASE_URL format** - should start with `postgresql://`
3. **Test database connection** - make sure database is accessible
4. **Check for typos** in DATABASE_URL


