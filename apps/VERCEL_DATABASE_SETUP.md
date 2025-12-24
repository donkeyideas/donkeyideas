# Vercel Database Setup - Quick Fix

## ✅ What I Just Fixed

1. **Switched Prisma schema from SQLite to PostgreSQL**
   - Changed `provider = "sqlite"` to `provider = "postgresql"`
   - This is required because Vercel doesn't support SQLite (no persistent file system)

2. **Converted all Json fields back from String**
   - All fields that were converted to String for SQLite compatibility are now Json again
   - This includes: metadata, tags, permissions, content, parameters, etc.

3. **Removed Supabase** - Now using Vercel Postgres

## 🔧 Required: Set Up Vercel Postgres

**You need to create a Vercel Postgres database and set the DATABASE_URL:**

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Postgres**
4. Choose a plan and region
5. After creation, go to the database → **.env.local** tab
6. Copy the `POSTGRES_URL` connection string
7. Go to **Settings** → **Environment Variables**
8. Add a new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Paste the `POSTGRES_URL` you copied
   - **Environment:** Select all (Production, Preview, Development)

9. **Important:** After adding the environment variable, you need to **redeploy** your project for it to take effect.

## 📝 Connection String Format

The connection string from Vercel Postgres will look like:
```
postgres://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb
```

**Note:** Vercel automatically provides this - just copy it from the Storage tab.

## 🚀 Deploy Steps

1. **Commit the schema changes:**
   ```powershell
   cd C:\Users\beltr\Donkey.Ideas
   git add packages/database/prisma/schema.prisma
   git commit -m "Switch to PostgreSQL for Vercel deployment"
   git push
   ```

2. **Set DATABASE_URL in Vercel** (as described above)

3. **Redeploy in Vercel:**
   - Go to your project → **Deployments**
   - Click the three dots on the latest deployment
   - Select **Redeploy**

## ⚠️ Important Notes

- **Local Development:** Your local `.env.local` still uses SQLite (`file:C:/Users/beltr/Donkey.Ideas/packages/database/prisma/dev.db`). This is fine for local dev.
- **Vercel Production:** Will use Vercel Postgres from the environment variable you set.
- **Database Migration:** After deploying, you need to run `npx prisma db push` to sync the schema with Vercel Postgres.

## 🔍 Verify It's Working

After redeploying, check:
1. The build should succeed (no more "file:" protocol errors)
2. Login should work
3. Companies should be visible

If you still get errors, check:
- Is the DATABASE_URL set correctly in Vercel?
- Did you create the Vercel Postgres database?
- Did you redeploy after setting the environment variable?
- Have you run `npx prisma db push` to sync the schema?

