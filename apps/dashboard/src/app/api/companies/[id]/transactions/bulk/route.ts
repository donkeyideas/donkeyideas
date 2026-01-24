import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { calculateFinancialsByPeriod, Transaction as FinancialTransaction } from '@donkey-ideas/financial-engine';

const bulkTransactionSchema = z.object({
  transactions: z.array(z.object({
    date: z.string(),
    type: z.enum(['revenue', 'expense', 'asset', 'liability', 'equity', 'intercompany_transfer']),
    category: z.string(),
    amount: z.number(),
    description: z.string().optional(),
    affectsPL: z.boolean().default(true),
    affectsBalance: z.boolean().default(true),
    affectsCashFlow: z.boolean().default(true),
    isIntercompany: z.boolean().optional(),
    targetCompanyId: z.string().optional(),
  }))
}).superRefine((data, ctx) => {
  // PHASE 3 FIX: Enforce target company for intercompany transfers (strict mode)
  data.transactions.forEach((tx, index) => {
    if (tx.type === 'intercompany_transfer' && !tx.targetCompanyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Intercompany transfers require a Target Company ID',
        path: ['transactions', index, 'targetCompanyId'],
      });
    }
  });
});

/**
 * REMOVED: Incremental update functions
 *
 * These functions were causing inconsistencies because they calculated
 * financials differently than the financial engine.
 *
 * Now we ONLY use the financial engine for ALL calculations.
 * See Phase 2 of the plan for details.
 */

