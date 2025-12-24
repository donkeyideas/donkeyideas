# Database Migration Instructions

## Issue
The `UserSettings` table needs to be created in your database. There's also a migration history mismatch (SQLite vs PostgreSQL).

## Quick Fix (Recommended)

1. **Reset migration history** (if safe to do so in development):
   ```bash
   cd packages/database
   # Remove the old migrations folder if it exists
   # Then create a new migration
   npx prisma migrate dev --name add_user_settings
   ```

2. **Or manually create the table** using your database client:
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
     "updatedAt" TIMESTAMP(3) NOT NULL,
     CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
   );
   ```

3. **After creating the table, regenerate Prisma client**:
   ```bash
   cd packages/database
   npx prisma generate
   ```

## Current Status
- The Settings page will now load even without the table (shows empty fields)
- You can view the Settings page, but saving will fail until the table exists
- The API will return helpful error messages if the table is missing

## After Migration
Once the table is created:
1. Go to Settings page
2. Add your Deep Seek API key
3. Save the settings
4. The AI Assistant will then work properly

