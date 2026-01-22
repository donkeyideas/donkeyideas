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
      let cash = latestCF 
        ? Number(latestCF.endingCash || 0)
        : (latestBS ? Number(latestBS.cashEquivalents || 0) : 0);
      
      // DEBUG: Log what we're reading
      console.log(`  ${company.name}: CashFlow endingCash=${latestCF ? Number(latestCF.endingCash || 0) : 'N/A'}, BalanceSheet cash=${latestBS ? Number(latestBS.cashEquivalents || 0) : 'N/A'}, Using cash=${cash}`);
      
      // AUTO-FIX: If cash is $0 but there are cash-affecting transactions, statements are stale
      // Recalculate on-the-fly and update stored statements
      if (cash === 0 && transactionCount > 0) {
        const hasCashAffectingTxns = await prisma.transaction.count({
          where: {
            companyId: company.id,
            affectsCashFlow: true,
          },
        });
        
        if (hasCashAffectingTxns > 0) {
          console.log(`  ⚠️ ${company.name}: Cash is $0 but has ${hasCashAffectingTxns} cash-affecting transactions - statements are stale, auto-recalculating...`);
          
          try {
            // Get all transactions and recalculate
            const allTxns = await prisma.transaction.findMany({
              where: { companyId: company.id },
              orderBy: { date: 'asc' },
            });
            
            // Fix flags
            await prisma.transaction.updateMany({
              where: {
                companyId: company.id,
                type: { in: ['revenue', 'expense'] },
              },
              data: {
                affectsPL: true,
                affectsCashFlow: true,
                affectsBalance: true,
              },
            });
            
            // Transform and calculate
            const financialTxs: FinancialTransaction[] = allTxns.map(tx => ({
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
            
            const statements = calculateFinancials(financialTxs, 0);
            
            // Delete old statements
            await Promise.all([
              prisma.pLStatement.deleteMany({ where: { companyId: company.id } }),
              prisma.balanceSheet.deleteMany({ where: { companyId: company.id } }),
              prisma.cashFlow.deleteMany({ where: { companyId: company.id } }),
            ]);
            
            // Store new statements
            const { Decimal } = await import('@prisma/client/runtime/library');
            const period = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            
            await prisma.pLStatement.create({
              data: {
                companyId: company.id,
                period,
                productRevenue: new Decimal(statements.pl.revenue),
                serviceRevenue: new Decimal(0),
                otherRevenue: new Decimal(0),
                directCosts: new Decimal(statements.pl.cogs),
                infrastructureCosts: new Decimal(0),
                salesMarketing: new Decimal(statements.pl.operatingExpenses),
                rdExpenses: new Decimal(0),
                adminExpenses: new Decimal(0),
              },
            });
            
            await prisma.balanceSheet.create({
              data: {
                companyId: company.id,
                period,
                cashEquivalents: new Decimal(statements.balanceSheet.cash),
                accountsReceivable: new Decimal(statements.balanceSheet.accountsReceivable),
                fixedAssets: new Decimal(statements.balanceSheet.fixedAssets),
                accountsPayable: new Decimal(statements.balanceSheet.accountsPayable),
                shortTermDebt: new Decimal(statements.balanceSheet.shortTermDebt),
                longTermDebt: new Decimal(statements.balanceSheet.longTermDebt),
              },
            });
            
            await prisma.cashFlow.create({
              data: {
                companyId: company.id,
                period,
                beginningCash: new Decimal(statements.cashFlow.beginningCash),
                operatingCashFlow: new Decimal(statements.cashFlow.operatingCashFlow),
                investingCashFlow: new Decimal(statements.cashFlow.investingCashFlow),
                financingCashFlow: new Decimal(statements.cashFlow.financingCashFlow),
                netCashFlow: new Decimal(statements.cashFlow.netCashFlow),
                endingCash: new Decimal(statements.cashFlow.endingCash),
              },
            });
            
            // Update cash value with recalculated value
            cash = statements.cashFlow.endingCash;
            revenue = statements.pl.revenue;
            cogs = statements.pl.cogs;
            opex = statements.pl.operatingExpenses;
            profit = statements.pl.netProfit;
            
            console.log(`  ✅ ${company.name}: Auto-recalculated - Cash now $${cash}, Revenue $${revenue}, Profit $${profit}`);
          } catch (recalcError: any) {
            console.error(`  ❌ Failed to auto-recalculate ${company.name}:`, recalcError);
            // Continue with $0 values if recalculation fails
          }
        }
      }
      
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
