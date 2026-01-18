# Fix Database Connection Error

## ❌ Error
```
Can't reach database server at `db.prisma.io:5432`
```

## 🔍 Diagnosis

Your app is trying to connect to Prisma's database service (`db.prisma.io`), but the connection is failing.

## ✅ Solutions

### Option 1: Verify DATABASE_URL in Vercel (Most Likely Issue)

1. Go to your **Vercel project** → **Settings** → **Environment Variables**
2. Check if `DATABASE_URL` exists and has the correct value:
   ```
   postgres://e41f5b5d9125847343e2af9743bd850fd81bed14dc39fb3534d4dda15d2d435c:sk_bAT0c5nLmmxMpvtquNk6D@db.prisma.io:5432/postgres?sslmode=require
   ```
3. If it's missing or incorrect:
   - Click **"Add New"** or **"Edit"**
   - **Key:** `DATABASE_URL`
   - **Value:** Paste the connection string above
   - **Environment:** Select all (Production, Preview, Development)
   - Click **"Save"**
4. **Redeploy** your project after updating

### Option 2: Check Prisma Database Status

1. Go to [Prisma Data Platform](https://console.prisma.io/)
2. Check if your database is **active** (not paused)
3. If paused, click **"Resume"** or **"Activate"**

### Option 3: Use Vercel Postgres Instead (Recommended)

If Prisma's database service is unreliable, switch to Vercel Postgres:

1. **Create Vercel Postgres:**
   - Go to Vercel → **Storage** → **Create Database** → **Postgres**
   - Create the database

2. **Get Connection String:**
   - Go to Storage → Your Postgres → **`.env.local`** tab
   - Copy the `POSTGRES_URL`

3. **Update DATABASE_URL:**
   - Go to **Settings** → **Environment Variables**
   - Update `DATABASE_URL` with the Vercel Postgres connection string
   - Or delete `DATABASE_URL` and let Vercel create it automatically when you connect the database

4. **Sync Schema:**
   ```powershell
   cd C:\Users\beltr\Donkey.Ideas\packages\database
   $env:DATABASE_URL="postgres://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb"
   npx prisma db push
   ```

5. **Redeploy**

### Option 4: Check Network/Firewall

If you're behind a firewall or VPN:
- Try accessing from a different network
- Check if port 5432 is blocked
- Verify SSL mode is set to `require` in the connection string

## 🔧 Quick Fix Steps

1. **Verify DATABASE_URL in Vercel** (most common issue)
2. **Redeploy** after making changes
3. **Check deployment logs** in Vercel for more details
4. **Test connection** by trying to create a company again

## 📝 Connection String Format

Your connection string should look like:
```
postgres://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

For Prisma:
```
postgres://e41f5b5d9125847343e2af9743bd850fd81bed14dc39fb3534d4dda15d2d435c:sk_bAT0c5nLmmxMpvtquNk6D@db.prisma.io:5432/postgres?sslmode=require
```

## ⚠️ Important Notes

- Environment variables in Vercel are **case-sensitive**
- Make sure `DATABASE_URL` (not `database_url` or `Database_Url`)
- After updating environment variables, you **must redeploy** for changes to take effect
- Check Vercel deployment logs for more detailed error messages


