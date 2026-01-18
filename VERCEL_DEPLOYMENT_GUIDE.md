# Vercel Deployment Guide

## 🚨 **Current Issue**

Your Vercel deployment is linked to the wrong project (`argu-fights-projects/dashboard`). Let's fix this.

## ✅ **Step-by-Step Deployment**

### **1. Unlink Current Vercel Project**

```powershell
cd C:\Users\beltr\Donkey.Ideas\apps\dashboard
rm -rf .vercel
```

### **2. Set Up Environment Variables in Vercel Dashboard**

Before deploying, you need to add environment variables:

1. Go to: https://vercel.com/dashboard
2. Create a new project or select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```env
# Required for Vercel Deployment
DATABASE_URL=your-neon-postgres-url-here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Important**: For `DATABASE_URL`, you need a PostgreSQL database (use Neon free tier as described in `DATABASE_SETUP.md`)

### **3. Deploy via Vercel Dashboard (Recommended)**

The easiest way:

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select: `donkeyideas/donkeyideas`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/dashboard`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
5. Add Environment Variables (see step 2)
6. Click **"Deploy"**

### **4. Alternative: Deploy via CLI**

```powershell
cd C:\Users\beltr\Donkey.Ideas\apps\dashboard

# Deploy to production
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - What's your project's name? donkeyideas
# - In which directory is your code located? ./
# - Want to modify settings? No
```

## 📝 **Post-Deployment Setup**

### **1. Set Up Database**

Your app needs a PostgreSQL database. Use Neon (free):

1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Add it to Vercel Environment Variables as `DATABASE_URL`
5. Redeploy your app

### **2. Run Database Migration**

After adding `DATABASE_URL`:

```powershell
# In your Vercel dashboard, go to your project
# Then run this via their CLI or add it as a build command:
npx prisma db push
npx prisma generate
```

### **3. Seed Admin User**

You can seed the database via:
- Vercel's serverless function
- Or manually via Prisma Studio

## 🔧 **Troubleshooting**

### **Build Failing?**

1. **Check ESLint errors**: We disabled ESLint during builds in `next.config.js`, but verify it's working
2. **Missing env vars**: Ensure `DATABASE_URL` is set
3. **Check build logs**: Go to Vercel dashboard → Deployments → View logs

### **Database Connection Errors?**

1. Verify `DATABASE_URL` starts with `postgresql://` or `postgres://`
2. Make sure it has `?sslmode=require` at the end
3. Test locally first before deploying

### **404 Errors on Pages?**

1. Verify all pages exist in `apps/dashboard/src/app/`
2. Check dynamic routes have proper folder structure (e.g., `[slug]/page.tsx`)
3. Clear Vercel cache and redeploy

## 📧 **Support**

If you need help:
1. Check Vercel deployment logs
2. Review `DATABASE_SETUP.md` for database setup
3. Check `ADMIN_LOGIN.md` for login credentials

---

**Quick Deploy**: Use Vercel Dashboard method (step 3) - it's the most reliable!
