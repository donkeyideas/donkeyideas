# @donkey-ideas/financial-engine

**Clean, testable financial calculation engine** - Single source of truth for all financial calculations.

## Core Principles

1. **Transactions are the single source of truth** - Everything derives from transactions
2. **Pure functions** - No side effects, fully testable
3. **Balance sheet MUST balance** - Assets = Liabilities + Equity (enforced!)
4. **Traceable** - Every number can be traced back to transactions

## Features

✅ **Profit & Loss** - Revenue, COGS, Operating Expenses, Net Profit  
✅ **Cash Flow** - Operating, Investing, Financing activities  
✅ **Balance Sheet** - Assets, Liabilities, Equity (always balances!)  
✅ **Consolidation** - Aggregate multiple companies  
✅ **Intercompany Elimination** - Automatically eliminates matched receivables/payables  
✅ **Validation** - Catches errors and reports them  
✅ **Fully Tested** - Comprehensive test suite included  

## Usage

### Basic Example

```typescript
import { calculateFinancials, Transaction } from '@donkey-ideas/financial-engine';

const transactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2026-01-01'),
    type: 'revenue',
    category: 'Sales',
    amount: 10000,
    affectsPL: true,
    affectsCashFlow: true,
    affectsBalance: true,
  },
  {
    id: '2',
    date: new Date('2026-01-02'),
    type: 'expense',
    category: 'Admin',
    amount: 3000,
    affectsPL: true,
    affectsCashFlow: true,
    affectsBalance: true,
  },
];

const statements = calculateFinancials(transactions, 0);

console.log(statements.pl.revenue); // 10000
console.log(statements.pl.netProfit); // 7000
console.log(statements.cashFlow.endingCash); // 7000
console.log(statements.balanceSheet.totalAssets); // 7000
console.log(statements.balanceSheet.totalEquity); // 7000
console.log(statements.balanceSheet.balances); // true ✓
```

### Consolidation Example

```typescript
import { consolidateFinancials } from '@donkey-ideas/financial-engine';

const consolidated = consolidateFinancials([
  {
    companyId: '1',
    companyName: 'Company A',
    transactions: companyATransactions,
    beginningCash: 0,
  },
  {
    companyId: '2',
    companyName: 'Company B',
    transactions: companyBTransactions,
    beginningCash: 1000,
  },
]);

console.log(consolidated.consolidated.pl.netProfit); // Combined profit
console.log(consolidated.intercompanyEliminations.eliminated); // Auto-eliminated amount
console.log(consolidated.isValid); // true if everything balances
```

## Transaction Types

### Revenue
```typescript
{
  type: 'revenue',
  category: 'Sales' | 'Services' | etc,
  amount: 1000, // Positive
  affectsPL: true,
  affectsCashFlow: true, // true for cash sales, false for A/R
  affectsBalance: true,
}
```

### Expense
```typescript
{
  type: 'expense',
  category: 'Admin' | 'Direct_Costs' | 'Infrastructure' | etc,
  amount: 500, // Positive (will be subtracted)
  affectsPL: true,
  affectsCashFlow: true, // true for cash payment, false for A/P
  affectsBalance: true,
}
```

### Asset
```typescript
{
  type: 'asset',
  category: 'Equipment' | 'Inventory' | 'Receivable' | etc,
  amount: 5000, // Positive = acquire, Negative = sell
  affectsPL: false,
  affectsCashFlow: true, // depends on transaction
  affectsBalance: true,
}
```

### Liability
```typescript
{
  type: 'liability',
  category: 'Accounts Payable' | 'Short Term Debt' | etc,
  amount: 1000, // Positive = increase, Negative = pay down
  affectsPL: false,
  affectsCashFlow: false, // usually
  affectsBalance: true,
}
```

### Equity
```typescript
{
  type: 'equity',
  category: 'Capital Injection' | 'Owner Draw' | etc,
  amount: 10000, // Positive = injection, Negative = withdrawal
  affectsPL: false,
  affectsCashFlow: true,
  affectsBalance: true,
}
```

## Category Guidelines

### COGS (included in Total Expenses)
- `Direct_Costs`
- `Infrastructure`
- `COGS`

### Operating Expenses (separate from COGS)
- `Admin`
- `Sales`
- `Marketing`
- `R&D`
- `Legal`
- etc.

### Intercompany (automatically eliminated in consolidation)
- `Intercompany Receivable` (asset)
- `Intercompany Payable` (liability)

## Validation

The engine automatically validates:
- ✅ Balance sheet balances (Assets = Liabilities + Equity)
- ✅ Cash matches between balance sheet and cash flow
- ✅ All required fields are present
- ✅ Company-level statements balance before consolidation
- ✅ Intercompany transactions are properly matched

Errors are returned in `statements.errors` array.

## Testing

```bash
npm test
```

The test suite validates:
- P&L calculations
- Cash flow calculations
- Balance sheet always balances
- Negative equity (losses) handled correctly
- Consolidation logic
- Intercompany elimination

## Why This is Better

**Old Approach:**
- ❌ Transactions with wrong default flags
- ❌ Database-coupled calculations
- ❌ Cascading errors from corrupted data
- ❌ Balance sheet didn't always balance
- ❌ Negative liabilities
- ❌ Hard to test

**New Approach:**
- ✅ Clean, correct defaults
- ✅ Pure functions (database-independent)
- ✅ Can't produce invalid statements
- ✅ Balance sheet ALWAYS balances
- ✅ Proper accounting rules enforced
- ✅ Fully tested and validated

## Next Steps

1. Integrate this engine into your API routes
2. Clear corrupted data
3. Re-import clean transactions
4. Validate everything works before scaling up

---

**Built with ❤️ by Donkey Ideas** - Because your financials deserve better than duct tape and hope.
