import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { calculateFinancials, Transaction } from '@donkey-ideas/financial-engine';

/**
 * REBUILD ALL FINANCIAL STATEMENTS
 * POST /api/companies/consolidated/rebuild-all-balance-sheets
 * 
 * For each company:
 * 1. Get all transactions
 * 2. Calculate P&L, Balance Sheet, Cash Flow
 * 3. STORE results in database
 * 
 * This ensures all stored statements are up-to-date
 */
export async function POST(request: NextRequest) {
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
    
    console.log('🔄 Rebuilding ALL financial statements...');
    
    // Get all companies for the user
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
    });
    
    if (companies.length === 0) {
      return NextResponse.json(
        { error: { message: 'No companies found' } },
        { status: 404 }
      );
    }
    
    console.log(`📊 Found ${companies.length} companies to rebuild`);
    
    let totalProcessed = 0;
    const results = [];
    
    // Import Decimal for Prisma
    const { Decimal } = await import('@prisma/client/runtime/library');
    const period = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    // Process each company
    for (const company of companies) {
      try {
        console.log(`🔄 Recalculating ${company.name}...`);
        
        // STEP 1: Get all transactions
        const dbTransactions = await prisma.transaction.findMany({
          where: { companyId: company.id },
          orderBy: { date: 'asc' },
        });
        
        console.log(`  📊 Found ${dbTransactions.length} transactions`);
        
        // STEP 2: Delete ALL existing financial statements (fresh start)
        await Promise.all([
          prisma.pLStatement.deleteMany({ where: { companyId: company.id } }),
          prisma.balanceSheet.deleteMany({ where: { companyId: company.id } }),
          prisma.cashFlow.deleteMany({ where: { companyId: company.id } }),
        ]);
        
        console.log(`  🗑️ Deleted old statements`);
        
        // STEP 3: Transform transactions for financial engine
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
        
        // STEP 4: Calculate using financial engine
        const statements = calculateFinancials(transactions, 0);
        
        console.log(`  ✅ Calculated: Revenue=$${statements.pl.revenue}, Profit=$${statements.pl.netProfit}, Cash=$${statements.cashFlow.endingCash}`);
        
        // STEP 5: Store P&L Statement
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
        
        // STEP 6: Store Balance Sheet
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
        
        // STEP 7: Store Cash Flow
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
        
        console.log(`  💾 Stored all statements`);
        
        totalProcessed++;
        results.push({
          companyId: company.id,
          companyName: company.name,
          transactionsProcessed: transactions.length,
          success: true,
        });
      } catch (error: any) {
        console.error(`  ❌ Failed for ${company.name}:`, error);
        results.push({
          companyId: company.id,
          companyName: company.name,
          success: false,
          error: error.message,
        });
      }
    }
    
    console.log(`✅ Rebuild complete: ${totalProcessed}/${companies.length} companies processed`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully rebuilt financial statements for ${totalProcessed} out of ${companies.length} companies`,
      totalCompanies: companies.length,
      processed: totalProcessed,
      results,
    });
    
  } catch (error: any) {
    console.error('❌ Failed to rebuild all balance sheets:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to rebuild balance sheets' } },
      { status: 500 }
    );
  }
}
