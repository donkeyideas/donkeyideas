import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { calculateFinancials, Transaction } from '@donkey-ideas/financial-engine';

/**
 * NEW CLEAN ENDPOINT - Recalculate and STORE all financial statements
 * POST /api/companies/[id]/financials/recalculate-all
 * 
 * This endpoint:
 * 1. Gets all transactions
 * 2. Uses financial engine to calculate P&L, Balance Sheet, Cash Flow
 * 3. STORES the results in database
 * 4. Returns the calculated values
 * 
 * This ensures stored values match calculated values
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const companyId = params.id;
    
    // Verify company belongs to user
    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: user.id },
    });
    
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    console.log(`🔄 Recalculating ALL financials for ${company.name}...`);
    
    // STEP 1: Get all transactions
    const dbTransactions = await prisma.transaction.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
    });
    
    console.log(`📊 Found ${dbTransactions.length} transactions`);
    
    // STEP 2: Delete ALL existing financial statements (fresh start)
    await Promise.all([
      prisma.pLStatement.deleteMany({ where: { companyId } }),
      prisma.balanceSheet.deleteMany({ where: { companyId } }),
      prisma.cashFlow.deleteMany({ where: { companyId } }),
    ]);
    
    console.log(`🗑️ Deleted all existing financial statements`);
    
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
    
    // DEBUG: Log transaction details
    console.log(`📋 Processing ${transactions.length} transactions for ${company.name}:`);
    transactions.forEach((tx, idx) => {
      console.log(`  [${idx + 1}] ${tx.date.toISOString().split('T')[0]} | Type: ${tx.type} | Category: ${tx.category} | Amount: $${tx.amount} | AffectsPL: ${tx.affectsPL} | AffectsCF: ${tx.affectsCashFlow}`);
    });
    
    // STEP 4: Calculate using financial engine
    const statements = calculateFinancials(transactions, 0);
    
    console.log(`✅ Calculated financial statements:`, {
      revenue: statements.pl.revenue,
      expenses: statements.pl.totalExpenses,
      profit: statements.pl.netProfit,
      cash: statements.cashFlow.endingCash,
    });
    console.log(`   P&L breakdown:`, {
      revenue: statements.pl.revenue,
      cogs: statements.pl.cogs,
      opex: statements.pl.operatingExpenses,
    });
    
    // STEP 5: Store P&L Statement
    const { Decimal } = await import('@prisma/client/runtime/library');
    const period = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    await prisma.pLStatement.create({
      data: {
        companyId,
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
        companyId,
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
        companyId,
        period,
        beginningCash: new Decimal(statements.cashFlow.beginningCash),
        operatingCashFlow: new Decimal(statements.cashFlow.operatingCashFlow),
        investingCashFlow: new Decimal(statements.cashFlow.investingCashFlow),
        financingCashFlow: new Decimal(statements.cashFlow.financingCashFlow),
        netCashFlow: new Decimal(statements.cashFlow.netCashFlow),
        endingCash: new Decimal(statements.cashFlow.endingCash),
      },
    });
    
    console.log(`💾 Stored all financial statements in database`);
    
    return NextResponse.json({
      success: true,
      message: `Recalculated and stored all financial statements for ${company.name}`,
      statements: {
        pl: statements.pl,
        balanceSheet: statements.balanceSheet,
        cashFlow: statements.cashFlow,
      },
      transactionsProcessed: transactions.length,
    });
    
  } catch (error: any) {
    console.error('Failed to recalculate financials:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to recalculate financials' },
      { status: 500 }
    );
  }
}
