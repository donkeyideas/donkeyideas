# Quick Guide: Connecting Vercel Postgres

## Step 1: In the Modal Dialog

1. **Environments:** ✅ Keep all checked (Development, Preview, Production)
2. **Custom Prefix:** ❌ **CLEAR THIS FIELD** (make it empty/blank)
   - This ensures Vercel creates `POSTGRES_URL` instead of `STORAGE_URL`
3. Click **"Connect"**

## Step 2: After Connecting

1. Go to your database in the **Storage** tab
2. Click on the **`.env.local`** tab
3. Copy the `POSTGRES_URL` value (it will look like: `postgres://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb`)

## Step 3: Set DATABASE_URL Environment Variable

1. Go to **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Enter:
   - **Key:** `DATABASE_URL`
   - **Value:** Paste the `POSTGRES_URL` you copied
   - **Environment:** Select all (Production, Preview, Development)
4. Click **"Save"**

## Step 4: Sync Database Schema

After setting up, run these commands locally:

```powershell
cd C:\Users\beltr\Donkey.Ideas\packages\database

# Set the DATABASE_URL (use the POSTGRES_URL from Vercel)
$env:DATABASE_URL="postgres://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb"

# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

## Step 5: Redeploy

Go to **Deployments** → Click the three dots (⋯) → **Redeploy**

## ✅ Done!

Your app should now connect to Vercel Postgres successfully!

