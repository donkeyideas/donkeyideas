# Fix Settings API Error

## Problem
The error "Cannot read properties of undefined (reading 'upsert')" occurs because:
1. The Prisma client hasn't been regenerated with the new `UserSettings` model
2. The `user_settings` table may not exist in the database

## Solution (Choose One Method)

### Method 1: Quick Fix (Recommended)

1. **Stop your dev server** (Ctrl+C in the terminal where `npm run dev` is running)

2. **Create the database table** using your Supabase dashboard or psql:
   - Go to your Supabase project SQL Editor
   - Run this SQL:
   ```sql
   CREATE TABLE IF NOT EXISTS "user_settings" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "userId" TEXT NOT NULL UNIQUE,
     "deepSeekApiKey" TEXT,
     "openaiApiKey" TEXT,
     "anthropicApiKey" TEXT,
     "googleApiKey" TEXT,
     "stripeApiKey" TEXT,
     "sendgridApiKey" TEXT,
     "twilioApiKey" TEXT,
     "twilioApiSecret" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
   );
   
   CREATE INDEX IF NOT EXISTS "user_settings_userId_idx" ON "user_settings"("userId");
   ```

3. **Regenerate Prisma client**:
   ```bash
   cd packages/database
   npx prisma generate
   ```

4. **Restart your dev server**:
   ```bash
   cd ../..
   npm run dev
   ```

### Method 2: Using Prisma Migrate

1. **Stop your dev server**

2. **Create and run migration**:
   ```bash
   cd packages/database
   npx prisma migrate dev --name add_user_settings
   ```

3. **Restart your dev server**

## Verification

After completing the steps:
1. Go to Settings page - it should load without errors
2. Add your Deep Seek API key
3. Click "Save API Keys" - it should save successfully
4. The AI Assistant should now work!

## If You Still Get Errors

If you still see errors after following these steps:
1. Check that the table exists: Run `SELECT * FROM user_settings LIMIT 1;` in your database
2. Verify Prisma client: Check that `node_modules/.prisma/client/index.d.ts` includes `userSettings`
3. Clear Next.js cache: Delete `.next` folder and restart

