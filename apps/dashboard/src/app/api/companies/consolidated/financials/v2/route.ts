import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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
    
    console.log('🔍 Consolidated Financials: Reading from STORED statements...');
    
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
    
    // For each company, get the LATEST stored financial statements
    const companyBreakdown = [];
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalOpEx = 0;
    let totalProfit = 0;
    let totalCash = 0;
    let totalValuation = 0;
    
    for (const company of companies) {
      // Get latest P&L Statement
      const latestPL = await prisma.pLStatement.findFirst({
        where: { companyId: company.id },
        orderBy: { period: 'desc' },
      });
      
      // Get latest Balance Sheet
      const latestBS = await prisma.balanceSheet.findFirst({
        where: { companyId: company.id },
        orderBy: { period: 'desc' },
      });
      
      // Calculate totals from P&L Statement fields
      const revenue = latestPL 
        ? Number(latestPL.productRevenue) + Number(latestPL.serviceRevenue) + Number(latestPL.otherRevenue)
        : 0;
      
      const cogs = latestPL
        ? Number(latestPL.directCosts) + Number(latestPL.infrastructureCosts)
        : 0;
      
      const opex = latestPL
        ? Number(latestPL.salesMarketing) + Number(latestPL.rdExpenses) + Number(latestPL.adminExpenses)
        : 0;
      
      const profit = revenue - cogs - opex;
      
      const cash = latestBS ? Number(latestBS.cashEquivalents) : 0;
      
      const valuation = company.valuations[0] ? Number(company.valuations[0].amount) : 0;
      
      console.log(`💰 ${company.name}: Revenue=$${revenue}, COGS=$${cogs}, OpEx=$${opex}, Profit=$${profit}, Cash=$${cash}`);
      
      // Add to totals
      totalRevenue += revenue;
      totalCOGS += cogs;
      totalOpEx += opex;
      totalProfit += profit;
      totalCash += cash;
      totalValuation += valuation;
      
      companyBreakdown.push({
        id: company.id,
        name: company.name,
        logo: company.logo,
        projectStatus: company.businessProfile?.projectStatus || null,
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
    
    // Simplified balance sheet (Assets = Cash, Equity = Profit)
    const totalAssets = totalCash;
    const totalLiabilities = 0;
    const totalEquity = totalProfit;
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