// POST /api/companies/:id/transactions/bulk
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { transactions } = bulkTransactionSchema.parse(body);
    const inputCount = transactions.length;

    // Process transactions in smaller batches to avoid timeout
    const createdTransactions = [];
    let createdSingle = 0;
    let createdOutgoing = 0;
    let createdIncoming = 0;
    let skippedExisting = 0;
    const batchSize = 10; // Smaller batch size for database operations
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      // Process each batch in its own transaction with extended timeout
      const batchResults = await prisma.$transaction(async (tx: any) => {
        const results = [];
        
        const getIntercompanyDirection = (txData: any) => {
          const description = String(txData.description || '').toLowerCase();
          const category = String(txData.category || '').toLowerCase();
          const hasOutflow = category.includes('transfer_out') ||
            description.includes('outflow') ||
            description.includes('transfer out') ||
            description.includes('to chk') ||
            description.includes('from chk') ||
            (description.includes('transfer') && description.includes(' to '));
          const hasInflow = category.includes('transfer_in') ||
            description.includes('inflow') ||
            description.includes('transfer in') ||
            (description.includes('transfer') && description.includes(' from '));

          if (hasOutflow) return 'out';
          if (hasInflow) return 'in';

          const amountValue = Number(txData.amount);
          if (!Number.isNaN(amountValue) && amountValue !== 0) {
            return amountValue < 0 ? 'out' : 'in';
          }

          return 'out';
        };

        for (const transactionData of batch) {
          // PHASE 3 FIX: Proper intercompany transfer handling with double-entry accounting
          if (transactionData.type === 'intercompany_transfer') {
            // targetCompanyId is now REQUIRED (validated by schema)
            if (!transactionData.targetCompanyId) {
              throw new Error('Intercompany transfers require a Target Company ID (should be caught by validation)');
            }

            // Verify target company exists and belongs to the same user
            const otherCompany = await tx.company.findFirst({
              where: {
                id: transactionData.targetCompanyId,
                userId: user.id,
              },
            });

            if (!otherCompany) {
              throw new Error(`Target company ${transactionData.targetCompanyId} not found or not accessible`);
            }

            const sourceCompany = company;
            const targetCompany = otherCompany;
            const transferDate = new Date(transactionData.date);
            const transferAmount = Math.abs(Number(transactionData.amount));
            const desc = transactionData.description || 'Intercompany transfer';

            // PHASE 3 FIX: Create FOUR transactions for proper double-entry accounting
            // Source Company:
            //   1. Cash decrease (outflow)
            //   2. Intercompany Receivable increase (asset - what we're owed)
            // Target Company:
            //   3. Cash increase (inflow)
            //   4. Intercompany Payable increase (liability - what we owe)

            const transferKey = `${transferDate.toISOString()}_${transferAmount}_${sourceCompany.id}_${targetCompany.id}`;

            // Check if this exact transfer already exists (deduplication)
            const existingSourceCash = await tx.transaction.findFirst({
              where: {
                companyId: sourceCompany.id,
                date: transferDate,
                type: 'asset',
                category: 'cash',
                amount: -transferAmount,
                description: { contains: transferKey },
              },
            });

            if (existingSourceCash) {
              skippedExisting += 1;
              continue; // Already processed
            }

            // Source Company: Cash outflow
            const sourceCashTx = await tx.transaction.create({
              data: {
                companyId: sourceCompany.id,
                date: transferDate,
                type: 'asset',
                category: 'cash',
                amount: -transferAmount, // Negative = cash decrease
                description: `${desc} [IC OUTFLOW to ${targetCompany.name}] ${transferKey}`,
                affectsPL: false,
                affectsBalance: true,
                affectsCashFlow: true,
              },
            });
            results.push(sourceCashTx);
            createdOutgoing += 1;

            // Source Company: Intercompany Receivable
            const sourceReceivableTx = await tx.transaction.create({
              data: {
                companyId: sourceCompany.id,
                date: transferDate,
                type: 'asset',
                category: 'intercompany_receivable',
                amount: transferAmount, // Positive = asset increase
                description: `${desc} [IC RECEIVABLE from ${targetCompany.name}] ${transferKey}`,
                affectsPL: false,
                affectsBalance: true,
                affectsCashFlow: false,
              },
            });
            results.push(sourceReceivableTx);
            createdOutgoing += 1;

            // Target Company: Cash inflow
            const targetCashTx = await tx.transaction.create({
              data: {
                companyId: targetCompany.id,
                date: transferDate,
                type: 'asset',
                category: 'cash',
                amount: transferAmount, // Positive = cash increase
                description: `${desc} [IC INFLOW from ${sourceCompany.name}] ${transferKey}`,
                affectsPL: false,
                affectsBalance: true,
                affectsCashFlow: true,
              },
            });
            results.push(targetCashTx);
            createdIncoming += 1;

            // Target Company: Intercompany Payable
            const targetPayableTx = await tx.transaction.create({
              data: {
                companyId: targetCompany.id,
                date: transferDate,
                type: 'liability',
                category: 'intercompany_payable',
                amount: transferAmount, // Positive = liability increase
                description: `${desc} [IC PAYABLE to ${sourceCompany.name}] ${transferKey}`,
                affectsPL: false,
                affectsBalance: true,
                affectsCashFlow: false,
              },
            });
            results.push(targetPayableTx);
            createdIncoming += 1;
          } else {
            // Create regular transaction - remove fields that don't exist in database
            const { isIntercompany, targetCompanyId, ...dbTransactionData } = transactionData;
            
            const transaction = await tx.transaction.create({
              data: {
                ...dbTransactionData,
                companyId: params.id,
                date: new Date(transactionData.date),
              },
            });

            results.push(transaction);
            createdSingle += 1;
          }
        }

        return results;
      }, {
        timeout: 15000, // 15 second timeout
      });

      createdTransactions.push(...batchResults);

      // Small delay between batches to prevent server overload
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // PHASE 2 FIX: Use financial engine for ALL calculations
    // After all transactions are created, recalculate financial statements
    // This ensures consistency with the same engine used everywhere
    try {
      console.log(`🔄 Recalculating financials for company ${params.id}...`);

      // Get all transactions for this company
      const allTransactions = await prisma.transaction.findMany({
        where: { companyId: params.id },
        orderBy: { date: 'asc' },
      });

      // Delete existing financial statements
      await Promise.all([
        prisma.pLStatement.deleteMany({ where: { companyId: params.id } }),
        prisma.balanceSheet.deleteMany({ where: { companyId: params.id } }),
        prisma.cashFlow.deleteMany({ where: { companyId: params.id } }),
      ]);

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
      const periodStatements = calculateFinancialsByPeriod(financialTxs, 'month', 0, 0);

      console.log(`📊 Calculated ${periodStatements.length} periods`);

      // Store each period's statements
      for (const periodData of periodStatements) {
        const { statements, period } = periodData;

        // Store P&L
        await prisma.pLStatement.create({
          data: {
            companyId: params.id,
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
            companyId: params.id,
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
            companyId: params.id,
            period,
            beginningCash: new Decimal(statements.cashFlow.beginningCash),
            operatingCashFlow: new Decimal(statements.cashFlow.operatingCashFlow),
            investingCashFlow: new Decimal(statements.cashFlow.investingCashFlow),
            financingCashFlow: new Decimal(statements.cashFlow.financingCashFlow),
            netCashFlow: new Decimal(statements.cashFlow.netCashFlow),
            endingCash: new Decimal(statements.cashFlow.endingCash),
          },
        });
      }

      console.log(`✅ Successfully recalculated financials for ${periodStatements.length} periods`);
    } catch (recalcError: any) {
      console.error('❌ Failed to recalculate financial statements:', recalcError);
      // Continue - transactions were created successfully
    }

    // Format response
    const formattedTransactions = createdTransactions.map((t: any) => ({
      ...t,
      amount: t.amount.toNumber(),
    }));

    return NextResponse.json({ 
      transactions: formattedTransactions,
      message: `Successfully created ${createdTransactions.length} transactions`,
      summary: {
        inputCount,
        createdCount: createdTransactions.length,
        createdSingle,
        createdOutgoing,
        createdIncoming,
        skippedExisting,
      },
    });
  } catch (error: any) {
    console.error('Failed to create bulk transactions:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: { message: 'Invalid transaction data', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { message: error.message || 'Failed to create transactions' } },
      { status: 500 }
    );
  }
}
