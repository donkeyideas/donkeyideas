-- Create UserSettings table
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "user_settings_userId_idx" ON "user_settings"("userId");

