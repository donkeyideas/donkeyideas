/**
 * Clean Financial Calculation Engine
 * 
 * Core Principles:
 * 1. Transactions are the single source of truth
 * 2. All calculations are pure functions (no side effects)
 * 3. Balance sheet MUST balance (Assets = Liabilities + Equity)
 * 4. Every number is traceable to transactions
 */

export interface Transaction {
  id: string;
  date: Date;
  type: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity';
  category: string;
  amount: number; // Positive = increases account, Negative = decreases
  description?: string;
  
  // Flags
  affectsPL: boolean; // Does it affect Profit & Loss?
  affectsCashFlow: boolean; // Does it affect cash?
  affectsBalance: boolean; // Does it affect balance sheet?
}

export interface ProfitAndLoss {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  totalExpenses: number; // COGS + Operating Expenses
  netProfit: number; // Revenue - Total Expenses
  profitMargin: number; // Net Profit / Revenue * 100
}

export interface BalanceSheet {
  // Assets (what you own)
  cash: number;
  accountsReceivable: number;
  inventory: number;
  fixedAssets: number;
  totalAssets: number;
  
  // Liabilities (what you owe)
  accountsPayable: number;
  shortTermDebt: number;
  longTermDebt: number;
  totalLiabilities: number;
  
  // Equity (owner's stake)
  retainedEarnings: number;
  totalEquity: number;
  
  // Validation
  balances: boolean; // Assets = Liabilities + Equity
}

export interface CashFlow {
  beginningCash: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  endingCash: number;
}

export interface FinancialStatements {
  pl: ProfitAndLoss;
  balanceSheet: BalanceSheet;
  cashFlow: CashFlow;
  isValid: boolean;
  errors: string[];
}

/**
 * Calculate Profit & Loss from transactions
 */
export function calculatePL(transactions: Transaction[]): ProfitAndLoss {
  let revenue = 0;
  let cogs = 0;
  let operatingExpenses = 0;
  
  transactions.forEach(tx => {
    // Only process if it affects P&L
    if (!tx.affectsPL) return;
    
    const amount = Math.abs(tx.amount);
    
    if (tx.type === 'revenue') {
      revenue += amount;
    } else if (tx.type === 'expense') {
      const category = tx.category.toLowerCase().trim();
      
      // COGS: Direct costs and infrastructure
      if (category.includes('direct_cost') || 
          category.includes('infrastructure') ||
          category === 'cogs') {
        cogs += amount;
      } else {
        // Everything else is operating expense
        operatingExpenses += amount;
      }
    }
  });
  
  const totalExpenses = cogs + operatingExpenses;
  const netProfit = revenue - totalExpenses;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  
  return {
    revenue,
    cogs,
    operatingExpenses,
    totalExpenses,
    netProfit,
    profitMargin,
  };
}

/**
 * Calculate Cash Flow from transactions
 */
export function calculateCashFlow(
  transactions: Transaction[],
  beginningCash: number = 0
): CashFlow {
  let operatingCashFlow = 0;
  let investingCashFlow = 0;
  let financingCashFlow = 0;
  
  transactions.forEach(tx => {
    // Only process if it affects cash flow
    if (!tx.affectsCashFlow) return;
    
    const amount = tx.amount; // Use signed amount for cash flow
    
    // Operating Activities: Revenue and Expenses
    if (tx.type === 'revenue') {
      operatingCashFlow += amount;
    } else if (tx.type === 'expense') {
      operatingCashFlow -= Math.abs(amount);
    }
    
    // Investing Activities: Asset purchases/sales
    else if (tx.type === 'asset') {
      const category = tx.category.toLowerCase();
      if (category.includes('equipment') || 
          category.includes('inventory') ||
          category.includes('fixed')) {
        investingCashFlow += amount; // Negative for purchases
      }
    }
    
    // Financing Activities: Equity and Debt
    else if (tx.type === 'equity' || tx.type === 'liability') {
      const category = tx.category.toLowerCase();
      if (category.includes('debt') || category.includes('loan')) {
        financingCashFlow += amount;
      } else if (tx.type === 'equity') {
        financingCashFlow += amount; // Equity injection
      }
    }
  });
  
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
  const endingCash = beginningCash + netCashFlow;
  
  return {
    beginningCash,
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    netCashFlow,
    endingCash,
  };
}

