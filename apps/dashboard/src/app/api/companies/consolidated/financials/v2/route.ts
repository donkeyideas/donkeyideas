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
    const allCompaniesData = await Promise.all(
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
    
    // Filter out companies with NO transactions to avoid phantom data
    // Only consolidate companies that actually have financial activity
    const companiesWithTransactions = allCompaniesData.filter(c => c.transactions.length > 0);
    
    // DEBUG: Log what we found
    console.log('🔍 Consolidated Financials Debug:');
    console.log(`Total companies: ${allCompaniesData.length}`);
    console.log(`Companies with transactions: ${companiesWithTransactions.length}`);
    if (companiesWithTransactions.length > 0) {
      companiesWithTransactions.forEach(c => {
        console.log(`  - ${c.companyName}: ${c.transactions.length} transactions`);
        c.transactions.forEach(tx => {
          console.log(`    ${tx.date.toISOString().split('T')[0]} | ${tx.type} | ${tx.category} | $${tx.amount} | affectsPL: ${tx.affectsPL}`);
        });
      });
    }
    
    // If no companies have transactions, return zero values
    if (companiesWithTransactions.length === 0) {
      return NextResponse.json({
        // P&L
        totalRevenue: 0,
        totalCOGS: 0,
        totalOperatingExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        
        // Balance Sheet
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalCashBalance: 0,
        
        // Additional metrics
        activeCompanies: companies.length,
        totalValuation: 0,
        
        // Company breakdown (still show all companies, just with $0)
        companies: companies.map(c => ({
          id: c.id,
          name: c.name,
          logo: c.logo,
          projectStatus: c.businessProfile?.projectStatus || null,
          revenue: 0,
          cogs: 0,
          operatingExpenses: 0,
          expenses: 0,
          profit: 0,
          cashBalance: 0,
          valuation: c.valuations[0] ? Number(c.valuations[0].amount) : 0,
        })),
        
        // Intercompany info
        intercompanyEliminations: { receivables: 0, payables: 0 },
        
        // Validation
        isValid: true,
        errors: undefined,
        balanceSheetBalances: true,
      });
    }
    
    // Use clean engine to consolidate (only companies with actual transactions)
    const consolidated = consolidateFinancials(companiesWithTransactions);
    
    // Build company breakdown for UI - USE STORED DATABASE VALUES ONLY
    // DO NOT use calculated values - query actual P&L and Balance Sheets from database
    const companyBreakdown = await Promise.all(allCompaniesData.map(async (companyData) => {
      // Get ACTUAL stored financial statements from database
      const [latestPL, latestBalanceSheet] = await Promise.all([
        prisma.pLStatement.findFirst({
          where: { companyId: companyData.companyId },
          orderBy: { period: 'desc' },
        }),
        prisma.balanceSheet.findFirst({
          where: { companyId: companyData.companyId },
          orderBy: { period: 'desc' },
        }),
      ]);
      
      // Use ONLY stored values from database (not calculated from transactions)
      return {
        id: companyData.companyId,
        name: companyData.companyName,
        logo: companyData.companyLogo || null,
        projectStatus: companyData.projectStatus || null,
        revenue: latestPL ? Number(latestPL.revenue || 0) : 0,
        cogs: latestPL ? Number(latestPL.cogs || 0) : 0,
        operatingExpenses: latestPL ? Number(latestPL.operatingExpenses || 0) : 0,
        expenses: latestPL ? Number(latestPL.totalExpenses || 0) : 0,
        profit: latestPL ? Number(latestPL.netProfit || 0) : 0,
        cashBalance: latestBalanceSheet ? Number(latestBalanceSheet.cashEquivalents || 0) : 0,
        valuation: companyData.valuation || 0,
      };
    }));
    
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
