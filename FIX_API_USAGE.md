# Fix API Usage Tracking

## Problem
The API usage tracking isn't working because the Prisma client hasn't been regenerated with the new `ApiUsage` model.

## Solution

1. **Stop your dev server** (Ctrl+C)

2. **Regenerate Prisma client**:
   ```bash
   cd packages/database
   npx prisma generate
   ```

3. **Restart your dev server**:
   ```bash
   cd ../..
   npm run dev
   ```

## Verification

After regenerating:
1. Make a call to the AI Assistant
2. Go to API Usage & Costs page
3. You should see the call logged with cost information

## Note

The code now handles the case where the model doesn't exist yet (returns empty stats), but to actually track usage, you need to regenerate the Prisma client.

