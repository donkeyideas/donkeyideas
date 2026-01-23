import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { calculateFinancials, Transaction as FinancialTransaction } from '@donkey-ideas/financial-engine';

/**
 * CLEAN CONSOLIDATED VIEW - READS FROM STORED STATEMENTS
 * GET /api/companies/consolidated/financials/v2
 * 
 * This reads directly from P&L Statements, Balance Sheets, and Cash Flows
 * that were STORED by the /recalculate-all endpoint
 * 
 * This ensures consistency:
 * - Individual company pages show stored values
 * - Consolidated view shows SUM of stored values
 * - Everyone sees the SAME numbers
 */
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
    
    console.log('🔍 Consolidated Financials: Calculating from transactions (on-the-fly)...');
    
    // Get all companies for the user
    const companies = await prisma.company.findMany({
      where: { 
        userId: user.id,
        status: 'active',
      },
      include: {
        businessProfile: true,
        valuations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
    
    console.log(`📊 Found ${companies.length} active companies`);
    
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
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }
    
    // For each company, calculate financial statements from transactions
    const companyBreakdown = [];
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalOpEx = 0;
    let totalProfit = 0;
    let totalCash = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalValuation = 0;
    
    for (const company of companies) {
      // Fetch transactions for this company (single source of truth)
      const dbTransactions = await prisma.transaction.findMany({
        where: {
          companyId: company.id,
          ...dateFilter,
        },
        orderBy: { date: 'asc' },
      });
      
      const transactionCount = dbTransactions.length;
      
      const normalizeIntercompany = (tx: typeof dbTransactions[number]): FinancialTransaction[] => {
        const rawType = String(tx.type || '').toLowerCase().trim();
        if (rawType !== 'intercompany_transfer' && rawType !== 'intercompany') {
          return [{
            id: tx.id,
            date: new Date(tx.date),
            type: tx.type as any,
            category: tx.category || 'Uncategorized',
            amount: Number(tx.amount),
            description: tx.description || undefined,
            affectsPL: tx.affectsPL ?? true,
            affectsCashFlow: tx.affectsCashFlow ?? true,
            affectsBalance: tx.affectsBalance ?? true,
          }];
        }

        const rawAmount = Number(tx.amount);
        const description = String(tx.description || '').toLowerCase();
        const category = String(tx.category || '').toLowerCase();
        const hasOutflow = description.includes('outflow') ||
          description.includes('transfer out') ||
          (description.includes('transfer') && description.includes(' to ')) ||
          category.includes('transfer_out');
        const hasInflow = description.includes('inflow') ||
          description.includes('transfer in') ||
          (description.includes('transfer') && description.includes(' from ')) ||
          category.includes('transfer_in');
        const amount = hasOutflow && rawAmount > 0
          ? -rawAmount
          : hasInflow && rawAmount < 0
            ? Math.abs(rawAmount)
            : rawAmount;
        if (!amount) {
          return [];
        }

        const base = {
          id: tx.id,
          date: new Date(tx.date),
          description: tx.description || undefined,
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

      const financialTxs: FinancialTransaction[] = dbTransactions.flatMap(normalizeIntercompany);
      
      const statements = calculateFinancials(financialTxs, 0);
      
      const revenue = statements.pl.revenue;
      const cogs = statements.pl.cogs;
      const opex = statements.pl.operatingExpenses;
      const profit = statements.pl.netProfit;
      const cash = statements.balanceSheet.cash;
      const assets = statements.balanceSheet.totalAssets;
      const liabilities = statements.balanceSheet.totalLiabilities;
      const equity = statements.balanceSheet.totalEquity;
      
      const dataStatus: 'ok' | 'no_data' =
        transactionCount === 0 ? 'no_data' : 'ok';
      
      const valuation = company.valuations[0] ? Number(company.valuations[0].amount) : 0;
      
      const statusEmoji = dataStatus === 'ok' ? '✅' : '📭';
      console.log(`${statusEmoji} ${company.name}: Status=${dataStatus}, Transactions=${transactionCount}, Revenue=$${revenue}, Profit=$${profit}, Cash=$${cash}`);
      
      // Add to totals (only if data is OK)
      if (dataStatus === 'ok') {
        totalRevenue += revenue;
        totalCOGS += cogs;
        totalOpEx += opex;
        totalProfit += profit;
        totalCash += cash;
        totalAssets += assets;
        totalLiabilities += liabilities;
        totalEquity += equity;
        totalValuation += valuation;
      }
      
      companyBreakdown.push({
        id: company.id,
        name: company.name,
        logo: company.logo,
        projectStatus: company.businessProfile?.projectStatus || null,
        dataStatus,
        transactionCount,
        hasStatements: transactionCount > 0,
        revenue,
        cogs,
        operatingExpenses: opex,
        expenses: cogs + opex,
        profit,
        cashBalance: cash,
        valuation,
      });
    }
    
    console.log(`📊 CONSOLIDATED TOTALS: Revenue=$${totalRevenue}, Profit=$${totalProfit}, Cash=$${totalCash}`);
    
    // Calculate balance sheet totals
    const totalExpenses = totalCOGS + totalOpEx;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalLiabilitiesEquity = totalLiabilities + totalEquity;
    
    return NextResponse.json({
      // P&L
      totalRevenue,
      totalCOGS,
      totalOperatingExpenses: totalOpEx,
      totalExpenses,
      netProfit: totalProfit,
      profitMargin,
      
      // Balance Sheet
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalCashBalance: totalCash,
      
      // Additional metrics
      activeCompanies: companies.length,
      totalValuation,
      
      // Company breakdown
      companies: companyBreakdown,
      
      // Validation
      isValid: true,
      errors: undefined,
      balanceSheetBalances: Math.abs(totalAssets - totalLiabilitiesEquity) < 0.01,
    });
    
  } catch (error: any) {
    console.error('❌ Failed to get consolidated financials:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to retrieve consolidated financials' } },
      { status: 500 }
    );
  }
}
