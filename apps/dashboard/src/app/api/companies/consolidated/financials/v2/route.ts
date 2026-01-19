import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { consolidateFinancials, Transaction } from '@donkey-ideas/financial-engine';

/**
 * NEW CLEAN ENDPOINT
 * GET /api/companies/consolidated/financials/v2
 * 
 * Uses clean financial engine for consolidation
 * Proper intercompany elimination
 * Guaranteed to balance
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
    
    // Get all companies for the user
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      include: {
        businessProfile: true,
        valuations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    
    if (companies.length === 0) {
      return NextResponse.json(
        { error: { message: 'No companies found' } },
        { status: 404 }
      );
    }
    
    // Fetch transactions for all companies
    const companiesWithTransactions = await Promise.all(
      companies.map(async (company) => {
        const dbTransactions = await prisma.transaction.findMany({
          where: {
            companyId: company.id,
            ...dateFilter,
          },
          orderBy: { date: 'asc' },
        });
        
        // Transform to engine format
        const transactions: Transaction[] = dbTransactions.map(tx => ({
          id: tx.id,
          date: new Date(tx.date),
          type: tx.type as any,
          category: tx.category || 'Uncategorized',
          amount: Number(tx.amount),
          description: tx.description || undefined,
          affectsPL: tx.affectsPL ?? true,
          affectsCashFlow: tx.affectsCashFlow ?? true,
          affectsBalance: tx.affectsBalance ?? true,
        }));
        
        return {
          companyId: company.id,
          companyName: company.name,
          companyLogo: company.logo,
          projectStatus: company.businessProfile?.projectStatus || null,
          valuation: company.valuations[0] ? Number(company.valuations[0].amount) : 0,
          transactions,
          beginningCash: 0,
        };
      })
    );
    
    // Use clean engine to consolidate
    const consolidated = consolidateFinancials(companiesWithTransactions);
    
    // Build company breakdown for UI
    const companyBreakdown = consolidated.companies.map(company => {
      const sourceCompany = companiesWithTransactions.find(c => c.companyId === company.companyId);
      
      return {
        id: company.companyId,
        name: company.companyName,
        logo: sourceCompany?.companyLogo || null,
        projectStatus: sourceCompany?.projectStatus || null,
        revenue: company.statements.pl.revenue,
        cogs: company.statements.pl.cogs,
        operatingExpenses: company.statements.pl.operatingExpenses,
        expenses: company.statements.pl.totalExpenses,
        profit: company.statements.pl.netProfit,
        cashBalance: company.statements.cashFlow.endingCash,
        valuation: sourceCompany?.valuation || 0,
      };
    });
    
    // Return consolidated financials
    return NextResponse.json({
      // P&L
      totalRevenue: consolidated.consolidated.pl.revenue,
      totalCOGS: consolidated.consolidated.pl.cogs,
      totalOperatingExpenses: consolidated.consolidated.pl.operatingExpenses,
      totalExpenses: consolidated.consolidated.pl.totalExpenses,
      netProfit: consolidated.consolidated.pl.netProfit,
      profitMargin: consolidated.consolidated.pl.profitMargin,
      
      // Balance Sheet
      totalAssets: consolidated.consolidated.balanceSheet.totalAssets,
      totalLiabilities: consolidated.consolidated.balanceSheet.totalLiabilities,
      totalEquity: consolidated.consolidated.balanceSheet.totalEquity,
      totalCashBalance: consolidated.consolidated.balanceSheet.cash,
      
      // Additional metrics
      activeCompanies: companies.length,
      totalValuation: companyBreakdown.reduce((sum, c) => sum + c.valuation, 0),
      
      // Company breakdown
      companies: companyBreakdown,
      
      // Intercompany info (for debugging)
      intercompanyEliminations: consolidated.intercompanyEliminations,
      
      // Validation
      isValid: consolidated.isValid,
      errors: consolidated.errors.length > 0 ? consolidated.errors : undefined,
      balanceSheetBalances: consolidated.consolidated.balanceSheet.balances,
    });
  } catch (error: any) {
    console.error('Failed to get consolidated financials (v2):', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to retrieve consolidated financials' } },
      { status: 500 }
    );
  }
}
