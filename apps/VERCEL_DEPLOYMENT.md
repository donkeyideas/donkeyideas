# Deploying to Vercel - Complete Guide

## ⚠️ Critical: Database Migration Required

**Your project currently uses SQLite, which does NOT work on Vercel.**

Vercel is a serverless platform with no persistent file system. You **must** use PostgreSQL for production deployment. We recommend **Vercel Postgres** for seamless integration.

## Prerequisites

1. ✅ GitHub repository (already done: https://github.com/beltranalain/Donkey.Ideas)
2. ✅ Vercel account (sign up at https://vercel.com)
3. ✅ Vercel Postgres database (create one in your Vercel dashboard)

## Step 1: Switch Database Back to PostgreSQL

### 1.1 Update Prisma Schema

Edit `packages/database/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite" to "postgresql"
  url      = env("DATABASE_URL")
}

// Convert all String fields back to Json where needed
model ApiUsage {
  // ...
  metadata      Json?    // Change from String? back to Json?
  // ... (repeat for all Json fields)
}
```

### 1.2 Update Environment Variables

Create/update `apps/dashboard/.env.production` (for reference):

```env
DATABASE_URL="postgres://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

**Note:** Get the `DATABASE_URL` from your Vercel Postgres database → `.env.local` tab

### 1.3 Regenerate Prisma Client

```powershell
cd C:\Users\beltr\Donkey.Ideas\packages\database
npx prisma generate
```

## Step 2: Create Vercel Configuration

### 2.1 Create `vercel.json` in Root

Create `vercel.json` in the project root:

```json
{
  "buildCommand": "cd apps/dashboard && npm run build",
  "outputDirectory": "apps/dashboard/.next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "rootDirectory": "apps/dashboard"
}
```

### 2.2 Update `package.json` (Root Level)

Add build script to root `package.json`:

```json
{
  "scripts": {
    "build": "cd apps/dashboard && npm run build"
  }
}
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New Project"

2. **Import GitHub Repository**
   - Select "Import Git Repository"
   - Choose `beltranalain/Donkey.Ideas`
   - Click "Import"

3. **Configure Project Settings**
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/dashboard`
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** `.next` (or leave default)
   - **Install Command:** `npm install` (or leave default)

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   
   ```
   DATABASE_URL = postgres://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb
   NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
   ```
   
   **Note:** Get the `DATABASE_URL` from your Vercel Postgres database → `.env.local` tab
   
   **Optional API Keys** (if you use them):
   ```
   DEEPSEEK_API_KEY = your-key-here
   OPENAI_API_KEY = your-key-here
   ANTHROPIC_API_KEY = your-key-here
   GOOGLE_API_KEY = your-key-here
   STRIPE_API_KEY = your-key-here
   SENDGRID_API_KEY = your-key-here
   TWILIO_API_KEY = your-key-here
   TWILIO_API_SECRET = your-key-here
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (5-10 minutes)

### Option B: Deploy via Vercel CLI

```powershell
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd C:\Users\beltr\Donkey.Ideas
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? donkey-ideas (or your choice)
# - Directory? apps/dashboard
# - Override settings? No
```

## Step 4: Run Database Migrations

After deployment, you need to run Prisma migrations:

```powershell
cd C:\Users\beltr\Donkey.Ideas\packages\database

# Set production DATABASE_URL (get from Vercel Postgres → .env.local tab)
$env:DATABASE_URL="postgres://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb"

# Push schema to database
npx prisma db push

# Or run migrations
npx prisma migrate deploy
```

## Step 5: Migrate Data from SQLite to Vercel Postgres (Optional)

If you have data in your local SQLite database that you want to migrate:

```powershell
cd C:\Users\beltr\Donkey.Ideas\packages\database

# Create a migration script to export from SQLite and import to Vercel Postgres
# See VERCEL_POSTGRES_SETUP.md for migration examples
```

## Step 6: Verify Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test login functionality
3. Verify database connections work
4. Check that companies/data are visible

## Troubleshooting

### Build Fails: "Cannot find module"

**Solution:** Make sure `transpilePackages` in `next.config.js` includes all workspace packages.

### Database Connection Errors

**Solution:** 
- Verify `DATABASE_URL` is correct in Vercel environment variables
- Ensure Vercel Postgres database is created and active
- Get the connection string from Vercel Postgres → `.env.local` tab

### Prisma Client Errors

**Solution:**
```powershell
# Regenerate Prisma client
cd packages/database
npx prisma generate

# Commit and push
git add .
git commit -m "Regenerate Prisma client for PostgreSQL"
git push
```

### Environment Variables Not Working

**Solution:**
- Make sure variables are set in Vercel dashboard
- Redeploy after adding new variables
- Use `NEXT_PUBLIC_` prefix for client-side variables only

## Post-Deployment Checklist

- [ ] Database switched to PostgreSQL
- [ ] Prisma schema updated
- [ ] Environment variables set in Vercel
- [ ] Database migrations run
- [ ] Data migrated from SQLite to Vercel Postgres (if needed)
- [ ] Application accessible at Vercel URL
- [ ] Login functionality works
- [ ] Companies/data visible
- [ ] API endpoints working

## Next Steps

1. Set up custom domain (optional)
2. Configure CI/CD for automatic deployments
3. Set up monitoring and error tracking
4. Vercel Postgres includes automatic backups

## Important Notes

- **SQLite files are NOT deployed** - they're in `.gitignore` (good!)
- **Environment variables are secure** - stored in Vercel, not in code
- **Database must be PostgreSQL** - SQLite won't work on serverless
- **Migrations must be run** - after switching to PostgreSQL

