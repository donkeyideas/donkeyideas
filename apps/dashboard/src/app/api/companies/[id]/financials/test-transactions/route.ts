import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Decimal } from '@prisma/client/runtime/library';
import { calculateFinancials, Transaction } from '@donkey-ideas/financial-engine';

/**
 * TEST ENDPOINT - Create test transactions for each category
 * POST /api/companies/[id]/financials/test-transactions
 * 
 * This creates test transactions for:
 * - Revenue
 * - Expense (COGS)
 * - Expense (Operating)
 * - Asset
 * - Liability
 * - Equity
 * 
 * Then recalculates and shows results
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
    
    console.log(`🧪 TEST: Creating test transactions for ${company.name}...`);
    
    const today = new Date();
    const period = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // TEST TRANSACTIONS
    const testTransactions = [
      {
        date: today,
        type: 'revenue' as const,
        category: 'product_revenue',
        amount: 1000,
        description: 'TEST: Product Revenue',
        affectsPL: true,
        affectsCashFlow: true,
        affectsBalance: true,
      },
      {
        date: today,
        type: 'expense' as const,
        category: 'direct_costs',
        amount: 300,
        description: 'TEST: COGS (Direct Costs)',
        affectsPL: true,
        affectsCashFlow: true,
        affectsBalance: true,
      },
      {
        date: today,
        type: 'expense' as const,
        category: 'sales_marketing',
        amount: 200,
        description: 'TEST: Operating Expense (Sales & Marketing)',
        affectsPL: true,
        affectsCashFlow: true,
        affectsBalance: true,
      },
      {
        date: today,
        type: 'asset' as const,
        category: 'equipment',
        amount: 500,
        description: 'TEST: Asset Purchase',
        affectsPL: false,
        affectsCashFlow: true,
        affectsBalance: true,
      },
      {
        date: today,
        type: 'liability' as const,
        category: 'accounts_payable',
        amount: 100,
        description: 'TEST: Liability',
        affectsPL: false,
        affectsCashFlow: false,
        affectsBalance: true,
      },
      {
        date: today,
        type: 'equity' as const,
        category: 'capital',
        amount: 2000,
        description: 'TEST: Equity Injection',
        affectsPL: false,
        affectsCashFlow: true,
        affectsBalance: true,
      },
    ];
    
    // Create all test transactions
    const created = [];
    for (const tx of testTransactions) {
      const transaction = await prisma.transaction.create({
        data: {
          companyId,
          date: tx.date,
          type: tx.type,
          category: tx.category,
          amount: new Decimal(tx.amount),
          description: tx.description,
          affectsPL: tx.affectsPL,
          affectsCashFlow: tx.affectsCashFlow,
          affectsBalance: tx.affectsBalance,
        },
      });
      created.push({
        ...transaction,
        amount: transaction.amount.toNumber(),
      });
    }
    
    console.log(`✅ Created ${created.length} test transactions`);
    
    // NOW RECALCULATE using financial engine
    console.log('🔄 Recalculating financial statements...');
    
    // Get ALL transactions (including the test ones)
    const allTransactions = await prisma.transaction.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
    });
    
    console.log(`📊 Total transactions: ${allTransactions.length}`);
    
    // Delete old statements
    await Promise.all([
      prisma.pLStatement.deleteMany({ where: { companyId } }),
      prisma.balanceSheet.deleteMany({ where: { companyId } }),
      prisma.cashFlow.deleteMany({ where: { companyId } }),
    ]);
    
    // Transform for financial engine
    const transactions: Transaction[] = allTransactions.map(tx => ({
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
    
    // Calculate
    const statements = calculateFinancials(transactions, 0);
    
    console.log('📊 CALCULATED RESULTS:');
    console.log(`  Revenue: $${statements.pl.revenue}`);
    console.log(`  COGS: $${statements.pl.cogs}`);
    console.log(`  OpEx: $${statements.pl.operatingExpenses}`);
    console.log(`  Profit: $${statements.pl.netProfit}`);
    console.log(`  Cash: $${statements.cashFlow.endingCash}`);
    console.log(`  Assets: $${statements.balanceSheet.totalAssets}`);
    console.log(`  Liabilities: $${statements.balanceSheet.totalLiabilities}`);
    console.log(`  Equity: $${statements.balanceSheet.totalEquity}`);
    console.log(`  Balance Sheet Balances: ${statements.balanceSheet.balances}`);
    console.log(`  Valid: ${statements.isValid}`);
    if (statements.errors.length > 0) {
      console.log(`  Errors:`, statements.errors);
    }
    
    // Store new statements
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
    
    console.log('💾 Stored all financial statements');
    
    return NextResponse.json({
      success: true,
      message: `Created ${created.length} test transactions and recalculated financial statements`,
      testTransactions: created,
      calculatedResults: {
        revenue: statements.pl.revenue,
        cogs: statements.pl.cogs,
        operatingExpenses: statements.pl.operatingExpenses,
        netProfit: statements.pl.netProfit,
        cash: statements.cashFlow.endingCash,
        totalAssets: statements.balanceSheet.totalAssets,
        totalLiabilities: statements.balanceSheet.totalLiabilities,
        totalEquity: statements.balanceSheet.totalEquity,
        balanceSheetBalances: statements.balanceSheet.balances,
        isValid: statements.isValid,
        errors: statements.errors,
      },
      transactionCount: allTransactions.length,
    });
    
  } catch (error: any) {
    console.error('❌ TEST FAILED:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create test transactions',
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
