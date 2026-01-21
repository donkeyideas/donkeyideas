import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * CONSOLIDATED VIEW V3 - CLEAN DIAGNOSTIC VERSION
 * GET /api/companies/consolidated/financials/v3
 * 
 * This is a SIMPLE, CLEAN version that just reads STORED data
 * No complex calculations, no financial engine
 * Just shows what's actually in the database
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    console.log('🔍 V3: Fetching consolidated financials (SIMPLE VERSION)...');
    
    // Get all user's companies
    const companies = await prisma.company.findMany({
      where: { 
        userId: user.id,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        logo: true,
        businessProfile: {
          select: {
            projectStatus: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    console.log(`📊 V3: Found ${companies.length} active companies`);
    
    // For each company, get the LATEST stored financial statements
    const companyBreakdown = [];
    
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
      
      console.log(`💰 V3: ${company.name} - Revenue: $${revenue}, COGS: $${cogs}, OpEx: $${opex}, Profit: $${profit}, Cash: $${cash}`);
      
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
        valuation: 0, // Simplified for diagnostic version
      });
    }
    
    // Calculate consolidated totals
    const consolidatedRevenue = companyBreakdown.reduce((sum, c) => sum + c.revenue, 0);
    const consolidatedCOGS = companyBreakdown.reduce((sum, c) => sum + c.cogs, 0);
    const consolidatedOpEx = companyBreakdown.reduce((sum, c) => sum + c.operatingExpenses, 0);
    const consolidatedProfit = consolidatedRevenue - consolidatedCOGS - consolidatedOpEx;
    const totalCash = companyBreakdown.reduce((sum, c) => sum + c.cashBalance, 0);
    const totalValuation = companyBreakdown.reduce((sum, c) => sum + c.valuation, 0);
    
    console.log(`📊 V3: CONSOLIDATED - Revenue: $${consolidatedRevenue}, Profit: $${consolidatedProfit}, Cash: $${totalCash}`);
    
    // Calculate balance sheet totals
    const totalAssets = totalCash; // Simplified for now
    const totalLiabilitiesEquity = consolidatedProfit; // Simplified for now
    
    return NextResponse.json({
      version: 'v3-diagnostic',
      consolidated: {
        pl: {
          revenue: consolidatedRevenue,
          cogs: consolidatedCOGS,
          operatingExpenses: consolidatedOpEx,
          totalExpenses: consolidatedCOGS + consolidatedOpEx,
          netProfit: consolidatedProfit,
          margin: consolidatedRevenue > 0 ? (consolidatedProfit / consolidatedRevenue) * 100 : 0,
        },
        balanceSheet: {
          totalAssets,
          totalLiabilities: 0,
          totalEquity: totalLiabilitiesEquity,
          totalLiabilitiesEquity,
        },
        cashFlow: {
          endingCash: totalCash,
        },
      },
      portfolio: {
        activeCompanies: companies.length,
        totalValuation,
        avgValuation: companies.length > 0 ? totalValuation / companies.length : 0,
        profitMargin: consolidatedRevenue > 0 ? (consolidatedProfit / consolidatedRevenue) * 100 : 0,
      },
      companyBreakdown,
    });
    
  } catch (error: any) {
    console.error('❌ V3: Failed to fetch consolidated financials:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch consolidated financials' },
      { status: 500 }
    );
  }
}
