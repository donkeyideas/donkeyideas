# Financial Calculation Fixes

## Issues Found

### 1. **DOUBLE-COUNTING CASH (Critical Bug)**
**Location:** `apps/dashboard/src/lib/hooks/use-consolidated-data.ts`

**Problem:**
- Cash was being counted TWICE in the balance sheet calculation:
  1. First in lines 82-92 when processing revenue/expense cash flow
  2. Again in lines 96-127 when processing balance sheet items
- This caused **negative assets of -$33,071** on Dashboard Overview

**Fix:**
- Removed duplicate cash calculation
- Cash balance is now calculated once in the Cash Flow section
- Balance sheet `totalAssets` now uses `cashBalance` directly instead of recalculating `cash`

### 2. **Inconsistent COGS Treatment**
**Location:** Multiple pages

**Problem:**
- Some pages included COGS in "Total Expenses"
- Some kept COGS separate
- This caused the $366 discrepancy between pages

**Fix:**
- Standardized calculation across all pages:
  - `Total Expenses = COGS + Operating Expenses`
  - `Net Profit = Revenue - Total Expenses`
- All pages now calculate consistently

### 3. **Balance Sheet Logic**
**Location:** `apps/dashboard/src/lib/hooks/use-consolidated-data.ts` and `apps/dashboard/src/app/app/consolidated/page.tsx`

**Problem:**
- Revenue/Expense transactions were affecting asset accounts multiple times
- Cash flow and balance sheet calculations were conflated

**Fix:**
- Separated cash flow calculation from balance sheet positions
- Clear distinction:
  - **P&L:** Revenue and Expenses (when `affectsPL !== false`)
  - **Cash Flow:** Transactions that affect cash (when `affectsCashFlow !== false`)
  - **Balance Sheet:** A/R, A/P, Fixed Assets, Debt (when `affectsBalance !== false`)
- Accrual transactions (where `affectsCashFlow === false`) now correctly affect A/R or A/P

## Calculation Formula

### Correct Formula Now:
```
Total Revenue = Sum of all revenue transactions
COGS = Sum of expenses in categories: direct_costs, infrastructure
Operating Expenses = Sum of all other expenses
Total Expenses = COGS + Operating Expenses
Net Profit = Total Revenue - Total Expenses

Cash Balance = Starting Cash
  + Revenue (if affectsCashFlow !== false)
  - Expenses (if affectsCashFlow !== false)
  + Asset/Liability/Equity transactions (signed amounts)

Total Assets = Cash Balance + Accounts Receivable + Fixed Assets
Total Liabilities = Accounts Payable + Short Term Debt + Long Term Debt
Total Equity = Total Assets - Total Liabilities
```

## Files Modified

1. `apps/dashboard/src/lib/hooks/use-consolidated-data.ts` - Fixed double-counting and logic
2. `apps/dashboard/src/app/app/consolidated/page.tsx` - Fixed cash flow calculation

## Pages Affected (Now Consistent)

1. **Dashboard Overview** - Uses `use-consolidated-data.ts` hook (FIXED)
2. **Consolidated Financials** - Uses local calculation (FIXED)
3. **Financial Hub** - Uses client-side calculation (Already correct)
4. **Analytics & Reports** - Uses consolidated API (Will use fixed logic)

## Expected Results After Fix

All pages should now show:
- **Consistent Total Expenses** (including COGS)
- **Correct Cash Balance** (no double-counting)
- **Accurate Total Assets** (cash + A/R + fixed assets, no negative values from double-counting)
- **Proper Total Equity** (assets - liabilities)

## Verification Steps

1. Clear all data: Click "Clear All Data" on Financial Hub
2. Add test transactions:
   - Revenue: $1,000 (cash)
   - Expense (COGS): $200 (cash)
   - Expense (Admin): $300 (cash)
3. Expected results on ALL pages:
   - Total Revenue: $1,000
   - COGS: $200
   - Total Expenses: $500 (= $200 + $300)
   - Net Profit: $500 (= $1,000 - $500)
   - Cash Balance: $500 (= $1,000 - $200 - $300)
   - Total Assets: $500 (= cash balance)
   - Total Equity: $500 (= assets - $0 liabilities)
