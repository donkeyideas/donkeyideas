/**
 * Tests for Financial Calculator
 * 
 * These tests validate that the calculation engine works correctly
 */

import {
  Transaction,
  calculatePL,
  calculateCashFlow,
  calculateBalanceSheet,
  calculateFinancials,
} from './calculator';

describe('Financial Calculator', () => {
  describe('Profit & Loss', () => {
    it('should calculate simple P&L with revenue and expenses', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2026-01-01'),
          type: 'revenue',
          category: 'Sales',
          amount: 1000,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
        {
          id: '2',
          date: new Date('2026-01-02'),
          type: 'expense',
          category: 'Admin',
          amount: 300,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      ];
      
      const pl = calculatePL(transactions);
      
      expect(pl.revenue).toBe(1000);
      expect(pl.operatingExpenses).toBe(300);
      expect(pl.cogs).toBe(0);
      expect(pl.totalExpenses).toBe(300);
      expect(pl.netProfit).toBe(700);
      expect(pl.profitMargin).toBe(70);
    });
    
    it('should separate COGS from operating expenses', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2026-01-01'),
          type: 'revenue',
          category: 'Sales',
          amount: 1000,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
        {
          id: '2',
          date: new Date('2026-01-02'),
          type: 'expense',
          category: 'Direct_Costs',
          amount: 200,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
        {
          id: '3',
          date: new Date('2026-01-03'),
          type: 'expense',
          category: 'Admin',
          amount: 300,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      ];
      
      const pl = calculatePL(transactions);
      
      expect(pl.revenue).toBe(1000);
      expect(pl.cogs).toBe(200);
      expect(pl.operatingExpenses).toBe(300);
      expect(pl.totalExpenses).toBe(500);
      expect(pl.netProfit).toBe(500);
    });
    
    it('should handle negative profit (loss)', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2026-01-01'),
          type: 'revenue',
          category: 'Sales',
          amount: 100,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
        {
          id: '2',
          date: new Date('2026-01-02'),
          type: 'expense',
          category: 'Admin',
          amount: 500,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      ];
      
      const pl = calculatePL(transactions);
      
      expect(pl.netProfit).toBe(-400);
      expect(pl.profitMargin).toBe(-400);
    });
  });
  
  describe('Cash Flow', () => {
    it('should calculate cash flow from cash transactions', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2026-01-01'),
          type: 'revenue',
          category: 'Sales',
          amount: 1000,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
        {
          id: '2',
          date: new Date('2026-01-02'),
          type: 'expense',
          category: 'Admin',
          amount: 300,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      ];
      
      const cashFlow = calculateCashFlow(transactions, 0);
      
      expect(cashFlow.beginningCash).toBe(0);
      expect(cashFlow.operatingCashFlow).toBe(700); // 1000 - 300
      expect(cashFlow.endingCash).toBe(700);
    });
    
    it('should handle beginning cash balance', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2026-01-01'),
          type: 'revenue',
          category: 'Sales',
          amount: 100,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      ];
      
      const cashFlow = calculateCashFlow(transactions, 500);
      
      expect(cashFlow.beginningCash).toBe(500);
      expect(cashFlow.operatingCashFlow).toBe(100);
      expect(cashFlow.endingCash).toBe(600);
    });
    
    it('should handle negative cash (overdraft)', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2026-01-01'),
          type: 'expense',
          category: 'Admin',
          amount: 500,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      ];
      
      const cashFlow = calculateCashFlow(transactions, 0);
      
      expect(cashFlow.endingCash).toBe(-500);
    });
  });
  
  describe('Balance Sheet', () => {
    it('should always balance: Assets = Liabilities + Equity', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2026-01-01'),
          type: 'revenue',
          category: 'Sales',
          amount: 1000,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
        {
          id: '2',
          date: new Date('2026-01-02'),
          type: 'expense',
          category: 'Admin',
          amount: 300,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      ];
      
      const statements = calculateFinancials(transactions, 0);
      const bs = statements.balanceSheet;
      
      expect(bs.totalAssets).toBe(bs.totalLiabilities + bs.totalEquity);
      expect(bs.balances).toBe(true);
    });
    
    it('should handle negative equity (accumulated losses)', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2026-01-01'),
          type: 'expense',
          category: 'Admin',
          amount: 500,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      ];
      
      const statements = calculateFinancials(transactions, 0);
      const bs = statements.balanceSheet;
      
      expect(bs.cash).toBe(-500);
      expect(bs.totalAssets).toBe(-500);
      expect(bs.totalEquity).toBe(-500); // Negative retained earnings
      expect(bs.balances).toBe(true); // Still balances!
    });
    
    it('should never have negative liabilities', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2026-01-01'),
          type: 'liability',
          category: 'Accounts Payable',
          amount: 100,
          affectsPL: false,
          affectsCashFlow: false,
          affectsBalance: true,
        },
      ];
      
      const statements = calculateFinancials(transactions, 0);
      const bs = statements.balanceSheet;
      
      expect(bs.totalLiabilities).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Complete Financial Statements', () => {
    it('should produce valid financial statements', () => {
      const transactions: Transaction[] = [
        // Revenue
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
        // COGS
        {
          id: '2',
          date: new Date('2026-01-02'),
          type: 'expense',
          category: 'Direct_Costs',
          amount: 4000,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
        // Operating Expenses
        {
          id: '3',
          date: new Date('2026-01-03'),
          type: 'expense',
          category: 'Admin',
          amount: 3000,
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      ];
      
      const statements = calculateFinancials(transactions, 0);
      
      // P&L checks
      expect(statements.pl.revenue).toBe(10000);
      expect(statements.pl.cogs).toBe(4000);
      expect(statements.pl.operatingExpenses).toBe(3000);
      expect(statements.pl.netProfit).toBe(3000);
      
      // Cash Flow checks
      expect(statements.cashFlow.endingCash).toBe(3000);
      
      // Balance Sheet checks
      expect(statements.balanceSheet.cash).toBe(3000);
      expect(statements.balanceSheet.totalAssets).toBe(3000);
      expect(statements.balanceSheet.totalEquity).toBe(3000);
      expect(statements.balanceSheet.balances).toBe(true);
      
      // Validation
      expect(statements.isValid).toBe(true);
      expect(statements.errors).toHaveLength(0);
    });
  });
});
