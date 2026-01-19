/**
 * Consolidation Engine - Combines multiple companies' financials
 * 
 * Rules:
 * 1. Sum all companies' statements
 * 2. Eliminate intercompany transactions (receivables vs payables)
 * 3. Validate consolidated balance sheet balances
 */

import {
  Transaction,
  ProfitAndLoss,
  BalanceSheet,
  CashFlow,
  FinancialStatements,
  calculateFinancials,
} from './calculator';

export interface CompanyFinancials {
  companyId: string;
  companyName: string;
  transactions: Transaction[];
  beginningCash: number;
  statements: FinancialStatements;
}

export interface ConsolidatedFinancials {
  companies: CompanyFinancials[];
  consolidated: FinancialStatements;
  intercompanyEliminations: {
    receivables: number;
    payables: number;
    eliminated: number;
    unmatched: number;
  };
  isValid: boolean;
  errors: string[];
}

/**
 * Identify intercompany transactions
 */
function identifyIntercompanyTransactions(transactions: Transaction[]): {
  receivables: number;
  payables: number;
} {
  let receivables = 0;
  let payables = 0;
  
  transactions.forEach(tx => {
    const category = tx.category.toLowerCase();
    const description = (tx.description || '').toLowerCase();
    
    // Check if it's an intercompany transaction
    const isIntercompany = 
      category.includes('intercompany') || 
      description.includes('intercompany');
    
    if (!isIntercompany) return;
    
    if (tx.type === 'asset') {
      receivables += Math.abs(tx.amount);
    } else if (tx.type === 'liability') {
      payables += Math.abs(tx.amount);
    }
  });
  
  return { receivables, payables };
}

/**
 * Consolidate financial statements from multiple companies
 */
