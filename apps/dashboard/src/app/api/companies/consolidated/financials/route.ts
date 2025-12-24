import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/companies/consolidated/financials - Get consolidated financials for all companies
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 }
      );
    }
    
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 }
      );
    }
    
    // Get query params for month filter
    const { searchParams } = new URL(request.url);
    const monthFilter = searchParams.get('month'); // Format: YYYY-MM
    
    // Build date filter if month is provided
    let dateFilter: any = {};
    if (monthFilter) {
      const [year, month] = monthFilter.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter = {
        period: {
          gte: startDate,
          lte: endDate,
        },
      };
    }
    
    // Get all companies for the user
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      include: {
        balanceSheets: {
          orderBy: { period: 'desc' },
          take: 1, // Get latest balance sheet for each company (snapshot)
        },
        valuations: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get latest valuation for each company
        },
        businessProfile: true, // Include business profile to get projectStatus
        // Note: We calculate from transactions, not from P&L statements or cash flow statements
      },
    });
    
    // Calculate consolidated metrics
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalExpenses = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalValuation = 0;
    let totalCashBalance = 0;
    
    // Calculate from transactions (single source of truth) instead of stale P&L statements
    const companyBreakdown = await Promise.all(companies.map(async (company) => {
      // Build transaction date filter if month is provided
      let transactionDateFilter: any = {};
      if (monthFilter) {
        const [year, month] = monthFilter.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        transactionDateFilter = {
          date: {
            gte: startDate,
            lte: endDate,
          },
        };
      }
      
      // Get all transactions for this company
      const transactions = await prisma.transaction.findMany({
        where: {
          companyId: company.id,
          ...transactionDateFilter,
        },
        orderBy: { date: 'desc' },
      });
      
      // Calculate financials from transactions
      let revenue = 0;
      let cogs = 0;
      let operatingExpenses = 0;
      
      transactions.forEach((tx: any) => {
        if (tx.affectsPL === false) return;
        
        const amount = Math.abs(Number(tx.amount));
        const category = (tx.category || '').toLowerCase().trim();
        
        if (tx.type === 'revenue') {
          revenue += amount;
        } else if (tx.type === 'expense') {
          // COGS categories
          if (category === 'direct_costs' || category === 'direct costs' || 
              category === 'infrastructure' || category === 'infrastructure costs') {
            cogs += amount;
          } else {
            // Operating expenses
            operatingExpenses += amount;
          }
        }
      });
      
      // Total Expenses = COGS + Operating Expenses
      const expenses = cogs + operatingExpenses;
      const profit = revenue - expenses;
      
      // Get latest balance sheet (snapshot, not sum)
      const latestBS = company.balanceSheets[0];
      const latestValuation = company.valuations[0];
      
      const assets = latestBS
        ? Number(latestBS.cashEquivalents || 0) + Number(latestBS.accountsReceivable || 0) + Number(latestBS.fixedAssets || 0)
        : 0;
      const liabilities = latestBS
        ? Number(latestBS.accountsPayable || 0) + Number(latestBS.shortTermDebt || 0) + Number(latestBS.longTermDebt || 0)
        : 0;
      
      // Calculate cash balance from transactions (single source of truth)
      let cashBalance = 0;
      
      // Get all transactions that affect cash flow (for accurate calculation)
      const allCashTransactions = await prisma.transaction.findMany({
        where: {
          companyId: company.id,
          affectsCashFlow: true,
        },
        orderBy: { date: 'asc' },
      });
      
      // Calculate running cash balance from transactions
      allCashTransactions.forEach((tx) => {
        const amount = Number(tx.amount);
        const category = (tx.category || '').toLowerCase().trim();
        
        if (tx.type === 'asset' && category === 'cash') {
          cashBalance += amount;
        } else if (tx.type === 'revenue' && tx.affectsCashFlow === true) {
          cashBalance += Math.abs(amount);
        } else if (tx.type === 'expense' && tx.affectsCashFlow === true) {
          cashBalance -= Math.abs(amount);
        } else if (tx.description?.includes('[INTERCOMPANY CASH OUTFLOW]') || 
                   tx.description?.includes('[CASH OUTFLOW')) {
          cashBalance -= Math.abs(amount);
        } else if (tx.description?.includes('[INTERCOMPANY') && tx.type === 'asset' && category === 'cash') {
          cashBalance += Math.abs(amount);
        }
      });
      
      // If month filter is applied, calculate cash balance up to that month
      if (monthFilter) {
        const [year, month] = monthFilter.split('-').map(Number);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        
        // Reset and recalculate up to the end of the filtered month
        cashBalance = 0;
        allCashTransactions
          .filter(tx => new Date(tx.date) <= monthEnd)
          .forEach((tx) => {
            const amount = Number(tx.amount);
            const category = (tx.category || '').toLowerCase().trim();
            
            if (tx.type === 'asset' && category === 'cash') {
              cashBalance += amount;
            } else if (tx.type === 'revenue' && tx.affectsCashFlow === true) {
              cashBalance += Math.abs(amount);
            } else if (tx.type === 'expense' && tx.affectsCashFlow === true) {
              cashBalance -= Math.abs(amount);
            } else if (tx.description?.includes('[INTERCOMPANY CASH OUTFLOW]') || 
                       tx.description?.includes('[CASH OUTFLOW')) {
              cashBalance -= Math.abs(amount);
            } else if (tx.description?.includes('[INTERCOMPANY') && tx.type === 'asset' && category === 'cash') {
              cashBalance += Math.abs(amount);
            }
          });
      }
      
      const valuation = latestValuation ? Number(latestValuation.amount || 0) : 0;
      
      totalRevenue += revenue;
      totalCOGS += cogs;
      totalExpenses += expenses;
      totalAssets += assets;
      totalLiabilities += liabilities;
      totalCashBalance += cashBalance;
      totalValuation += valuation;
      
      return {
        id: company.id,
        name: company.name,
        logo: company.logo,
        projectStatus: company.businessProfile?.projectStatus || null,
        revenue,
        cogs,
        expenses,
        profit,
        cashBalance,
        valuation,
      };
    }));
    
    const netProfit = totalRevenue - totalExpenses;
    const totalEquity = totalAssets - totalLiabilities;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    return NextResponse.json({
      totalRevenue,
      totalCOGS,
      totalExpenses,
      netProfit,
      profitMargin,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalCashBalance,
      activeCompanies: companies.length,
      totalValuation,
      companies: companyBreakdown,
    });
  } catch (error: any) {
    console.error('Failed to get consolidated financials:', error);
    return NextResponse.json(
      { error: { message: 'Failed to retrieve consolidated financials' } },
      { status: 500 }
    );
  }
}

