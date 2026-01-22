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
    
    // For each company, get the LATEST stored financial statements + check status
    const companyBreakdown = [];
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalOpEx = 0;
    let totalProfit = 0;
    let totalCash = 0;
    let totalValuation = 0;
    
    for (const company of companies) {
      // Check if company has transactions
      const transactionCount = await prisma.transaction.count({
        where: { companyId: company.id },
      });
      
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
      
      // Get latest Cash Flow (use endingCash as primary source, same as individual pages)
      const latestCF = await prisma.cashFlow.findFirst({
        where: { companyId: company.id },
        orderBy: { period: 'desc' },
      });
      
      // Calculate totals first to determine if statements are meaningful
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
      
      // Use Cash Flow endingCash as primary source (same as individual company pages)
      // Fallback to Balance Sheet cashEquivalents if Cash Flow doesn't exist
      const cash = latestCF 
        ? Number(latestCF.endingCash || 0)
        : (latestBS ? Number(latestBS.cashEquivalents || 0) : 0);
      
      // DEBUG: Log what we're reading
      console.log(`  ${company.name}: CashFlow endingCash=${latestCF ? Number(latestCF.endingCash || 0) : 'N/A'}, BalanceSheet cash=${latestBS ? Number(latestBS.cashEquivalents || 0) : 'N/A'}, Using cash=${cash}`);
      
      // Determine data status (SMART LOGIC)
      let dataStatus: 'ok' | 'needs_rebuild' | 'no_data';
      if (transactionCount === 0) {
        dataStatus = 'no_data'; // No transactions - expected $0
      } else if (!latestPL || !latestBS) {
        dataStatus = 'needs_rebuild'; // Has transactions but no statements
      } else {
        // Has both transactions AND statements - check if statements are meaningful
        // BUT: Intercompany-only transactions won't show P&L activity (by design)
        // So check if there are any P&L-affecting transactions OR if balance sheet has activity
        const hasPLTransactions = await prisma.transaction.count({
          where: {
            companyId: company.id,
            affectsPL: true,
          },
        });
        
        const hasBalanceSheetActivity = cash !== 0 || 
          (latestBS && (
            Number(latestBS.accountsReceivable) !== 0 ||
            Number(latestBS.fixedAssets) !== 0 ||
            Number(latestBS.accountsPayable) !== 0 ||
            Number(latestBS.shortTermDebt) !== 0 ||
            Number(latestBS.longTermDebt) !== 0
          ));
        
        const hasAnyFinancialActivity = revenue !== 0 || cogs !== 0 || opex !== 0 || profit !== 0 || cash !== 0;
        
        // Check if there are cash-affecting transactions that should result in non-zero cash
        const hasCashAffectingTransactions = await prisma.transaction.count({
          where: {
            companyId: company.id,
            affectsCashFlow: true,
          },
        });
        
        // If there are cash-affecting transactions but cash is $0, something is wrong
        if (hasCashAffectingTransactions > 0 && cash === 0 && !hasBalanceSheetActivity) {
          // Has transactions that should affect cash, but cash is $0 and no other balance sheet activity
          // This means statements are stale or calculation failed
          dataStatus = 'needs_rebuild';
          console.log(`⚠️ ${company.name}: Has ${hasCashAffectingTransactions} cash-affecting transactions but cash is $0 - marking as needs_rebuild`);
        } else if (hasAnyFinancialActivity || (hasPLTransactions === 0 && hasBalanceSheetActivity)) {
          // Either has P&L activity OR only has intercompany/balance sheet transactions (which is valid)
          dataStatus = 'ok';
        } else if (hasPLTransactions > 0 && !hasAnyFinancialActivity) {
          // Has P&L transactions but no activity - needs rebuild
          dataStatus = 'needs_rebuild';
        } else {
          // No P&L transactions and no balance sheet activity - might be empty or needs rebuild
          dataStatus = hasBalanceSheetActivity ? 'ok' : 'needs_rebuild';
        }
      }
      
      // Values already calculated above in status determination
      
      const valuation = company.valuations[0] ? Number(company.valuations[0].amount) : 0;
      
      const statusEmoji = dataStatus === 'ok' ? '✅' : dataStatus === 'needs_rebuild' ? '⚠️' : '📭';
      console.log(`${statusEmoji} ${company.name}: Status=${dataStatus}, Transactions=${transactionCount}, Revenue=$${revenue}, Profit=$${profit}`);
      
      // Add to totals (only if data is OK)
      if (dataStatus === 'ok') {
        totalRevenue += revenue;
        totalCOGS += cogs;
        totalOpEx += opex;
        totalProfit += profit;
        totalCash += cash;
        totalValuation += valuation;
      }
      
      companyBreakdown.push({
        id: company.id,
        name: company.name,
        logo: company.logo,
        projectStatus: company.businessProfile?.projectStatus || null,
        dataStatus,
        transactionCount,
        hasStatements: !!latestPL && !!latestBS,
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
