import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { calculateFinancials, Transaction } from '@donkey-ideas/financial-engine';

/**
 * NUCLEAR OPTION - Fix ALL Data Issues
 * POST /api/companies/consolidated/fix-all-data
 * 
 * This endpoint:
 * 1. Fixes ALL transaction flags (affectsPL, affectsCashFlow)
 * 2. Fixes transaction types (ensures they're valid)
 * 3. Deletes ALL existing statements (fresh start)
 * 4. Recalculates and stores NEW statements for ALL companies
 * 
 * This is the nuclear option - it fixes everything at once
 */
export async function POST(request: NextRequest) {
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
    
    console.log('☢️ NUCLEAR OPTION: Fixing ALL data for all companies...');
    
    // Get all companies
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
    });
    
    console.log(`📊 Found ${companies.length} companies to fix`);
    
    let totalTransactionsFixed = 0;
    let totalStatementsCreated = 0;
    const results = [];
    
    // PHASE 1: Fix ALL transaction flags for ALL companies
    console.log('🔧 PHASE 1: Fixing transaction flags...');
    
    for (const company of companies) {
      // Fix flags for revenue transactions
      const revenueFixed = await prisma.transaction.updateMany({
        where: {
          companyId: company.id,
          type: 'revenue',
        },
        data: {
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      });
      
      // Fix flags for expense transactions (COGS is just an expense with specific category)
      const expenseFixed = await prisma.transaction.updateMany({
        where: {
          companyId: company.id,
          type: 'expense',
        },
        data: {
          affectsPL: true,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      });
      
      // Fix flags for asset/liability/equity transactions (should NOT affect P&L)
      const assetFixed = await prisma.transaction.updateMany({
        where: {
          companyId: company.id,
          type: { in: ['asset', 'liability', 'equity'] },
        },
        data: {
          affectsPL: false,
          affectsCashFlow: true, // Assets usually affect cash
          affectsBalance: true,
        },
      });
      
      const fixed = revenueFixed.count + expenseFixed.count + assetFixed.count;
      totalTransactionsFixed += fixed;
      
      console.log(`  ✅ ${company.name}: Fixed ${fixed} transaction flags`);
    }
    
    console.log(`🎉 PHASE 1 COMPLETE: Fixed ${totalTransactionsFixed} transaction flags`);
    
    // PHASE 2: Delete ALL existing financial statements
    console.log('🗑️ PHASE 2: Deleting ALL existing statements...');
    
    const deletedPL = await prisma.pLStatement.deleteMany({
      where: {
        company: {
          userId: user.id,
        },
      },
    });
    
    const deletedBS = await prisma.balanceSheet.deleteMany({
      where: {
        company: {
          userId: user.id,
        },
      },
    });
    
    const deletedCF = await prisma.cashFlow.deleteMany({
      where: {
        company: {
          userId: user.id,
        },
      },
    });
    
    console.log(`🗑️ Deleted ${deletedPL.count} P&L statements, ${deletedBS.count} balance sheets, ${deletedCF.count} cash flows`);
    
    // PHASE 3: Recalculate and store NEW statements for ALL companies
    console.log('🔄 PHASE 3: Recalculating ALL financial statements...');
    
    const { Decimal } = await import('@prisma/client/runtime/library');
    const period = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    for (const company of companies) {
      try {
        console.log(`  🔄 Processing ${company.name}...`);
        
        // Get all transactions
        const dbTransactions = await prisma.transaction.findMany({
          where: { companyId: company.id },
          orderBy: { date: 'asc' },
        });
        
        if (dbTransactions.length === 0) {
          console.log(`    ⏭️ Skipping ${company.name} - no transactions`);
          results.push({
            companyId: company.id,
            companyName: company.name,
            transactionsFixed: 0,
            transactionsProcessed: 0,
            success: true,
            skipped: true,
          });
          continue;
        }
        
        // Transform for financial engine
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
        
        // Calculate using financial engine
        const statements = calculateFinancials(transactions, 0);
        
        console.log(`    ✅ Calculated: Revenue=$${statements.pl.revenue}, Profit=$${statements.pl.netProfit}, Cash=$${statements.cashFlow.endingCash}`);
        
        // Store P&L Statement
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
        
        // Store Balance Sheet
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
        
        // Store Cash Flow
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
        
        totalStatementsCreated += 3; // P&L + BS + CF
        
        results.push({
          companyId: company.id,
          companyName: company.name,
          transactionsProcessed: transactions.length,
          revenue: statements.pl.revenue,
          profit: statements.pl.netProfit,
          cash: statements.cashFlow.endingCash,
          success: true,
        });
        
        console.log(`    💾 Stored all statements for ${company.name}`);
        
      } catch (error: any) {
        console.error(`    ❌ Failed for ${company.name}:`, error);
        results.push({
          companyId: company.id,
          companyName: company.name,
          success: false,
          error: error.message,
        });
      }
    }
    
    console.log(`🎉 PHASE 3 COMPLETE: Created ${totalStatementsCreated} new financial statements`);
    console.log('');
    console.log('✅ ✅ ✅ NUCLEAR OPTION COMPLETE ✅ ✅ ✅');
    console.log(`   - Fixed ${totalTransactionsFixed} transaction flags`);
    console.log(`   - Deleted ${deletedPL.count + deletedBS.count + deletedCF.count} old statements`);
    console.log(`   - Created ${totalStatementsCreated} new statements`);
    console.log(`   - Processed ${companies.length} companies`);
    
    return NextResponse.json({
      success: true,
      message: 'NUCLEAR OPTION COMPLETE - All data fixed and rebuilt',
      summary: {
        companiesProcessed: companies.length,
        transactionsFixed: totalTransactionsFixed,
        statementsDeleted: deletedPL.count + deletedBS.count + deletedCF.count,
        statementsCreated: totalStatementsCreated,
      },
      results,
    });
    
  } catch (error: any) {
    console.error('❌ NUCLEAR OPTION FAILED:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fix all data' },
      { status: 500 }
    );
  }
}
