# Financial System Cleanup Plan

## Problem
- Cash flow statements showing incorrect values (e.g., $200 when only 1 transaction exists)
- Suspected hardcoded or stale data in financial statement tables
- Inconsistent calculations between summary cards and statements

## Solution

### 1. Frontend Fixes (✅ COMPLETED)
- **Simplified Cash Balance Calculation**: Fixed `calculateCashBalanceFromTransactions` to be more accurate and only count transactions that explicitly affect cash
- **Added "Rebuild All Financials" Button**: New button in Financial Hub that:
  - Deletes all P&L statements, Balance Sheets, and Cash Flow statements
  - Rebuilds them from transactions
  - Ensures 100% accuracy

### 2. Backend Endpoints Needed

The frontend now calls these endpoints. You need to implement them in your backend:

#### DELETE `/companies/:companyId/financials/statements`
**Purpose**: Delete all financial statements for a company
**Action**: 
- Delete all P&L statements
- Delete all Balance Sheet statements  
- Delete all Cash Flow statements
**Response**: `{ success: true }`

#### POST `/companies/:companyId/financials/rebuild-pl`
**Purpose**: Rebuild P&L statements from transactions
**Action**:
- Get all transactions for the company
- Group by month
- Calculate Revenue, COGS, Expenses, Net Profit for each month
- Create/update P&L statements
**Response**: `{ success: true, plStatements: [...] }`

#### POST `/companies/:companyId/financials/rebuild-balance`
**Purpose**: Rebuild Balance Sheet statements from transactions
**Action**:
- Get all transactions for the company
- Group by month
- Calculate Assets (Cash, A/R, Fixed Assets), Liabilities (A/P, Debt), Equity
- Create/update Balance Sheet statements
**Response**: `{ success: true, balanceSheets: [...] }`

#### POST `/companies/:companyId/financials/rebuild-cashflow`
**Purpose**: Rebuild Cash Flow statements from transactions
**Action**:
- Get all transactions for the company
- Group by month
- Calculate Operating, Investing, Financing cash flows
- Calculate Ending Cash balance
- Create/update Cash Flow statements
**Response**: `{ success: true, cashFlows: [...] }`

### 3. Calculation Rules

#### Cash Balance Calculation
```
For each transaction:
  IF affectsCashFlow === false: SKIP
  
  IF type === 'asset' AND category === 'cash':
    cashBalance += amount (can be positive or negative)
  
  IF type === 'revenue' AND affectsCashFlow === true:
    cashBalance += Math.abs(amount)
  
  IF type === 'expense' AND affectsCashFlow === true:
    cashBalance -= Math.abs(amount)
  
  IF description includes '[INTERCOMPANY CASH OUTFLOW]':
    cashBalance -= Math.abs(amount)
  
  IF description includes '[INTERCOMPANY'] AND type === 'asset' AND category === 'cash':
    cashBalance += Math.abs(amount)
```

#### P&L Calculation
```
For each transaction:
  IF affectsPL === false: SKIP
  
  IF type === 'revenue':
    revenue += Math.abs(amount)
  
  IF type === 'expense':
    category = tx.category.toLowerCase().trim()
    IF category === 'direct_costs' OR category === 'infrastructure':
      cogs += Math.abs(amount)
    ELSE:
      expenses += Math.abs(amount)

netProfit = revenue - cogs - expenses
```

### 4. Database Cleanup

**Option A: Delete All Statements (Recommended)**
```sql
-- Delete all financial statements
DELETE FROM pl_statements;
DELETE FROM balance_sheets;
DELETE FROM cash_flow_statements;

-- Then use "Rebuild All Financials" button to recreate from transactions
```

**Option B: Delete by Company**
```sql
-- Delete statements for a specific company
DELETE FROM pl_statements WHERE company_id = 'company-id';
DELETE FROM balance_sheets WHERE company_id = 'company-id';
DELETE FROM cash_flow_statements WHERE company_id = 'company-id';
```

### 5. Testing Checklist

After implementing:
- [ ] Create 1 transaction, verify cash balance matches exactly
- [ ] Create multiple transactions, verify all calculations
- [ ] Test intercompany transfers don't double-count
- [ ] Verify P&L, Balance Sheet, Cash Flow all match transaction totals
- [ ] Test "Rebuild All Financials" button works
- [ ] Verify no hardcoded/mock data appears

### 6. Current Status

✅ **Frontend**: Fixed cash balance calculation, added rebuild button
⏳ **Backend**: Need to implement DELETE and rebuild endpoints
⏳ **Database**: Need to clean existing statement tables

## Next Steps

1. **Immediate**: Use "Rebuild All Financials" button (will fail gracefully if endpoints don't exist yet)
2. **Backend**: Implement the 4 endpoints listed above
3. **Database**: Run cleanup SQL to delete old statements
4. **Test**: Create fresh transactions and verify all calculations


