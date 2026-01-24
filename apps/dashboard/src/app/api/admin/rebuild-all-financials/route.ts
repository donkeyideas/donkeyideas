import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Decimal } from '@prisma/client/runtime/library';
import { calculateFinancialsByPeriod, Transaction as FinancialTransaction } from '@donkey-ideas/financial-engine';

/**
 * ADMIN ENDPOINT: Rebuild All Financial Statements
 *
 * POST /api/admin/rebuild-all-financials
 *
 * Purpose:
 * - Recalculate ALL financial statements from transactions using the FIXED accounting engine
 * - Fixes issues with retained earnings, intercompany transfers, cash double-counting
 * - Should be run after deploying the accounting fixes
 *
 * Process:
 * 1. For each company owned by the user
 * 2. Fetch all transactions
 * 3. Delete existing P&L, Balance Sheet, Cash Flow records
 * 4. Recalculate using period-based financial engine
 * 5. Store all periods' statements
 * 6. Validate results
 *
 * Returns:
 * - Detailed report of companies processed, periods created, errors found
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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

    console.log(`🔄 REBUILD ALL FINANCIALS - Started for user ${user.id}`);
    console.log(`⏰ Time: ${new Date().toISOString()}`);

    // Get all companies for the user
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });

    console.log(`📊 Found ${companies.length} companies to rebuild`);

    const results = [];
    let totalPeriodsCreated = 0;
    let totalErrors = 0;

    // Process each company
    for (const company of companies) {
      const companyStartTime = Date.now();
      console.log(`\n📁 Processing: ${company.name} (${company.id})`);

      try {
        // Fetch all transactions for this company
        const allTransactions = await prisma.transaction.findMany({
          where: { companyId: company.id },
          orderBy: { date: 'asc' },
        });

        console.log(`  📥 Found ${allTransactions.length} transactions`);

        if (allTransactions.length === 0) {
          results.push({
            companyId: company.id,
            companyName: company.name,
            status: 'skipped',
            reason: 'No transactions',
            transactionCount: 0,
            periodsCreated: 0,
            errors: [],
          });
          continue;
        }

        // Delete existing financial statements
        const deleteStartTime = Date.now();
        const [deletedPL, deletedBS, deletedCF] = await Promise.all([
          prisma.pLStatement.deleteMany({ where: { companyId: company.id } }),
          prisma.balanceSheet.deleteMany({ where: { companyId: company.id } }),
          prisma.cashFlow.deleteMany({ where: { companyId: company.id } }),
        ]);
        const deleteTime = Date.now() - deleteStartTime;

        console.log(`  🗑️  Deleted ${deletedPL.count} P&L, ${deletedBS.count} Balance Sheets, ${deletedCF.count} Cash Flows (${deleteTime}ms)`);

        // Transform transactions for financial engine
        const financialTxs: FinancialTransaction[] = allTransactions.map(tx => ({
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

        // Calculate financials period-by-period (monthly)
        const calcStartTime = Date.now();
        const periodStatements = calculateFinancialsByPeriod(financialTxs, 'month', 0, 0);
        const calcTime = Date.now() - calcStartTime;

        console.log(`  🧮 Calculated ${periodStatements.length} periods (${calcTime}ms)`);

        // Collect validation errors
        const companyErrors: string[] = [];

        // Store each period's statements
        const storeStartTime = Date.now();
        for (const periodData of periodStatements) {
          const { statements, period: periodDate, periodLabel } = periodData;

          // Validate this period
          if (!statements.isValid) {
            companyErrors.push(`${periodLabel}: ${statements.errors.join(', ')}`);
          }

          // Store P&L
          await prisma.pLStatement.create({
            data: {
              companyId: company.id,
              period: periodDate,
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
              period: periodDate,
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
              period: periodDate,
              beginningCash: new Decimal(statements.cashFlow.beginningCash),
              operatingCashFlow: new Decimal(statements.cashFlow.operatingCashFlow),
              investingCashFlow: new Decimal(statements.cashFlow.investingCashFlow),
              financingCashFlow: new Decimal(statements.cashFlow.financingCashFlow),
              netCashFlow: new Decimal(statements.cashFlow.netCashFlow),
              endingCash: new Decimal(statements.cashFlow.endingCash),
            },
          });
        }
        const storeTime = Date.now() - storeStartTime;

        console.log(`  💾 Stored ${periodStatements.length} periods (${storeTime}ms)`);

        const companyTime = Date.now() - companyStartTime;
        const status = companyErrors.length > 0 ? 'completed_with_errors' : 'success';

        if (companyErrors.length > 0) {
          console.log(`  ⚠️  Completed with ${companyErrors.length} errors (${companyTime}ms)`);
          totalErrors += companyErrors.length;
        } else {
          console.log(`  ✅ Success (${companyTime}ms)`);
        }

        results.push({
          companyId: company.id,
          companyName: company.name,
          status,
          transactionCount: allTransactions.length,
          periodsCreated: periodStatements.length,
          errors: companyErrors,
          timeMs: companyTime,
        });

        totalPeriodsCreated += periodStatements.length;

      } catch (companyError: any) {
        console.error(`  ❌ Error processing company ${company.name}:`, companyError);
        results.push({
          companyId: company.id,
          companyName: company.name,
          status: 'error',
          transactionCount: 0,
          periodsCreated: 0,
          errors: [companyError.message || 'Unknown error'],
        });
        totalErrors += 1;
      }
    }

    const totalTime = Date.now() - startTime;

    const summary = {
      success: true,
      companiesProcessed: companies.length,
      totalPeriodsCreated,
      totalErrors,
      timeMs: totalTime,
      timeSummary: `${(totalTime / 1000).toFixed(2)}s`,
    };

    console.log(`\n✅ REBUILD COMPLETE`);
    console.log(`📊 Summary:`);
    console.log(`   Companies: ${summary.companiesProcessed}`);
    console.log(`   Periods Created: ${summary.totalPeriodsCreated}`);
    console.log(`   Errors: ${summary.totalErrors}`);
    console.log(`   Time: ${summary.timeSummary}`);

    return NextResponse.json({
      summary,
      companies: results,
    });

  } catch (error: any) {
    console.error('❌ REBUILD FAILED:', error);
    return NextResponse.json(
      {
        error: {
          message: error.message || 'Failed to rebuild financials',
          stack: error.stack,
        },
      },
      { status: 500 }
    );
  }
}
