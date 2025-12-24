# Get Supabase Connection Pooler URL

## Steps:

1. **Go to your Supabase project dashboard:**
   https://supabase.com/dashboard/project/ncjsexetlyzmgiqqdcpu

2. **Click:** Project Settings (gear icon) → Database

3. **Scroll down to "Connection pooling"** section

4. **Look for "Connection string"** under Connection pooling

5. **Select "Transaction" mode** (recommended for Next.js)

6. **Copy the connection string** - it will look like:
   ```
   postgresql://postgres.ncjsexetlyzmgiqqdcpu:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

7. **Replace [PASSWORD] with:** Seminole!1

8. **The final connection string should be:**
   ```
   postgresql://postgres.ncjsexetlyzmgiqqdcpu:Seminole!1@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

**Note:** Replace [REGION] with your actual region (e.g., us-west-1, us-east-1, eu-west-1)

## Alternative: Use Direct Connection (if pooler doesn't work)

If you can't find the pooler URL, we can try:
1. Make sure your Supabase project is **not paused**
2. Use the direct connection string (port 5432)
3. The database might need to be "resumed" if it's paused

## Quick Update

Once you have the pooler connection string, I can update the .env file for you!


