# Vercel Postgres Setup Guide

## ✅ What Changed

- **Removed Supabase** - No longer using Supabase database
- **Switched to Vercel Postgres** - Native PostgreSQL database for Vercel deployments

## 🚀 Setting Up Vercel Postgres

### Step 1: Create Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a plan (Hobby plan is free for development)
6. Select a region (choose closest to your users)
7. Click **Create**

### Step 2: Get Connection String

After creating the database:

1. Go to **Storage** → Your Postgres database
2. Click on the **.env.local** tab
3. Copy the `POSTGRES_URL` connection string
4. It will look like: `postgres://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb`

### Step 3: Set Environment Variable in Vercel

1. Go to your project → **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Paste the `POSTGRES_URL` from Step 2
   - **Environment:** Select all (Production, Preview, Development)
3. Click **Save**

### Step 4: Run Database Migrations

After setting up the database, you need to push your Prisma schema:

```powershell
cd C:\Users\beltr\Donkey.Ideas\packages\database

# Set the DATABASE_URL (use the POSTGRES_URL from Vercel)
$env:DATABASE_URL="postgres://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb"

# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Step 5: Migrate Data from SQLite (Optional)

If you have data in your local SQLite database that you want to migrate:

1. Export data from SQLite
2. Import into Vercel Postgres

You can use a script like this (create `migrate-to-vercel-postgres.js`):

```javascript
const { PrismaClient } = require('@prisma/client');

// Local SQLite client
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db' // Your local SQLite path
    }
  }
});

// Vercel Postgres client
const vercelPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // Vercel Postgres URL
    }
  }
});

// Migration logic here...
```

## 🔧 Local Development

For local development, you can still use SQLite:

1. Keep your local `.env.local` with:
   ```
   DATABASE_URL="file:C:/Users/beltr/Donkey.Ideas/packages/database/prisma/dev.db"
   ```

2. The Prisma schema is already set to PostgreSQL, but it will work with SQLite if you change the provider back to `sqlite` for local dev, or use a local PostgreSQL instance.

## 📝 Environment Variables Summary

**Vercel (Production):**
- `DATABASE_URL` = Vercel Postgres connection string (from Storage tab)

**Local Development:**
- `DATABASE_URL` = SQLite file path (for local dev)

## ✅ Verification

After setup:

1. **Deploy to Vercel** - The build should succeed
2. **Test Login** - Should connect to Vercel Postgres
3. **Check Database** - Data should be in Vercel Postgres

## 🔍 Troubleshooting

### "Can't reach database server"

- Verify `DATABASE_URL` is set in Vercel environment variables
- Make sure you redeployed after adding the environment variable
- Check that the Vercel Postgres database is active

### "Schema validation error"

- Run `npx prisma db push` to sync schema with Vercel Postgres
- Make sure Prisma client is generated: `npx prisma generate`

### Migration issues

- Vercel Postgres uses standard PostgreSQL, so all Prisma features work
- Use `prisma db push` for development
- Use `prisma migrate deploy` for production migrations

## 💡 Benefits of Vercel Postgres

- ✅ Native integration with Vercel
- ✅ Automatic backups
- ✅ No connection limits on Hobby plan
- ✅ Fast connection (same network as your app)
- ✅ Easy to scale
- ✅ Free tier available

