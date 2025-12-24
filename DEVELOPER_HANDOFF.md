# Financial Hub - Developer Handoff Document

## Current State

The Financial Hub (`/app/financials`) has the following issues:

1. **Summary Cards Work Correctly** ✅
   - Revenue, COGS, Expenses, Net Profit, Cash Balance are calculated from transactions
   - Located in `apps/dashboard/src/app/app/financials/page.tsx`
   - Functions: `calculateSummaryFromTransactions()`, `calculateCashBalanceFromTransactions()`

2. **Financial Statements Show Stale Data** ❌
   - P&L Statements, Balance Sheets, Cash Flow tables load from backend APIs
   - Backend returns old data from database that doesn't match current transactions
   - This creates inconsistency between summary cards (correct) and statements (wrong)

## The Problem

```
Transactions (Source of Truth) → Summary Cards ✅ CORRECT
Transactions (Source of Truth) → Backend API → Statements ❌ WRONG (stale data)
```

## Solution Options

### Option A: Clean Database + Rebuild (Quick Fix)
1. Delete all records from `pl_statements`, `balance_sheets`, `cash_flow_statements` tables
2. Use backend rebuild endpoints to regenerate from transactions
3. Verify statements match transactions

### Option B: Client-Side Calculation (Better Solution)
1. Remove dependency on backend statement APIs
2. Calculate P&L, Balance Sheet, Cash Flow client-side from transactions
3. Group transactions by month/period
4. Display calculated statements instead of backend data

### Option C: Fix Backend (Best Long-term)
1. Ensure backend rebuilds statements when transactions change
2. Add triggers or hooks to auto-rebuild on transaction create/update/delete
3. Verify backend calculations match frontend calculations

## Key Files

- `apps/dashboard/src/app/app/financials/page.tsx` - Main Financial Hub page
- `apps/dashboard/src/components/financials/transaction-entry-modal.tsx` - Transaction form
- `apps/dashboard/src/components/financials/transactions-table-new.tsx` - Transaction table
- `apps/dashboard/src/components/financials/financial-summary-cards.tsx` - Summary cards component

## Current Calculation Logic

### Summary Cards (Working)
```typescript
// Revenue: Sum of all transactions where type === 'revenue' AND affectsPL !== false
// COGS: Sum of expenses where category === 'direct_costs' OR 'infrastructure' AND affectsPL !== false
// Expenses: Sum of all other expenses where affectsPL !== false
// Net Profit: Revenue - COGS - Expenses
// Cash Balance: Sum of cash-affecting transactions
```

### Statements (Broken)
- Currently loaded from backend APIs
- Backend has stale data that doesn't match transactions
- Need to either fix backend or calculate client-side

## Database Cleanup Required

```sql
-- Run these to clean old statement data
DELETE FROM pl_statements;
DELETE FROM balance_sheets;
DELETE FROM cash_flow_statements;
```

## Testing Requirements

After fixes, verify:
1. Create 1 transaction → All calculations match exactly
2. Delete transaction → All statements show $0
3. Create multiple transactions → All totals match
4. Intercompany transfers → Don't double-count
5. Summary cards = Statement totals

## Recommended Next Steps

1. **Immediate**: Clean database tables (SQL above)
2. **Short-term**: Calculate statements client-side from transactions
3. **Long-term**: Add backend auto-rebuild on transaction changes


