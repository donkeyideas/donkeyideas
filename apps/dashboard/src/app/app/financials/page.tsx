'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import { NotificationModal } from '@/components/ui/notification-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TransactionEntryModal } from '@/components/financials/transaction-entry-modal';
import { FinancialSummaryCards } from '@/components/financials/financial-summary-cards';
import { PLCharts } from '@/components/financials/pl-charts';
import { BalanceSheetTable } from '@/components/financials/balance-sheet-table';
import { CashFlowTable } from '@/components/financials/cash-flow-table';
import { TransactionsTableNew } from '@/components/financials/transactions-table-new';
import { DeleteTransactionModal } from '@/components/financials/delete-transaction-modal';
import { ExcelUploadModal } from '@/components/financials/excel-upload-modal';

type TabType = 'pl' | 'balance' | 'cashflow' | 'transactions';

export default function FinancialsPage() {
  const { currentCompany, companies } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('pl');
  const [plStatements, setPlStatements] = useState<any[]>([]);
  const [balanceSheets, setBalanceSheets] = useState<any[]>([]);
  const [cashFlows, setCashFlows] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [duplicatingTransaction, setDuplicatingTransaction] = useState<any>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<any>(null);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);
  const [showRebuildConfirm, setShowRebuildConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const loadingRef = useRef(false);

  // Calculate P&L from transactions
  const calculatePLFromTransactions = (transactions: any[]) => {
    let revenue = 0;
    let cogs = 0;
    let operatingExpenses = 0;

    transactions.forEach((tx) => {
      // Include ALL expense transactions by default unless explicitly excluded
      // Only skip if affectsPL is explicitly set to false
      if (tx.affectsPL === false) return;

      const amount = Math.abs(typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount);

      if (tx.type === 'revenue') {
        revenue += amount;
      } else if (tx.type === 'expense') {
        const category = (tx.category || '').toLowerCase().trim();
        if (category === 'direct_costs' || category === 'infrastructure' || 
            category === 'direct costs' || category === 'infrastructure costs') {
          cogs += amount;
        } else {
          operatingExpenses += amount;
        }
      }
    });

    // Total Expenses = COGS + Operating Expenses
    const totalExpenses = cogs + operatingExpenses;

    return {
      totalRevenue: revenue,
      cogs,
      operatingExpenses, // Show separately for clarity
      totalExpenses, // Keep for backward compatibility (COGS + OpEx)
      netProfit: revenue - totalExpenses,
    };
  };

  // Calculate P&L statements grouped by month from transactions
  const calculatePLStatementsFromTransactions = (transactions: any[]) => {
    const statementsByPeriod = new Map<string, any>();

    transactions.forEach((tx) => {
      if (tx.affectsPL === false) return;

      const txDate = new Date(tx.date);
      const period = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
      const periodKey = period.toISOString();

      if (!statementsByPeriod.has(periodKey)) {
        statementsByPeriod.set(periodKey, {
          period,
          productRevenue: 0,
          serviceRevenue: 0,
          otherRevenue: 0,
          directCosts: 0,
          infrastructureCosts: 0,
          salesMarketing: 0,
          rdExpenses: 0,
          adminExpenses: 0,
        });
      }

      const stmt = statementsByPeriod.get(periodKey);
      const amount = Math.abs(typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount);
      const category = (tx.category || '').toLowerCase().trim();

      if (tx.type === 'revenue') {
        if (category === 'product_revenue') stmt.productRevenue += amount;
        else if (category === 'service_revenue') stmt.serviceRevenue += amount;
        else stmt.otherRevenue += amount;
      } else if (tx.type === 'expense') {
        if (category === 'direct_costs' || category === 'direct costs') stmt.directCosts += amount;
        else if (category === 'infrastructure' || category === 'infrastructure costs') stmt.infrastructureCosts += amount;
        else if (category === 'sales_marketing' || category === 'sales marketing') stmt.salesMarketing += amount;
        else if (category === 'rd' || category === 'research_development') stmt.rdExpenses += amount;
        else stmt.adminExpenses += amount;
      }
    });

    return Array.from(statementsByPeriod.values()).map((stmt) => {
      const revenue = stmt.productRevenue + stmt.serviceRevenue + stmt.otherRevenue;
      const cogs = stmt.directCosts + stmt.infrastructureCosts;
      const opex = stmt.salesMarketing + stmt.rdExpenses + stmt.adminExpenses;
      return {
        id: `pl-${stmt.period.toISOString()}`,
        period: stmt.period,
        revenue,
        cogs,
        opex,
        netProfit: revenue - cogs - opex,
        productRevenue: stmt.productRevenue,
        serviceRevenue: stmt.serviceRevenue,
        otherRevenue: stmt.otherRevenue,
        directCosts: stmt.directCosts,
        infrastructureCosts: stmt.infrastructureCosts,
        salesMarketing: stmt.salesMarketing,
        rdExpenses: stmt.rdExpenses,
        adminExpenses: stmt.adminExpenses,
      };
    }).sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());
  };

  // Calculate Balance Sheets grouped by month from transactions
  const calculateBalanceSheetsFromTransactions = (transactions: any[]) => {
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group transactions by period
    const transactionsByPeriod = new Map<string, any[]>();
    
    sortedTransactions.forEach((tx) => {
      if (tx.affectsBalance === false) return;

      const txDate = new Date(tx.date);
      const period = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
      const periodKey = period.toISOString();

      if (!transactionsByPeriod.has(periodKey)) {
        transactionsByPeriod.set(periodKey, []);
      }
      transactionsByPeriod.get(periodKey)!.push(tx);
    });

    // Calculate running balances
    let runningCash = 0;
    let runningAR = 0;
    let runningFixedAssets = 0;
    let runningAP = 0;
    let runningShortTermDebt = 0;
    let runningLongTermDebt = 0;

    const balanceSheets: any[] = [];
    const sortedPeriods = Array.from(transactionsByPeriod.keys()).sort();

    sortedPeriods.forEach((periodKey) => {
      const periodTransactions = transactionsByPeriod.get(periodKey)!;
      
      // Process all transactions in this period
      periodTransactions.forEach((tx) => {
        const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
        const category = (tx.category || '').toLowerCase().trim();

        if (tx.type === 'asset') {
          if (category === 'cash') {
            runningCash += amount;
          } else if (category === 'accounts_receivable' || category === 'accounts receivable') {
            runningAR += amount;
          } else if (category === 'equipment' || category === 'inventory' || category === 'fixed_assets') {
            runningFixedAssets += amount;
          }
        } else if (tx.type === 'liability') {
          if (category === 'accounts_payable' || category === 'accounts payable') {
            runningAP += amount;
          } else if (category === 'short_term_debt' || category === 'short term debt') {
            runningShortTermDebt += amount;
          } else if (category === 'long_term_debt' || category === 'long term debt') {
            runningLongTermDebt += amount;
          }
        } else if (tx.type === 'revenue' && !tx.affectsCashFlow) {
          // Non-cash revenue increases A/R
          runningAR += Math.abs(amount);
        } else if (tx.type === 'expense' && !tx.affectsCashFlow) {
          // Non-cash expense increases A/P
          runningAP += Math.abs(amount);
        } else if (tx.type === 'revenue' && tx.affectsCashFlow) {
          // Cash revenue increases cash
          runningCash += Math.abs(amount);
        } else if (tx.type === 'expense' && tx.affectsCashFlow) {
          // Cash expense decreases cash
          runningCash -= Math.abs(amount);
        } else if (tx.type === 'equity') {
          // Equity transactions (capital contributions, etc.)
          // If it affects cash flow, it increases cash (capital contribution)
          if (tx.affectsCashFlow) {
            runningCash += Math.abs(amount);
          }
          // Equity is calculated as Assets - Liabilities, so it will automatically reflect
        }
      });

      // Create balance sheet for this period
      const period = new Date(periodKey);
      const totalAssets = runningCash + runningAR + runningFixedAssets;
      const totalLiabilities = runningAP + runningShortTermDebt + runningLongTermDebt;
      const totalEquity = totalAssets - totalLiabilities;

      balanceSheets.push({
        id: `balance-${periodKey}`,
        period,
        cashEquivalents: runningCash,
        accountsReceivable: runningAR,
        fixedAssets: runningFixedAssets,
        accountsPayable: runningAP,
        shortTermDebt: runningShortTermDebt,
        longTermDebt: runningLongTermDebt,
        totalEquity,
      });
    });

    return balanceSheets.sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());
  };

  // Calculate Cash Flow statements grouped by month from transactions
  const calculateCashFlowsFromTransactions = (transactions: any[]) => {
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group transactions by period
    const transactionsByPeriod = new Map<string, any[]>();
    
    sortedTransactions.forEach((tx) => {
      if (tx.affectsCashFlow === false) return;

      const txDate = new Date(tx.date);
      const period = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
      const periodKey = period.toISOString();

      if (!transactionsByPeriod.has(periodKey)) {
        transactionsByPeriod.set(periodKey, []);
      }
      transactionsByPeriod.get(periodKey)!.push(tx);
    });

    // Calculate cash flows period by period
    const cashFlows: any[] = [];
    const sortedPeriods = Array.from(transactionsByPeriod.keys()).sort();
    let previousEndingCash = 0;

    sortedPeriods.forEach((periodKey) => {
      const periodTransactions = transactionsByPeriod.get(periodKey)!;
      
      let operatingCashFlow = 0;
      let investingCashFlow = 0;
      let financingCashFlow = 0;

      periodTransactions.forEach((tx) => {
        const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
        const category = (tx.category || '').toLowerCase().trim();

        if (tx.type === 'revenue') {
          operatingCashFlow += Math.abs(amount);
        } else if (tx.type === 'expense') {
          operatingCashFlow -= Math.abs(amount);
        } else if (tx.type === 'asset' && category === 'cash') {
          operatingCashFlow += amount;
        } else if (tx.type === 'asset' && (category === 'equipment' || category === 'inventory')) {
          investingCashFlow -= Math.abs(amount);
        } else if (tx.type === 'equity') {
          financingCashFlow += Math.abs(amount);
        } else if (tx.type === 'liability') {
          if (category === 'short_term_debt' || category === 'long_term_debt' || 
              category === 'short term debt' || category === 'long term debt') {
            financingCashFlow += Math.abs(amount);
          } else if (category === 'accounts_payable' || category === 'accounts payable') {
            operatingCashFlow -= Math.abs(amount);
          }
        }
      });

      const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
      const beginningCash = previousEndingCash;
      const endingCash = beginningCash + netCashFlow;
      previousEndingCash = endingCash;

      const period = new Date(periodKey);
      cashFlows.push({
        id: `cashflow-${periodKey}`,
        period,
        operatingCashFlow,
        investingCashFlow,
        financingCashFlow,
        netCashFlow,
        beginningCash,
        endingCash,
      });
    });

    return cashFlows.sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());
  };

  // Calculate cash balance from transactions - FIXED LOGIC
  const calculateCashFromTransactions = (transactions: any[]) => {
    let cash = 0;

    transactions.forEach((tx) => {
      // Skip if explicitly marked as non-cash
      if (tx.affectsCashFlow === false) return;

      const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;

      // Handle different transaction types
      if (tx.type === 'revenue') {
        // Revenue increases cash
        cash += Math.abs(amount);
      } else if (tx.type === 'expense') {
        // Expenses decrease cash
        cash -= Math.abs(amount);
      } else if (tx.type === 'asset') {
        // Asset transactions affect cash based on the sign
        // Positive = cash in (selling asset), Negative = cash out (buying asset)
        cash += amount;
      } else if (tx.type === 'liability') {
        // Taking on liability = cash in, Paying off liability = cash out
        cash += amount;
      } else if (tx.type === 'equity') {
        // Equity contributions = cash in
        cash += Math.abs(amount);
      }
    });

    return cash;
  };

  const loadFinancials = async () => {
    if (!currentCompany || loadingRef.current) {
      return;
    }
    
    loadingRef.current = true;
    try {
      setLoading(true);

      // ✅ USING NEW CLEAN ENGINE (calculate endpoint)
      // Single API call replaces ALL client-side calculations
      const url = monthFilter 
        ? `/companies/${currentCompany.id}/financials/calculate?month=${monthFilter}`
        : `/companies/${currentCompany.id}/financials/calculate`;
      
      const response = await api.get(url);
      const statements = response.data;
      
      // Load transactions separately (for transaction table display)
      let loadedTransactions: any[] = [];
      try {
        const transactionsRes = await api.get(`/companies/${currentCompany.id}/transactions`);
        loadedTransactions = transactionsRes?.data?.transactions || [];
      } catch (error) {
        console.error('Failed to load transactions:', error);
        loadedTransactions = [];
      }
      
      setTransactions(loadedTransactions);

      // Use calculated values from clean engine
      setSummary({
        totalRevenue: statements.pl.revenue,
        cogs: statements.pl.cogs,
        operatingExpenses: statements.pl.operatingExpenses,
        totalExpenses: statements.pl.totalExpenses,
        netProfit: statements.pl.netProfit,
        totalAssets: statements.balanceSheet.totalAssets,
        totalLiabilities: statements.balanceSheet.totalLiabilities,
        totalEquity: statements.balanceSheet.totalEquity,
        cashBalance: statements.cashFlow.endingCash,
        profitMargin: statements.pl.profitMargin,
      });

      const normalizeIntercompany = (tx: any) => {
        const rawType = String(tx.type || '').toLowerCase().trim();
        if (rawType !== 'intercompany_transfer' && rawType !== 'intercompany') {
          return [tx];
        }

        const amount = Number(tx.amount);
        if (!amount) {
          return [];
        }

        const base = {
          ...tx,
          affectsPL: false,
          affectsBalance: true,
        };

        if (amount < 0) {
          return [
            {
              ...base,
              type: 'asset',
              category: 'cash',
              amount,
              affectsCashFlow: true,
            },
            {
              ...base,
              type: 'asset',
              category: 'intercompany_receivable',
              amount: Math.abs(amount),
              affectsCashFlow: false,
            },
          ];
        }

        return [
          {
            ...base,
            type: 'asset',
            category: 'cash',
            amount,
            affectsCashFlow: true,
          },
          {
            ...base,
            type: 'liability',
            category: 'intercompany_payable',
            amount: Math.abs(amount),
            affectsCashFlow: false,
          },
        ];
      };

      const normalizedTransactions = loadedTransactions.flatMap(normalizeIntercompany);

      // Group transactions by month to create monthly statements
      // This is what the charts and tables need - monthly breakdowns, not just one aggregate
      const monthlyData = new Map<string, any>();
      
      normalizedTransactions.forEach(tx => {
        const txDate = new Date(tx.date);
        const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            period: new Date(txDate.getFullYear(), txDate.getMonth(), 1).toISOString(),
            revenue: 0,
            cogs: 0,
            operatingExpenses: 0,
            cash: 0,
            accountsReceivable: 0,
            inventory: 0,
            fixedAssets: 0,
            accountsPayable: 0,
            shortTermDebt: 0,
            longTermDebt: 0,
            operatingCashFlow: 0,
            investingCashFlow: 0,
            financingCashFlow: 0,
          });
        }
        
        const monthData = monthlyData.get(monthKey);
        const amount = Math.abs(Number(tx.amount));
        
        // P&L data
        if (tx.type === 'revenue' && tx.affectsPL) {
          monthData.revenue += amount;
        } else if (tx.type === 'expense' && tx.affectsPL) {
          const category = (tx.category || '').toLowerCase();
          if (category.includes('direct') || category.includes('infrastructure') || category.includes('cogs')) {
            monthData.cogs += amount;
          } else {
            monthData.operatingExpenses += amount;
          }
        }
        
        // Cash Flow data
        if (tx.affectsCashFlow) {
          if (tx.type === 'revenue') {
            monthData.operatingCashFlow += amount;
          } else if (tx.type === 'expense') {
            monthData.operatingCashFlow -= amount;
          } else if (tx.type === 'asset') {
            const category = (tx.category || '').toLowerCase();
            if (category.includes('cash')) {
              monthData.operatingCashFlow += amount;
            } else {
              monthData.investingCashFlow -= amount;
            }
          } else if (tx.type === 'equity' || tx.type === 'liability') {
            monthData.financingCashFlow += amount;
          }
        }
        
        // Balance Sheet data (cumulative)
        if (tx.affectsBalance) {
          if (tx.type === 'asset') {
            const category = (tx.category || '').toLowerCase();
            if (category.includes('receivable')) {
              monthData.accountsReceivable += amount;
            } else if (category.includes('inventory')) {
              monthData.inventory += amount;
            } else if (category.includes('equipment') || category.includes('fixed')) {
              monthData.fixedAssets += amount;
            }
          } else if (tx.type === 'liability') {
            const category = (tx.category || '').toLowerCase();
            if (category.includes('payable')) {
              monthData.accountsPayable += amount;
            } else if (category.includes('short') && category.includes('debt')) {
              monthData.shortTermDebt += amount;
            } else if (category.includes('long') && category.includes('debt')) {
              monthData.longTermDebt += amount;
            }
          }
        }
      });
      
      // Convert to arrays sorted by date (oldest first for cumulative calculations)
      const sortedMonths = Array.from(monthlyData.entries())
        .sort(([a], [b]) => a.localeCompare(b));
      
      // Calculate cumulative values for balance sheet and cash
      let cumulativeCash = 0;
      let cumulativeAR = 0;
      let cumulativeInventory = 0;
      let cumulativeFixedAssets = 0;
      let cumulativeAP = 0;
      let cumulativeSTDebt = 0;
      let cumulativeLTDebt = 0;
      
      const plStatementsArray: any[] = [];
      const balanceSheetsArray: any[] = [];
      const cashFlowsArray: any[] = [];
      
      sortedMonths.forEach(([monthKey, data]) => {
        // Update cumulative values
        cumulativeCash += data.operatingCashFlow + data.investingCashFlow + data.financingCashFlow;
        cumulativeAR += data.accountsReceivable;
        cumulativeInventory += data.inventory;
        cumulativeFixedAssets += data.fixedAssets;
        cumulativeAP += data.accountsPayable;
        cumulativeSTDebt += data.shortTermDebt;
        cumulativeLTDebt += data.longTermDebt;
        
        // P&L Statement for this month
        plStatementsArray.push({
          id: monthKey,
          period: data.period,
          productRevenue: data.revenue,
          serviceRevenue: 0,
          otherRevenue: 0,
          directCosts: data.cogs,
          infrastructureCosts: 0,
          salesMarketing: 0,
          rdExpenses: 0,
          adminExpenses: data.operatingExpenses,
          revenue: data.revenue,
          cogs: data.cogs,
          grossProfit: data.revenue - data.cogs,
          operatingExpenses: data.operatingExpenses,
          netIncome: data.revenue - data.cogs - data.operatingExpenses,
          createdAt: data.period,
        });
        
        // Balance Sheet for this month (cumulative)
        const totalAssets = cumulativeCash + cumulativeAR + cumulativeInventory + cumulativeFixedAssets;
        const totalLiabilities = cumulativeAP + cumulativeSTDebt + cumulativeLTDebt;
        const totalEquity = totalAssets - totalLiabilities;
        
        balanceSheetsArray.push({
          id: monthKey,
          period: data.period,
          cashEquivalents: cumulativeCash,
          accountsReceivable: cumulativeAR,
          inventory: cumulativeInventory,
          fixedAssets: cumulativeFixedAssets,
          totalAssets,
          accountsPayable: cumulativeAP,
          shortTermDebt: cumulativeSTDebt,
          longTermDebt: cumulativeLTDebt,
          totalLiabilities,
          totalEquity,
          createdAt: data.period,
        });
        
        // Cash Flow for this month
        const netCashFlow = data.operatingCashFlow + data.investingCashFlow + data.financingCashFlow;
        cashFlowsArray.push({
          id: monthKey,
          period: data.period,
          operatingCashFlow: data.operatingCashFlow,
          investingCashFlow: data.investingCashFlow,
          financingCashFlow: data.financingCashFlow,
          netCashFlow,
          beginningCash: cumulativeCash - netCashFlow,
          endingCash: cumulativeCash,
          createdAt: data.period,
        });
      });
      
      setPlStatements(plStatementsArray);
      setBalanceSheets(balanceSheetsArray);
      setCashFlows(cashFlowsArray);
      
      // Update cash balance in summary to reflect actual balance sheet cash
      // Use the most recent balance sheet entry for accuracy
      if (balanceSheetsArray.length > 0) {
        const mostRecentBalance = balanceSheetsArray[balanceSheetsArray.length - 1];
        const actualCashBalance = Number(mostRecentBalance.cashEquivalents || 0);
        setSummary((prevSummary: any) => ({
          ...prevSummary,
          cashBalance: actualCashBalance,
        }));
      }
      
      // Log validation status
      if (!statements.isValid) {
        console.warn('⚠️ Financial statements validation failed:', statements.errors);
      } else {
        console.log('✅ Financial statements validated successfully');
      }
    } catch (error) {
      console.error('Failed to load financials:', error);
      setSummary({
        totalRevenue: 0,
        cogs: 0,
        operatingExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        cashBalance: 0,
        profitMargin: 0,
      });
      setPlStatements([]);
      setBalanceSheets([]);
      setCashFlows([]);
      setTransactions([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    if (!currentCompany) return;
    
    // Debounce to prevent rapid calls
    const timeoutId = setTimeout(() => {
      loadFinancials();
    }, 100);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id, monthFilter]);

  const handleTransactionSaved = () => {
    setShowTransactionModal(false);
    setEditingTransaction(null);
    setDuplicatingTransaction(null);
    loadFinancials();
    setNotification({
      isOpen: true,
      title: 'Success',
      message: 'Transaction saved successfully',
      type: 'success',
    });
  };

  const handleDeleteTransaction = async (transaction: any) => {
    if (!currentCompany) return;

    try {
      // Check if it's an intercompany transfer
      const txAny = transaction as any;
      const isIntercompany = txAny.intercompanyTransferId || 
                             transaction.description?.includes('[INTERCOMPANY') ||
                             transaction.category === 'intercompany_receivable' ||
                             transaction.category === 'intercompany_payable';

      if (isIntercompany) {
        // Find related transactions
        const allTransactions = (await api.get(`/companies/${currentCompany.id}/transactions`)).data.transactions || [];
        const relatedTransactions = allTransactions.filter((tx: any) => 
          tx.intercompanyTransferId === txAny.intercompanyTransferId &&
          tx.id !== transaction.id
        );

        // Also check other companies
        for (const company of companies) {
          if (company.id !== currentCompany.id) {
            try {
              const otherTx = (await api.get(`/companies/${company.id}/transactions`)).data.transactions || [];
              const related = otherTx.filter((tx: any) => 
                tx.intercompanyTransferId === txAny.intercompanyTransferId
              );
              relatedTransactions.push(...related);
            } catch (e) {
              // Ignore errors
            }
          }
        }

        // Delete all related transactions
        for (const tx of relatedTransactions) {
          const companyId = tx.companyId || currentCompany.id;
          try {
            await api.delete(`/companies/${companyId}/transactions/${tx.id}`);
          } catch (e) {
            // Ignore individual errors
          }
        }
      }

      // Delete the transaction
      await api.delete(`/companies/${currentCompany.id}/transactions/${transaction.id}`);
      
      setDeletingTransaction(null);
      loadFinancials();
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Transaction deleted successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to delete transaction',
        type: 'error',
      });
    }
  };

  const handleDeleteAllTransactions = async () => {
    if (!currentCompany) return;

    setDeleteAllLoading(true);
    try {
      // Use efficient backend endpoint to delete ALL data at once
      const response = await api.delete(`/companies/${currentCompany.id}/transactions/delete-all`);
      
      await loadFinancials();
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'All transactions and financial statements deleted successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to delete all transactions',
        type: 'error',
      });
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleRebuildBalanceSheet = async () => {
    if (!currentCompany) return;

    setRebuildLoading(true);
    try {
      setNotification({
        isOpen: true,
        title: 'Processing',
        message: 'Rebuilding balance sheet and cash flow...',
        type: 'info',
      });
      const response = await api.post(`/companies/${currentCompany.id}/financials/recalculate-all`);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: response.data.message || 'Balance sheet rebuilt successfully',
        type: 'success',
      });
      await loadFinancials();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to rebuild balance sheet',
        type: 'error',
      });
    } finally {
      setRebuildLoading(false);
    }
  };

  const getAvailableMonths = () => {
    const months = new Set<string>();
    transactions.forEach((tx: any) => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  };

  if (!currentCompany) {
    return (
      <EmptyState
        icon="🏢"
        title="No company selected"
        description="Select a company from the sidebar to view financials"
      />
    );
  }

  if (loading) {
    return <div className="text-white/60 [.light_&]:text-slate-600">Loading financial data...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
        <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Financial Hub</h1>
        <p className="text-white/60 [.light_&]:text-slate-600">{currentCompany.name} — Financial data</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/60 [.light_&]:text-slate-600">Filter by Month:</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&_option]:bg-white [.light_&_option]:text-slate-900 focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            >
              <option value="">All Time</option>
              {getAvailableMonths().map((month) => {
                const [year, monthNum] = month.split('-');
                const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return (
                  <option key={month} value={month}>
                    {monthName}
                  </option>
                );
              })}
            </select>
          </div>
          <Button variant="secondary" onClick={loadFinancials}>
            Refresh
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowRebuildConfirm(true)}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
            disabled={rebuildLoading}
          >
            {rebuildLoading ? 'Rebuilding...' : 'Rebuild Balance Sheet'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteAllConfirm(true)}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
            disabled={deleteAllLoading}
          >
            {deleteAllLoading ? 'Deleting...' : 'Clear All Data'}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowTransactionModal(true)}>
              + Add Transaction
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShowUploadModal(true)}
            >
              Upload Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && <FinancialSummaryCards summary={summary} />}

      {/* Tabs */}
      <div className="mb-6 border-b border-white/10 [.light_&]:border-slate-300">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('pl')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'pl'
                ? 'border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'border-transparent text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            P&L Statements
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'balance'
                ? 'border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'border-transparent text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'cashflow'
                ? 'border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'border-transparent text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            Cash Flow
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'border-transparent text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            Transactions
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'pl' && (
        <div className="space-y-6">
          {plStatements.length > 0 && <PLCharts plStatements={plStatements} />}
          <Card>
            <CardHeader>
              <CardTitle>P&L Statements</CardTitle>
            </CardHeader>
            <CardContent>
              {plStatements.length === 0 ? (
                <div className="p-8 text-center text-white/60 [.light_&]:text-slate-600">
                  No P&L data yet. Add transactions to see P&L statements.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Period</th>
                        <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Revenue</th>
                        <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">COGS</th>
                        <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">OPEX</th>
                        <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plStatements.map((pl: any) => (
                        <tr key={pl.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-4">{new Date(pl.period).toLocaleDateString()}</td>
                          <td className="p-4 text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pl.revenue || 0)}</td>
                          <td className="p-4 text-right text-orange-400">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pl.cogs || 0)}</td>
                          <td className="p-4 text-right text-red-400">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pl.opex || 0)}</td>
                          <td className={`p-4 text-right ${(pl.netProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pl.netProfit || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'balance' && (
        <BalanceSheetTable balanceSheets={balanceSheets} />
      )}

      {activeTab === 'cashflow' && (
        <CashFlowTable cashFlows={cashFlows} />
      )}

      {activeTab === 'transactions' && (
        <TransactionsTableNew
          transactions={transactions}
          onEdit={(transaction) => {
            setEditingTransaction(transaction);
          }}
          onDelete={(transaction) => {
            setDeletingTransaction(transaction);
          }}
          onDuplicate={(transaction) => {
            // Remove id and intercompanyTransferId for duplication
            const { id, ...transactionData } = transaction;
            // Remove intercompanyTransferId if it exists
            if ('intercompanyTransferId' in transactionData) {
              delete (transactionData as any).intercompanyTransferId;
            }
            // Ensure date is in the correct format for the modal
            if (transactionData.date) {
              const date = new Date(transactionData.date);
              if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                transactionData.date = `${year}-${month}-${day}`;
              }
            }
            setDuplicatingTransaction(transactionData);
          }}
          onRefresh={loadFinancials}
        />
      )}

      {/* Modals */}
      {showTransactionModal && !editingTransaction && !duplicatingTransaction && (
        <TransactionEntryModal
          companyId={currentCompany.id}
          onClose={() => setShowTransactionModal(false)}
          onSave={handleTransactionSaved}
        />
      )}

      {editingTransaction && (
        <TransactionEntryModal
          companyId={currentCompany.id}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleTransactionSaved}
        />
      )}

      {duplicatingTransaction && (
        <TransactionEntryModal
          companyId={currentCompany.id}
          transaction={duplicatingTransaction}
          onClose={() => setDuplicatingTransaction(null)}
          onSave={handleTransactionSaved}
        />
      )}

      {deletingTransaction && (
        <DeleteTransactionModal
          transaction={deletingTransaction}
          onClose={() => setDeletingTransaction(null)}
          onDelete={() => handleDeleteTransaction(deletingTransaction)}
        />
      )}

      {/* Excel Upload Modal */}
      {showUploadModal && currentCompany && (
        <ExcelUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadFinancials();
            setNotification({
              isOpen: true,
              title: 'Success',
              message: 'Transactions uploaded successfully',
              type: 'success',
            });
          }}
          companyId={currentCompany.id}
        />
      )}

      {notification && (
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={() => setNotification(null)}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />
      )}

      {/* Confirm Rebuild Modal */}
      <ConfirmModal
        isOpen={showRebuildConfirm}
        onClose={() => setShowRebuildConfirm(false)}
        onConfirm={handleRebuildBalanceSheet}
        title="Rebuild Balance Sheet"
        message="This will rebuild the balance sheet and cash flow from all transactions. This may take a few moments. Continue?"
        confirmText="Rebuild"
        cancelText="Cancel"
        variant="info"
        loading={rebuildLoading}
      />

      {/* Confirm Delete All Modal */}
      <ConfirmModal
        isOpen={showDeleteAllConfirm}
        onClose={() => setShowDeleteAllConfirm(false)}
        onConfirm={handleDeleteAllTransactions}
        title="Delete All Transactions"
        message="Are you sure you want to delete ALL transactions? This will also clear all financial statements (P&L, Balance Sheets, Cash Flow).\n\n⚠️ This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
        loading={deleteAllLoading}
      />
    </div>
  );
}


