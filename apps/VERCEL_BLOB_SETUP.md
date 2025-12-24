# Vercel Blob Storage Setup

## ✅ What Changed

The logo upload functionality has been updated to use **Vercel Blob Storage** instead of the local file system. This is required because Vercel's serverless functions have a read-only file system.

## 🔧 Setup Steps

### Step 1: Install Dependencies

```powershell
cd C:\Users\beltr\Donkey.Ideas\apps\dashboard
npm install
```

### Step 2: Create Vercel Blob Store

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Blob**
4. Choose a plan (Hobby plan is free)
5. Select a region
6. Click **Create**

### Step 3: Get Blob Token

After creating the Blob store:

1. Go to **Storage** → Your Blob store
2. Click on the **`.env.local`** tab
3. Copy the `BLOB_READ_WRITE_TOKEN` value

### Step 4: Set Environment Variable in Vercel

1. Go to **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name:** `BLOB_READ_WRITE_TOKEN`
   - **Value:** Paste the token you copied
   - **Environment:** Select all (Production, Preview, Development)
3. Click **Save**

### Step 5: Commit and Deploy

```powershell
cd C:\Users\beltr\Donkey.Ideas
git add .
git commit -m "Fix logo upload: Use Vercel Blob Storage instead of local file system"
git push
```

Vercel will automatically redeploy. After deployment, logo uploads should work!

## ✅ Verification

After deploying:
1. Try uploading a company logo
2. It should upload successfully without the "read-only file system" error
3. The logo URL will be a Vercel Blob Storage URL (e.g., `https://xxxxx.public.blob.vercel-storage.com/...`)

## 📝 How It Works

- **Before:** Files were saved to `/public/uploads/logos/` (doesn't work on Vercel)
- **After:** Files are uploaded to Vercel Blob Storage and stored in the cloud
- **Benefits:**
  - ✅ Works on serverless platforms
  - ✅ Automatic CDN distribution
  - ✅ No file system limitations
  - ✅ Scalable storage

## 🔍 Troubleshooting

### "BLOB_READ_WRITE_TOKEN is not defined"

- Make sure you created a Blob store in Vercel
- Verify the `BLOB_READ_WRITE_TOKEN` is set in environment variables
- Redeploy after adding the environment variable

### Upload still fails

- Check Vercel deployment logs for errors
- Verify the Blob store is active
- Make sure you're using the correct token from the Blob store's `.env.local` tab

