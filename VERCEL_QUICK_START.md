# Quick Start: Deploy to Vercel

## 🚨 Critical First Step: Switch to PostgreSQL

**Your project uses SQLite, which won't work on Vercel. You MUST switch to PostgreSQL first.**

## Quick Checklist

### 1. Switch Database to PostgreSQL (5 minutes)

```powershell
# Edit packages/database/prisma/schema.prisma
# Change line 8 from:
#   provider = "sqlite"
# To:
#   provider = "postgresql"

# Then regenerate Prisma client
cd C:\Users\beltr\Donkey.Ideas\packages\database
npx prisma generate
```

### 2. Deploy to Vercel (10 minutes)

1. **Go to:** https://vercel.com/new
2. **Import:** `beltranalain/Donkey.Ideas`
3. **Settings:**
   - Framework: Next.js
   - Root Directory: `apps/dashboard`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Environment Variables:**
   ```
   DATABASE_URL = postgresql://postgres.ncjsexetlyzmgiqqdcpu:[PASSWORD]@db.ncjsexetlyzmgiqqdcpu.supabase.co:5432/postgres?sslmode=require
   NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
   ```

5. **Click Deploy**

### 3. Run Database Migrations

After deployment:

```powershell
cd C:\Users\beltr\Donkey.Ideas\packages\database
$env:DATABASE_URL="postgresql://postgres.ncjsexetlyzmgiqqdcpu:[PASSWORD]@db.ncjsexetlyzmgiqqdcpu.supabase.co:5432/postgres?sslmode=require"
npx prisma db push
```

### 4. Migrate Your Data

Your local SQLite data needs to be moved to Supabase. Use your existing migration script or create a new one.

## That's It! 🎉

Your app will be live at: `https://your-app.vercel.app`

See `VERCEL_DEPLOYMENT.md` for detailed instructions.


