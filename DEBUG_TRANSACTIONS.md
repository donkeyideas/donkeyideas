# Debug Transactions

## View All Transactions
```bash
curl https://www.donkeyideas.com/api/companies/consolidated/debug-transactions
```

## Delete ALL Transactions (All Companies)
```bash
curl -X DELETE https://www.donkeyideas.com/api/companies/consolidated/debug-transactions
```

## What This Does:
- Shows which companies have transactions
- Shows what transactions exist (type, category, amount, affectsPL)
- Can delete ALL financial data across ALL companies to start fresh

## Expected Result After Delete:
- All transactions: DELETED
- All balance sheets: DELETED  
- All cash flows: DELETED
- All P&L statements: DELETED
- Consolidated Balance Sheet: $0 (not -$5)