/**
 * Calculate Balance Sheet from transactions
 */
export function calculateBalanceSheet(
  transactions: Transaction[],
  cashFlow: CashFlow,
  pl: ProfitAndLoss
): BalanceSheet {
  // Assets
  let cash = cashFlow.endingCash;
  let accountsReceivable = 0;
  let inventory = 0;
  let fixedAssets = 0;
  
  // Liabilities
  let accountsPayable = 0;
  let shortTermDebt = 0;
  let longTermDebt = 0;
  
  transactions.forEach(tx => {
    // Only process if it affects balance sheet
    if (!tx.affectsBalance) return;
    
    const amount = tx.amount;
    const category = tx.category.toLowerCase().trim();
    
    // Assets
    if (tx.type === 'asset') {
      if (category.includes('receivable')) {
        accountsReceivable += amount;
      } else if (category.includes('inventory')) {
        inventory += amount;
      } else if (category.includes('equipment') || 
                 category.includes('fixed') ||
                 category.includes('property')) {
        fixedAssets += amount;
      }
    }
    
    // Liabilities
    else if (tx.type === 'liability') {
      if (category.includes('payable')) {
        accountsPayable += Math.abs(amount);
      } else if (category.includes('short') && category.includes('debt')) {
        shortTermDebt += Math.abs(amount);
      } else if (category.includes('long') && category.includes('debt')) {
        longTermDebt += Math.abs(amount);
      }
    }
    
    // Handle non-cash revenue/expense (creates A/R or A/P)
    else if (!tx.affectsCashFlow) {
      if (tx.type === 'revenue') {
        accountsReceivable += Math.abs(amount);
      } else if (tx.type === 'expense') {
        accountsPayable += Math.abs(amount);
      }
    }
  });
  
  // Calculate totals
  const totalAssets = cash + accountsReceivable + inventory + fixedAssets;
  const totalLiabilities = accountsPayable + shortTermDebt + longTermDebt;
  
  // Equity = Retained Earnings (accumulated profit/loss)
  const retainedEarnings = pl.netProfit;
  const totalEquity = retainedEarnings;
  
  // Validate: Assets = Liabilities + Equity
  const balances = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;
  
  return {
    cash,
    accountsReceivable,
    inventory,
    fixedAssets,
    totalAssets,
    accountsPayable,
    shortTermDebt,
    longTermDebt,
    totalLiabilities,
    retainedEarnings,
    totalEquity,
    balances,
  };
}

/**
 * Main calculation function - produces complete financial statements
 */
export function calculateFinancials(
  transactions: Transaction[],
  beginningCash: number = 0
): FinancialStatements {
  const errors: string[] = [];
  
  // Sort transactions by date
  const sortedTxs = [...transactions].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );
  
  // Calculate statements
  const pl = calculatePL(sortedTxs);
  const cashFlow = calculateCashFlow(sortedTxs, beginningCash);
  const balanceSheet = calculateBalanceSheet(sortedTxs, cashFlow, pl);
  
  // Validate
  if (!balanceSheet.balances) {
    errors.push(
      `Balance sheet does not balance: Assets ($${balanceSheet.totalAssets}) ` +
      `!= Liabilities ($${balanceSheet.totalLiabilities}) + ` +
      `Equity ($${balanceSheet.totalEquity})`
    );
  }
  
  if (balanceSheet.cash !== cashFlow.endingCash) {
    errors.push(
      `Cash mismatch: Balance Sheet ($${balanceSheet.cash}) ` +
      `!= Cash Flow ($${cashFlow.endingCash})`
    );
  }
  
  return {
    pl,
    balanceSheet,
    cashFlow,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper: Validate transaction data
 */
export function validateTransaction(tx: Partial<Transaction>): string[] {
  const errors: string[] = [];
  
  if (!tx.type) errors.push('Transaction type is required');
  if (!tx.category) errors.push('Transaction category is required');
  if (tx.amount === undefined || tx.amount === null) errors.push('Transaction amount is required');
  if (!tx.date) errors.push('Transaction date is required');
  
  return errors;
}
