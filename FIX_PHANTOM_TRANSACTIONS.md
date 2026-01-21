# Fix Phantom -$5 Transactions

## Step-by-Step Instructions

### 1. Open Browser Console
1. Go to https://www.donkeyideas.com/app/consolidated
2. Press `F12` to open Developer Tools
3. Click the **Console** tab

### 2. Check What Transactions Exist
Copy and paste this into the console:

```javascript
fetch('/api/companies/consolidated/debug-transactions')
  .then(r => r.json())
  .then(data => {
    console.log('=== TRANSACTION DEBUG ===');
    console.log(`Total Companies: ${data.totalCompanies}`);
    console.log(`Companies with transactions: ${data.companiesWithTransactions}`);
    console.log(`Total transactions: ${data.totalTransactions}`);
    console.log('\nCompanies with data:');
    data.data.forEach(company => {
      console.log(`\n${company.companyName} (${company.transactionCount} transactions):`);
      company.transactions.forEach(tx => {
        console.log(`  ${tx.date.split('T')[0]} | ${tx.type} | ${tx.category} | $${tx.amount} | affectsPL: ${tx.affectsPL}`);
      });
    });
  })
  .catch(err => console.error('Error:', err));
```

**This will show you EXACTLY which companies have transactions and what they are.**

### 3. Delete ALL Transactions (Nuclear Option)
⚠️ **WARNING: This will delete ALL financial data across ALL companies!**

Only run this if you want to start completely fresh:

```javascript
if (confirm('⚠️ DELETE ALL TRANSACTIONS? This cannot be undone!')) {
  fetch('/api/companies/consolidated/debug-transactions', { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      console.log('=== DELETION COMPLETE ===');
      console.log(`Transactions deleted: ${data.deletedTransactions}`);
      console.log(`Balance sheets deleted: ${data.deletedBalanceSheets}`);
      console.log(`Cash flows deleted: ${data.deletedCashFlows}`);
      console.log(`P&L statements deleted: ${data.deletedPLStatements}`);
      console.log(`Companies affected: ${data.companiesAffected}`);
      alert('✅ All data deleted! Refreshing page...');
      setTimeout(() => window.location.reload(), 1000);
    })
    .catch(err => console.error('Error:', err));
}
```

### 4. Expected Result After Deletion
- Total Assets: **$0** ✅
- Total Liabilities + Equity: **$0** ✅
- All companies show **$0** across all metrics ✅
- Fresh start for all financial data ✅

---

## Alternative: Delete Specific Company's Data

If you want to delete only ONE company's transactions (not all):

```javascript
// Replace 'COMPANY_ID' with the actual company ID from the debug output
const companyId = 'COMPANY_ID_HERE';
fetch(`/api/companies/${companyId}/transactions/delete-all`, { method: 'DELETE' })
  .then(r => r.json())
  .then(data => {
    console.log('Company data deleted:', data);
    alert('Company data deleted! Refresh the page.');
  });
```

---

## Why This Happened

The -$5 is caused by **actual transactions** in your database, likely:
- Old intercompany transactions with `affectsPL: false`
- Test transactions that weren't deleted
- Transactions from a previous session

These transactions affect the **balance sheet** but not the **P&L**, which is why you see:
- P&L: $0 (no revenue/expenses)
- Balance Sheet: -$5 (has assets/liabilities)
