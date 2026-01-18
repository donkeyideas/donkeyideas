# Database Setup Guide

Your application requires PostgreSQL (not SQLite) because it uses JSON fields extensively.

## Option 1: Free Cloud Database (Recommended - 5 minutes)

### Using Neon (Free tier: 0.5 GB storage, unlimited projects)

1. **Sign up**: Go to https://neon.tech
2. **Create a project**: Click "Create Project"
3. **Copy connection string**: It looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. **Update `.env.local`**:
   ```env
   DATABASE_URL="your-neon-connection-string-here"
   ```

5. **Push schema and generate client**:
   ```powershell
   cd packages/database
   npx prisma db push
   npx prisma generate
   ```

## Option 2: Local PostgreSQL

### Install PostgreSQL locally:

1. **Download**: https://www.postgresql.org/download/windows/
2. **Install** with default settings
3. **Create database**:
   ```sql
   createdb donkeyideas
   ```

4. **Update `.env.local`**:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/donkeyideas"
   ```

5. **Push schema**:
   ```powershell
   cd packages/database
   npx prisma db push
   npx prisma generate
   ```

## After Setup

Once your database is connected, restart your dev server:

```powershell
cd apps/dashboard
npm run dev
```

All pages will now work with persistent data storage!