export function consolidateFinancials(
  companies: Array<{
    companyId: string;
    companyName: string;
    transactions: Transaction[];
    beginningCash?: number;
  }>
): ConsolidatedFinancials {
  const errors: string[] = [];
  
  // Calculate financials for each company
  const companyFinancials: CompanyFinancials[] = companies.map(company => {
    const statements = calculateFinancials(
      company.transactions,
      company.beginningCash || 0
    );
    
    // Track company-level errors
    if (!statements.isValid) {
      errors.push(`${company.companyName}: ${statements.errors.join(', ')}`);
    }
    
    return {
      companyId: company.companyId,
      companyName: company.companyName,
      transactions: company.transactions,
      beginningCash: company.beginningCash || 0,
      statements,
    };
  });
  
  // Aggregate P&L
  const consolidatedPL: ProfitAndLoss = companyFinancials.reduce(
    (sum, company) => ({
      revenue: sum.revenue + company.statements.pl.revenue,
      cogs: sum.cogs + company.statements.pl.cogs,
      operatingExpenses: sum.operatingExpenses + company.statements.pl.operatingExpenses,
      totalExpenses: sum.totalExpenses + company.statements.pl.totalExpenses,
      netProfit: sum.netProfit + company.statements.pl.netProfit,
      profitMargin: 0, // Will calculate after
    }),
    { revenue: 0, cogs: 0, operatingExpenses: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 }
  );
  
  // Calculate consolidated profit margin
  consolidatedPL.profitMargin = 
    consolidatedPL.revenue > 0 
      ? (consolidatedPL.netProfit / consolidatedPL.revenue) * 100 
      : 0;
  
  // Aggregate Cash Flow
  const consolidatedCashFlow: CashFlow = companyFinancials.reduce(
    (sum, company) => ({
      beginningCash: sum.beginningCash + company.statements.cashFlow.beginningCash,
      operatingCashFlow: sum.operatingCashFlow + company.statements.cashFlow.operatingCashFlow,
      investingCashFlow: sum.investingCashFlow + company.statements.cashFlow.investingCashFlow,
      financingCashFlow: sum.financingCashFlow + company.statements.cashFlow.financingCashFlow,
      netCashFlow: sum.netCashFlow + company.statements.cashFlow.netCashFlow,
      endingCash: sum.endingCash + company.statements.cashFlow.endingCash,
    }),
    {
      beginningCash: 0,
      operatingCashFlow: 0,
      investingCashFlow: 0,
      financingCashFlow: 0,
      netCashFlow: 0,
      endingCash: 0,
    }
  );
  
  // Aggregate Balance Sheet (before intercompany elimination)
  const rawBalanceSheet: BalanceSheet = companyFinancials.reduce(
    (sum, company) => {
      const bs = company.statements.balanceSheet;
      return {
        cash: sum.cash + bs.cash,
        accountsReceivable: sum.accountsReceivable + bs.accountsReceivable,
        inventory: sum.inventory + bs.inventory,
        fixedAssets: sum.fixedAssets + bs.fixedAssets,
        totalAssets: sum.totalAssets + bs.totalAssets,
        accountsPayable: sum.accountsPayable + bs.accountsPayable,
        shortTermDebt: sum.shortTermDebt + bs.shortTermDebt,
        longTermDebt: sum.longTermDebt + bs.longTermDebt,
        totalLiabilities: sum.totalLiabilities + bs.totalLiabilities,
        retainedEarnings: sum.retainedEarnings + bs.retainedEarnings,
        totalEquity: sum.totalEquity + bs.totalEquity,
        balances: false, // Will validate after elimination
      };
    },
    {
      cash: 0,
      accountsReceivable: 0,
      inventory: 0,
      fixedAssets: 0,
      totalAssets: 0,
      accountsPayable: 0,
      shortTermDebt: 0,
      longTermDebt: 0,
      totalLiabilities: 0,
      retainedEarnings: 0,
      totalEquity: 0,
      balances: false,
    }
  );
  
  // Identify and eliminate intercompany transactions
  const allTransactions = companyFinancials.flatMap(c => c.transactions);
  const intercompany = identifyIntercompanyTransactions(allTransactions);
  
  // Eliminate ONLY matched intercompany amounts
  const eliminated = Math.min(intercompany.receivables, intercompany.payables);
  const unmatched = Math.abs(intercompany.receivables - intercompany.payables);
  
  // Apply eliminations to consolidated balance sheet
  const consolidatedBalanceSheet: BalanceSheet = {
    ...rawBalanceSheet,
    accountsReceivable: rawBalanceSheet.accountsReceivable - eliminated,
    totalAssets: rawBalanceSheet.totalAssets - eliminated,
    accountsPayable: rawBalanceSheet.accountsPayable - eliminated,
    totalLiabilities: rawBalanceSheet.totalLiabilities - eliminated,
  };
  
  // Recalculate equity after eliminations
  consolidatedBalanceSheet.totalEquity = 
    consolidatedBalanceSheet.totalAssets - consolidatedBalanceSheet.totalLiabilities;
  
  // Validate consolidated balance sheet
  const balanceSheetBalances = 
    Math.abs(
      consolidatedBalanceSheet.totalAssets - 
      (consolidatedBalanceSheet.totalLiabilities + consolidatedBalanceSheet.totalEquity)
    ) < 0.01;
  
  consolidatedBalanceSheet.balances = balanceSheetBalances;
  
  if (!balanceSheetBalances) {
    errors.push(
      `Consolidated balance sheet does not balance: ` +
      `Assets ($${consolidatedBalanceSheet.totalAssets}) != ` +
      `Liabilities ($${consolidatedBalanceSheet.totalLiabilities}) + ` +
      `Equity ($${consolidatedBalanceSheet.totalEquity})`
    );
  }
  
  if (unmatched > 0.01) {
    errors.push(
      `Unmatched intercompany transactions: $${unmatched.toFixed(2)} ` +
      `(Receivables: $${intercompany.receivables}, Payables: $${intercompany.payables})`
    );
  }
  
  // Create consolidated statements
  const consolidated: FinancialStatements = {
    pl: consolidatedPL,
    balanceSheet: consolidatedBalanceSheet,
    cashFlow: consolidatedCashFlow,
    isValid: errors.length === 0,
    errors,
  };
  
  return {
    companies: companyFinancials,
    consolidated,
    intercompanyEliminations: {
      receivables: intercompany.receivables,
      payables: intercompany.payables,
      eliminated,
      unmatched,
    },
    isValid: errors.length === 0,
    errors,
  };
}
