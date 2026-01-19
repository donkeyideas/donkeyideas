# Financial Engine Migration Guide

**Goal:** Replace buggy, patched calculation logic with clean @donkey-ideas/financial-engine

## Current State (The Mess)

**Problems:**
- ❌ Transactions have wrong flags (affectsPL: false by default)
- ❌ Negative liabilities (-$17,367)
- ❌ Balance sheets don't balance
- ❌ Intercompany transactions only recorded on one side
- ❌ Multiple rebuild attempts created cascading errors
- ❌ Numbers change randomly after each "fix"

**Corrupted Data:**
- Hundreds of transactions with incorrect flags
- Balance sheet records out of sync with transactions
- Intercompany receivables with no matching payables

## Migration Plan

### Phase 1: Integrate Clean Engine ✅ DONE

- [x] Created `@donkey-ideas/financial-engine` package
- [x] Pure calculation functions (no database coupling)
- [x] Test suite proving it works
- [x] Documentation

### Phase 2: Create Clean API Endpoints (NEXT)

**Replace these routes with clean engine:**

1. **`/api/companies/[id]/financials/calculate`** (NEW)
   - Uses `calculateFinancials()` from engine
   - Input: Transaction[] from database
   - Output: Valid financial statements
   - No more database writes to P&L/Balance Sheet/Cash Flow tables

2. **`/api/companies/consolidated/financials/v2`** (NEW)
   - Uses `consolidateFinancials()` from engine
   - Fetches transactions for all companies
   - Returns consolidated statements
   - Proper intercompany elimination

3. **Keep old routes temporarily** (for comparison)
   - `/api/companies/[id]/transactions` (keep as-is)
   - Old calculation routes renamed to `.old.ts`

### Phase 3: Clean Up Data

**Step 3.1: Fix Transaction Flags**
```sql
-- Fix all revenue/expense transactions
UPDATE transactions 
SET 
  affectsPL = true,
  affectsCashFlow = true,
  affectsBalance = true
WHERE type IN ('revenue', 'expense');
```

**Step 3.2: Delete Corrupt Balance Sheet Records**
```sql
-- These will be recalculated on-demand by new engine
DELETE FROM balance_sheets;
DELETE FROM cash_flows;
DELETE FROM pl_statements;
```

**Why delete them?**
- Old records are corrupt and inconsistent
- New engine calculates everything from transactions (single source of truth)
- No need to store calculated data anymore

### Phase 4: Update Frontend

**Changes needed:**

1. **Dashboard Overview** (`apps/dashboard/src/app/app/dashboard/page.tsx`)
   - Change API call from `/consolidated/financials` to `/consolidated/financials/v2`
   - Remove dependency on balance sheet database records
   - Trust the calculated values

2. **Consolidated Financials** (`apps/dashboard/src/app/app/consolidated/page.tsx`)
   - Use new API endpoint
   - Remove client-side calculations
   - Display returned values directly

3. **Financial Hub** (`apps/dashboard/src/app/app/financials/page.tsx`)
   - Change to `/companies/[id]/financials/calculate`
   - Remove local calculation logic
   - Use engine's returned values

4. **Analytics & Reports** (`apps/dashboard/src/app/app/analytics/page.tsx`)
   - Use new consolidated endpoint
   - Remove old aggregation logic

### Phase 5: Remove Old Code

**Files to delete/simplify:**
- ❌ `/api/companies/[id]/balance-sheet/rebuild/route.ts`
- ❌ `/api/companies/consolidated/rebuild-all-balance-sheets/route.ts`
- ❌ `/api/companies/consolidated/rebuild-cashflow/route.ts`
- ❌ `/api/companies/[id]/transactions/fix-flags/route.ts`
- ❌ Complex client-side calculations in pages

**Why delete them?**
- No more "rebuild" needed - calculations are on-demand
- No more flag fixing needed - defaults are correct
- Simpler = less to break

## Implementation Steps

### Step 1: Create New API Route

```typescript
// apps/dashboard/src/app/api/companies/[id]/financials/calculate/route.ts
import { calculateFinancials } from '@donkey-ideas/financial-engine';

export async function GET(request, { params }) {
  // 1. Get transactions from database
  const transactions = await prisma.transaction.findMany({
    where: { companyId: params.id },
    orderBy: { date: 'asc' },
  });
  
  // 2. Transform to engine format
  const engineTransactions = transactions.map(tx => ({
    id: tx.id,
    date: new Date(tx.date),
    type: tx.type,
    category: tx.category,
    amount: Number(tx.amount),
    description: tx.description,
    affectsPL: tx.affectsPL ?? true,
    affectsCashFlow: tx.affectsCashFlow ?? true,
    affectsBalance: tx.affectsBalance ?? true,
  }));
  
  // 3. Calculate (pure function - no side effects!)
  const statements = calculateFinancials(engineTransactions, 0);
  
  // 4. Return clean results
  return NextResponse.json(statements);
}
```

### Step 2: Update Frontend

```typescript
// Before (client-side calculations)
const calculatePLFromTransactions = (transactions) => {
  // 100+ lines of buggy logic
};

// After (trust the engine)
const response = await api.get(`/companies/${id}/financials/calculate`);
const { pl, balanceSheet, cashFlow } = response.data;
```

### Step 3: Test with One Company

1. Pick a company with simple data
2. Use new endpoint
3. Validate numbers manually
4. Compare with old endpoint (should be different!)
5. Verify balance sheet balances

### Step 4: Roll Out Gradually

1. Dashboard Overview → New endpoint
2. Financial Hub → New endpoint
3. Consolidated View → New endpoint
4. Analytics → New endpoint
5. Disable/remove old endpoints

## Expected Results After Migration

**Dashboard Overview:**
```
Total Assets:     $X (positive or negative, but REAL)
Total Liabilities: $Y (always ≥ 0)
Total Equity:     $Z (can be negative)
✓ X = Y + Z (GUARANTEED!)
```

**Individual Companies:**
- ✅ P&L matches transaction totals
- ✅ Cash matches cash flow ending balance
- ✅ Balance sheet always balances
- ✅ No more negative liabilities

**Consolidated:**
- ✅ Sum of all companies
- ✅ Intercompany properly eliminated
- ✅ Valid and trustworthy numbers

## Rollback Plan

If migration fails:
1. Keep old routes available (renamed)
2. Frontend can switch back with one line change
3. No data loss (transactions are preserved)

## Timeline

- **Phase 1:** ✅ Complete (clean engine built)
- **Phase 2:** 1 session (create new API routes)
- **Phase 3:** 1 click (run SQL to clean data)
- **Phase 4:** 2 sessions (update 4 frontend pages)
- **Phase 5:** 1 session (cleanup old code)

**Total:** ~5 focused sessions vs 20+ patching sessions

## Success Criteria

✅ Balance sheet balances on every page  
✅ No negative liabilities  
✅ Cash matches profit (for cash businesses)  
✅ Intercompany eliminates properly  
✅ Numbers don't change randomly  
✅ You trust the numbers  

---

**Let's build it right this time!** 🚀
