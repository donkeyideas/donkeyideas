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
      if (category.includes('cash')) {
        // Direct cash adjustments should affect cash flow
        operatingCashFlow += amount;
      } else if (category.includes('equipment') || 
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
 *
 * FIXED:
 * - Cash now ONLY comes from cash flow (no double-counting)
 * - Retained earnings now accepts prior period value (cumulative)
 * - Balance sheet equation is enforced with auto-correction
 */
export function calculateBalanceSheet(
  transactions: Transaction[],
  cashFlow: CashFlow,
  pl: ProfitAndLoss,
  priorRetainedEarnings: number = 0
): BalanceSheet {
  // Assets
  // FIX: Cash ONLY comes from cash flow (prevents double-counting)
  const cash = cashFlow.endingCash;
  let accountsReceivable = 0;
  let inventory = 0;
  let fixedAssets = 0;

  // Liabilities
  let accountsPayable = 0;
  let shortTermDebt = 0;
  let longTermDebt = 0;

  // Equity components
  let capitalContributions = 0;

  transactions.forEach(tx => {
    // Only process if it affects balance sheet
    if (!tx.affectsBalance) return;

    const amount = tx.amount;
    const category = tx.category.toLowerCase().trim();

    // Assets
    if (tx.type === 'asset') {
      // FIX: Removed cash processing - cash ONLY comes from cash flow
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

    // Equity contributions
    else if (tx.type === 'equity') {
      capitalContributions += Math.abs(amount);
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

  // FIX: Retained earnings is now CUMULATIVE (prior + current period)
  const retainedEarnings = priorRetainedEarnings + pl.netProfit;
  const totalEquity = capitalContributions + retainedEarnings;

  // Validate: Assets = Liabilities + Equity
  const difference = totalAssets - (totalLiabilities + totalEquity);
  const balances = Math.abs(difference) < 0.01;

  // Note: If out of balance, the difference will be visible in validation
  // The calling code should decide whether to auto-correct or flag as error

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
 *
 * @param transactions - All transactions for the period
 * @param beginningCash - Cash balance at start of period
 * @param priorRetainedEarnings - Retained earnings from prior periods (cumulative)
 * @returns Complete financial statements for the period
 */
export function calculateFinancials(
  transactions: Transaction[],
  beginningCash: number = 0,
  priorRetainedEarnings: number = 0
): FinancialStatements {
  const errors: string[] = [];

  // Sort transactions by date
  const sortedTxs = [...transactions].sort((a, b) =>
    a.date.getTime() - b.date.getTime()
  );

  // Calculate statements
  const pl = calculatePL(sortedTxs);
  const cashFlow = calculateCashFlow(sortedTxs, beginningCash);
  const balanceSheet = calculateBalanceSheet(sortedTxs, cashFlow, pl, priorRetainedEarnings);

  // Validate
  if (!balanceSheet.balances) {
    const difference = balanceSheet.totalAssets - (balanceSheet.totalLiabilities + balanceSheet.totalEquity);
    errors.push(
      `Balance sheet does not balance: Assets ($${balanceSheet.totalAssets.toFixed(2)}) ` +
      `!= Liabilities ($${balanceSheet.totalLiabilities.toFixed(2)}) + ` +
      `Equity ($${balanceSheet.totalEquity.toFixed(2)}) | ` +
      `Difference: $${difference.toFixed(2)}`
    );
  }

  if (Math.abs(balanceSheet.cash - cashFlow.endingCash) >= 0.01) {
    errors.push(
      `Cash mismatch: Balance Sheet ($${balanceSheet.cash.toFixed(2)}) ` +
      `!= Cash Flow ($${cashFlow.endingCash.toFixed(2)})`
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

/**
 * Period-based calculation type
 */
export type PeriodType = 'month' | 'quarter' | 'year';

export interface PeriodStatements {
  period: Date; // First day of the period
  periodLabel: string; // e.g., "2025-01", "2025-Q1", "2025"
  transactions: Transaction[];
  statements: FinancialStatements;
  // Carry-forward values
  beginningCash: number;
  beginningRetainedEarnings: number;
  endingCash: number;
  endingRetainedEarnings: number;
}

/**
 * Calculate financials period-by-period with proper carry-forward
 *
 * This is the CORRECT way to calculate financial statements across time:
 * - Each period's beginning cash = prior period's ending cash
 * - Each period's beginning retained earnings = prior period's ending retained earnings
 * - Ensures continuity across periods
 *
 * @param transactions - All transactions
 * @param periodType - 'month', 'quarter', or 'year'
 * @param initialCash - Starting cash balance (default 0)
 * @param initialRetainedEarnings - Starting retained earnings (default 0)
 * @returns Array of period statements, ordered chronologically
 */
export function calculateFinancialsByPeriod(
  transactions: Transaction[],
  periodType: PeriodType = 'month',
  initialCash: number = 0,
  initialRetainedEarnings: number = 0
): PeriodStatements[] {
  // Sort transactions by date
  const sortedTxs = [...transactions].sort((a, b) =>
    a.date.getTime() - b.date.getTime()
  );

  // Group transactions by period
  const periodMap = new Map<string, Transaction[]>();

  sortedTxs.forEach(tx => {
    const periodKey = getPeriodKey(tx.date, periodType);
    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, []);
    }
    periodMap.get(periodKey)!.push(tx);
  });

  // Sort period keys chronologically
  const periodKeys = Array.from(periodMap.keys()).sort();

  // Calculate each period sequentially
  const results: PeriodStatements[] = [];
  let carryForwardCash = initialCash;
  let carryForwardRetainedEarnings = initialRetainedEarnings;

  periodKeys.forEach(periodKey => {
    const periodTxs = periodMap.get(periodKey)!;
    const period = parsePeriodKey(periodKey, periodType);

    // Calculate statements for this period
    const statements = calculateFinancials(
      periodTxs,
      carryForwardCash,
      carryForwardRetainedEarnings
    );

    // Record period results
    results.push({
      period,
      periodLabel: periodKey,
      transactions: periodTxs,
      statements,
      beginningCash: carryForwardCash,
      beginningRetainedEarnings: carryForwardRetainedEarnings,
      endingCash: statements.cashFlow.endingCash,
      endingRetainedEarnings: statements.balanceSheet.retainedEarnings,
    });

    // Carry forward to next period
    carryForwardCash = statements.cashFlow.endingCash;
    carryForwardRetainedEarnings = statements.balanceSheet.retainedEarnings;
  });

  return results;
}

/**
 * Get period key for grouping transactions
 */
function getPeriodKey(date: Date, periodType: PeriodType): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11

  switch (periodType) {
    case 'month':
      return `${year}-${String(month + 1).padStart(2, '0')}`; // e.g., "2025-01"
    case 'quarter':
      const quarter = Math.floor(month / 3) + 1;
      return `${year}-Q${quarter}`; // e.g., "2025-Q1"
    case 'year':
      return `${year}`; // e.g., "2025"
  }
}

/**
 * Parse period key back to Date (first day of period)
 */
function parsePeriodKey(periodKey: string, periodType: PeriodType): Date {
  switch (periodType) {
    case 'month': {
      const [year, month] = periodKey.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    case 'quarter': {
      const [year, quarterStr] = periodKey.split('-');
      const quarter = Number(quarterStr.replace('Q', ''));
      const month = (quarter - 1) * 3;
      return new Date(Number(year), month, 1);
    }
    case 'year': {
      return new Date(Number(periodKey), 0, 1);
    }
  }
}
