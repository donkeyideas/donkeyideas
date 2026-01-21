# Budget System - Database Migration Required

## Current Status
✅ Code deployed to production  
❌ Database tables NOT created yet  
⚠️ Getting 500 errors on all budget endpoints

## What's Needed
The budget system requires 3 new database tables that haven't been created yet:
- `budget_categories`
- `budget_periods`  
- `budget_lines`

## How to Fix

### Option 1: Run Migration via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run this SQL migration:

```sql
-- Create enums
CREATE TYPE "BudgetType" AS ENUM ('BUDGET', 'FORECAST', 'ACTUALS');
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- Create budget_categories table
CREATE TABLE "budget_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "accountCode" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- Create budget_periods table
CREATE TABLE "budget_periods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "BudgetType" NOT NULL,
    "status" "BudgetStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id")
);

-- Create budget_lines table
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balance" DECIMAL(65,30),
    "notes" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "budget_categories_companyId_idx" ON "budget_categories"("companyId");
CREATE INDEX "budget_periods_companyId_startDate_idx" ON "budget_periods"("companyId", "startDate");
CREATE INDEX "budget_periods_companyId_type_status_idx" ON "budget_periods"("companyId", "type", "status");
CREATE INDEX "budget_lines_periodId_date_idx" ON "budget_lines"("periodId", "date");
CREATE INDEX "budget_lines_companyId_date_idx" ON "budget_lines"("companyId", "date");
CREATE INDEX "budget_lines_categoryId_idx" ON "budget_lines"("categoryId");
CREATE INDEX "budget_lines_isApproved_idx" ON "budget_lines"("isApproved");

-- Add foreign keys
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "budget_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "budget_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### Option 2: Use Prisma Migrate (Alternative)
If you have direct database access:

```bash
# Set your DATABASE_URL environment variable
export DATABASE_URL="postgresql://..."

# Run migration
cd packages/database
npx prisma migrate deploy
```

## Verification
After running the migration, verify the tables exist:

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'budget%';
```

You should see:
- budget_categories
- budget_periods
- budget_lines

## After Migration
Once tables are created:
1. Refresh https://www.donkeyideas.com/app/budget
2. The 500 errors should be gone
3. You can start creating categories and periods

## Why This Happened
The Prisma schema was updated with budget tables, but the actual database migration wasn't run. In production, schema changes need to be explicitly applied to the database.

---

**Current Error:** 500 on `/api/budget/periods`, `/api/budget/categories`, etc.  
**After Migration:** Budget system will work fully ✅
