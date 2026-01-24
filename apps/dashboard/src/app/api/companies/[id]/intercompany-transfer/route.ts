import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { calculateFinancials, Transaction as FinancialTransaction } from '@donkey-ideas/financial-engine';

// POST /api/companies/:id/intercompany-transfer
// Create a matched pair of intercompany transactions (receivable + payable)
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
    
    // Verify source company ownership
    const sourceCompany = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });
    
    if (!sourceCompany) {
      return NextResponse.json(
        { error: { message: 'Source company not found' } },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const schema = z.object({
      targetCompanyId: z.string(),
      amount: z.number().positive(),
      date: z.string(),
      description: z.string().optional(),
      affectsCashFlow: z.boolean().default(false), // Intercompany transfers typically don't affect cash unless it's an actual cash transfer
    });
    
    const data = schema.parse(body);
    
    // Verify target company ownership
    const targetCompany = await prisma.company.findFirst({
      where: {
        id: data.targetCompanyId,
        userId: user.id,
      },
    });
    
    if (!targetCompany) {
      return NextResponse.json(
        { error: { message: 'Target company not found or not accessible' } },
        { status: 404 }
      );
    }
    
    // Prevent self-transfer
    if (sourceCompany.id === targetCompany.id) {
      return NextResponse.json(
        { error: { message: 'Cannot create intercompany transfer to the same company' } },
        { status: 400 }
      );
    }
    
    const { Decimal } = await import('@prisma/client/runtime/library');
    const transferDate = new Date(data.date);
    const period = new Date(transferDate.getFullYear(), transferDate.getMonth(), 1);
    const description = data.description || `Intercompany transfer with ${targetCompany.name}`;
    
    // Create ALL transactions in a database transaction to ensure atomicity
    // Generate a unique ID to link all related intercompany transactions
    const intercompanyTransferId = `IC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await prisma.$transaction(async (tx) => {
      const transactions = [];

      if (data.affectsCashFlow) {
        // When cash actually moves, create 4 transactions for proper double-entry bookkeeping:

        // 1. Source Company: Cash OUT (decrease cash asset)
        const sourceCashOut = await tx.transaction.create({
          data: {
            companyId: sourceCompany.id,
            date: transferDate,
            type: 'asset',
            category: 'cash',
            amount: new Decimal(data.amount).negated(), // Negative to decrease cash
            description: `${description} - Cash Out to ${targetCompany.name}`,
            affectsPL: false,
            affectsCashFlow: true, // This affects cash
            affectsBalance: true,
            intercompanyTransferId,
          },
        });
        transactions.push(sourceCashOut);

        // 2. Source Company: Intercompany Receivable (track the obligation)
        const receivable = await tx.transaction.create({
          data: {
            companyId: sourceCompany.id,
            date: transferDate,
            type: 'asset',
            category: 'Intercompany Receivable',
            amount: new Decimal(data.amount),
            description: `${description} - Receivable from ${targetCompany.name}`,
            affectsPL: false,
            affectsCashFlow: false, // Already tracked in cash transaction
            affectsBalance: true,
            intercompanyTransferId,
          },
        });
        transactions.push(receivable);

        // 3. Target Company: Cash IN (increase cash asset)
        const targetCashIn = await tx.transaction.create({
          data: {
            companyId: targetCompany.id,
            date: transferDate,
            type: 'asset',
            category: 'cash',
            amount: new Decimal(data.amount), // Positive to increase cash
            description: `${description} - Cash In from ${sourceCompany.name}`,
            affectsPL: false,
            affectsCashFlow: true, // This affects cash
            affectsBalance: true,
            intercompanyTransferId,
          },
        });
        transactions.push(targetCashIn);

        // 4. Target Company: Intercompany Payable (track the obligation)
        const payable = await tx.transaction.create({
          data: {
            companyId: targetCompany.id,
            date: transferDate,
            type: 'liability',
            category: 'Intercompany Payable',
            amount: new Decimal(data.amount),
            description: `${description} - Payable to ${sourceCompany.name}`,
            affectsPL: false,
            affectsCashFlow: false, // Already tracked in cash transaction
            affectsBalance: true,
            intercompanyTransferId,
          },
        });
        transactions.push(payable);
      } else {
        // When no cash moves (accrual only), create 2 transactions:

        // 1. Create Receivable on Source Company
        const receivable = await tx.transaction.create({
          data: {
            companyId: sourceCompany.id,
            date: transferDate,
            type: 'asset',
            category: 'Intercompany Receivable',
            amount: new Decimal(data.amount),
            description: `${description} [RECEIVABLE from ${targetCompany.name}]`,
            affectsPL: false,
            affectsCashFlow: false,
            affectsBalance: true,
            intercompanyTransferId,
          },
        });
        transactions.push(receivable);

        // 2. Create Payable on Target Company
        const payable = await tx.transaction.create({
          data: {
            companyId: targetCompany.id,
            date: transferDate,
            type: 'liability',
            category: 'Intercompany Payable',
            amount: new Decimal(data.amount),
            description: `${description} [PAYABLE to ${sourceCompany.name}]`,
            affectsPL: false,
            affectsCashFlow: false,
            affectsBalance: true,
            intercompanyTransferId,
          },
        });
        transactions.push(payable);
      }

      return { transactions, intercompanyTransferId };
    });
    
    // FIX: Trigger full recalculation for both companies after intercompany transfer
    // This ensures balance sheets are correct and consistent
    try {
      // Recalculate for source company
      const sourceTransactions = await prisma.transaction.findMany({
        where: { companyId: sourceCompany.id },
        orderBy: { date: 'asc' },
      });
      
      const sourceFinancialTxs: FinancialTransaction[] = sourceTransactions.map(tx => ({
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
      
      const sourceStatements = calculateFinancials(sourceFinancialTxs, 0);
      
      // Delete and recreate statements for source
      await Promise.all([
        prisma.pLStatement.deleteMany({ where: { companyId: sourceCompany.id } }),
        prisma.balanceSheet.deleteMany({ where: { companyId: sourceCompany.id } }),
        prisma.cashFlow.deleteMany({ where: { companyId: sourceCompany.id } }),
      ]);
      
      await prisma.pLStatement.create({
        data: {
          companyId: sourceCompany.id,
          period,
          productRevenue: new Decimal(sourceStatements.pl.revenue),
          serviceRevenue: new Decimal(0),
          otherRevenue: new Decimal(0),
          directCosts: new Decimal(sourceStatements.pl.cogs),
          infrastructureCosts: new Decimal(0),
          salesMarketing: new Decimal(sourceStatements.pl.operatingExpenses),
          rdExpenses: new Decimal(0),
          adminExpenses: new Decimal(0),
        },
      });
      
      await prisma.balanceSheet.create({
        data: {
          companyId: sourceCompany.id,
          period,
          cashEquivalents: new Decimal(sourceStatements.balanceSheet.cash),
          accountsReceivable: new Decimal(sourceStatements.balanceSheet.accountsReceivable),
          fixedAssets: new Decimal(sourceStatements.balanceSheet.fixedAssets),
          accountsPayable: new Decimal(sourceStatements.balanceSheet.accountsPayable),
          shortTermDebt: new Decimal(sourceStatements.balanceSheet.shortTermDebt),
          longTermDebt: new Decimal(sourceStatements.balanceSheet.longTermDebt),
        },
      });
      
      await prisma.cashFlow.create({
        data: {
          companyId: sourceCompany.id,
          period,
          beginningCash: new Decimal(sourceStatements.cashFlow.beginningCash),
          operatingCashFlow: new Decimal(sourceStatements.cashFlow.operatingCashFlow),
          investingCashFlow: new Decimal(sourceStatements.cashFlow.investingCashFlow),
          financingCashFlow: new Decimal(sourceStatements.cashFlow.financingCashFlow),
          netCashFlow: new Decimal(sourceStatements.cashFlow.netCashFlow),
          endingCash: new Decimal(sourceStatements.cashFlow.endingCash),
        },
      });
      
      // Recalculate for target company
      const targetTransactions = await prisma.transaction.findMany({
        where: { companyId: targetCompany.id },
        orderBy: { date: 'asc' },
      });
      
      const targetFinancialTxs: FinancialTransaction[] = targetTransactions.map(tx => ({
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
      
      const targetStatements = calculateFinancials(targetFinancialTxs, 0);
      
      // Delete and recreate statements for target
      await Promise.all([
        prisma.pLStatement.deleteMany({ where: { companyId: targetCompany.id } }),
        prisma.balanceSheet.deleteMany({ where: { companyId: targetCompany.id } }),
        prisma.cashFlow.deleteMany({ where: { companyId: targetCompany.id } }),
      ]);
      
      await prisma.pLStatement.create({
        data: {
          companyId: targetCompany.id,
          period,
          productRevenue: new Decimal(targetStatements.pl.revenue),
          serviceRevenue: new Decimal(0),
          otherRevenue: new Decimal(0),
          directCosts: new Decimal(targetStatements.pl.cogs),
          infrastructureCosts: new Decimal(0),
          salesMarketing: new Decimal(targetStatements.pl.operatingExpenses),
          rdExpenses: new Decimal(0),
          adminExpenses: new Decimal(0),
        },
      });
      
      await prisma.balanceSheet.create({
        data: {
          companyId: targetCompany.id,
          period,
          cashEquivalents: new Decimal(targetStatements.balanceSheet.cash),
          accountsReceivable: new Decimal(targetStatements.balanceSheet.accountsReceivable),
          fixedAssets: new Decimal(targetStatements.balanceSheet.fixedAssets),
          accountsPayable: new Decimal(targetStatements.balanceSheet.accountsPayable),
          shortTermDebt: new Decimal(targetStatements.balanceSheet.shortTermDebt),
          longTermDebt: new Decimal(targetStatements.balanceSheet.longTermDebt),
        },
      });
      
      await prisma.cashFlow.create({
        data: {
          companyId: targetCompany.id,
          period,
          beginningCash: new Decimal(targetStatements.cashFlow.beginningCash),
          operatingCashFlow: new Decimal(targetStatements.cashFlow.operatingCashFlow),
          investingCashFlow: new Decimal(targetStatements.cashFlow.investingCashFlow),
          financingCashFlow: new Decimal(targetStatements.cashFlow.financingCashFlow),
          netCashFlow: new Decimal(targetStatements.cashFlow.netCashFlow),
          endingCash: new Decimal(targetStatements.cashFlow.endingCash),
        },
      });
    } catch (recalcError: any) {
      console.error('Failed to recalculate after intercompany transfer:', recalcError);
      // Don't fail the transfer - it was created successfully
    }
    
    return NextResponse.json({
      success: true,
      message: `Created intercompany transfer: ${sourceCompany.name} → ${targetCompany.name}`,
      transactions: result.transactions,
      intercompanyTransferId: result.intercompanyTransferId,
      amount: data.amount,
      transactionCount: result.transactions.length,
    });
  } catch (error: any) {
    console.error('Failed to create intercompany transfer:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Invalid request data', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create intercompany transfer' } },
      { status: 500 }
    );
  }
}
