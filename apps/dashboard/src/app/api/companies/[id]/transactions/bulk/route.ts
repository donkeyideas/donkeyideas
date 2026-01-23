import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

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
});

// Helper function to update P&L statement
async function updatePLStatement(companyId: string, transaction: any, operation: 'add' | 'subtract') {
  if (transaction.affectsPL === false) return;

  const txDate = new Date(transaction.date);
  const period = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
  const amount = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;
  const multiplier = operation === 'add' ? 1 : -1;

  let updateData: any = {};

  if (transaction.type === 'revenue') {
    const category = (transaction.category || '').toLowerCase().trim();
    if (category === 'product_sales' || category === 'product sales') {
      updateData.productRevenue = { increment: amount * multiplier };
    } else if (category === 'service_revenue' || category === 'service revenue') {
      updateData.serviceRevenue = { increment: amount * multiplier };
    } else {
      updateData.otherRevenue = { increment: amount * multiplier };
    }
  } else if (transaction.type === 'expense') {
    const category = (transaction.category || '').toLowerCase().trim();
    if (category === 'direct_costs' || category === 'direct costs') {
      updateData.directCosts = { increment: amount * multiplier };
    } else if (category === 'infrastructure' || category === 'infrastructure costs') {
      updateData.infrastructureCosts = { increment: amount * multiplier };
    } else if (category === 'sales_marketing' || category === 'sales marketing') {
      updateData.salesMarketing = { increment: amount * multiplier };
    } else if (category === 'rd' || category === 'r&d' || category === 'research development') {
      updateData.rdExpenses = { increment: amount * multiplier };
    } else if (category === 'admin' || category === 'legal' || category === 'travel') {
      updateData.adminExpenses = { increment: amount * multiplier };
    } else {
      updateData.adminExpenses = { increment: amount * multiplier };
    }
  }

  if (Object.keys(updateData).length > 0) {
    // Convert increment operations to actual values for create
    const createData: any = {
      companyId,
      period,
      productRevenue: 0,
      serviceRevenue: 0,
      otherRevenue: 0,
      directCosts: 0,
      infrastructureCosts: 0,
      salesMarketing: 0,
      rdExpenses: 0,
      adminExpenses: 0,
    };

    // Apply the increments as actual values for create
    Object.keys(updateData).forEach(key => {
      if (updateData[key].increment !== undefined) {
        createData[key] = updateData[key].increment;
      }
    });

    await prisma.pLStatement.upsert({
      where: {
        companyId_period: {
          companyId,
          period,
        },
      },
      update: updateData,
      create: createData,
    });
  }
}

// Helper function to update Balance Sheet
async function updateBalanceSheet(companyId: string, transaction: any, operation: 'add' | 'subtract') {
  if (transaction.affectsBalance === false) return;

  const txDate = new Date(transaction.date);
  const period = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
  const amount = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;
  const multiplier = operation === 'add' ? 1 : -1;

  let updateData: any = {};

  if (transaction.type === 'asset') {
    const category = (transaction.category || '').toLowerCase().trim();
    if (category === 'cash') {
      updateData.cashEquivalents = { increment: amount * multiplier };
    } else if (category === 'accounts_receivable' || category === 'accounts receivable') {
      updateData.accountsReceivable = { increment: amount * multiplier };
    } else if (category === 'equipment' || category === 'inventory' || category === 'fixed_assets') {
      updateData.fixedAssets = { increment: amount * multiplier };
    }
  } else if (transaction.type === 'liability') {
    const category = (transaction.category || '').toLowerCase().trim();
    if (category === 'accounts_payable' || category === 'accounts payable') {
      updateData.accountsPayable = { increment: amount * multiplier };
    } else if (category === 'short_term_debt' || category === 'short term debt') {
      updateData.shortTermDebt = { increment: amount * multiplier };
    } else if (category === 'long_term_debt' || category === 'long term debt') {
      updateData.longTermDebt = { increment: amount * multiplier };
    }
  }

  if (Object.keys(updateData).length > 0) {
    // Convert increment operations to actual values for create
    const createData: any = {
      companyId,
      period,
      cashEquivalents: 0,
      accountsReceivable: 0,
      fixedAssets: 0,
      accountsPayable: 0,
      shortTermDebt: 0,
      longTermDebt: 0,
      totalEquity: 0,
    };

    // Apply the increments as actual values for create
    Object.keys(updateData).forEach(key => {
      if (updateData[key].increment !== undefined) {
        createData[key] = updateData[key].increment;
      }
    });

    await prisma.balanceSheet.upsert({
      where: {
        companyId_period: {
          companyId,
          period,
        },
      },
      update: updateData,
      create: createData,
    });
  }
}

// Helper function to update Cash Flow
async function updateCashFlow(companyId: string, transaction: any, operation: 'add' | 'subtract') {
  if (transaction.affectsCashFlow === false) return;

  const txDate = new Date(transaction.date);
  const period = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
  const amount = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;
  const multiplier = operation === 'add' ? 1 : -1;

  let updateData: any = {};

  if (transaction.type === 'revenue') {
    updateData.operatingCashFlow = { increment: amount * multiplier };
  } else if (transaction.type === 'expense') {
    updateData.operatingCashFlow = { increment: -amount * multiplier };
  } else if (transaction.type === 'asset') {
    const category = (transaction.category || '').toLowerCase().trim();
    if (category === 'equipment' || category === 'inventory') {
      updateData.investingCashFlow = { increment: -amount * multiplier };
    } else if (category === 'cash') {
      updateData.operatingCashFlow = { increment: amount * multiplier };
    }
  } else if (transaction.type === 'equity') {
    updateData.financingCashFlow = { increment: amount * multiplier };
  } else if (transaction.type === 'liability') {
    const category = (transaction.category || '').toLowerCase().trim();
    if (category === 'short_term_debt' || category === 'long_term_debt' || 
        category === 'short term debt' || category === 'long term debt') {
      updateData.financingCashFlow = { increment: amount * multiplier };
    } else if (category === 'accounts_payable' || category === 'accounts payable') {
      updateData.operatingCashFlow = { increment: -amount * multiplier };
    }
  }

  if (Object.keys(updateData).length > 0) {
    // Convert increment operations to actual values for create
    const createData: any = {
      companyId,
      period,
      operatingCashFlow: 0,
      investingCashFlow: 0,
      financingCashFlow: 0,
      beginningCash: 0,
      endingCash: 0,
    };

    // Apply the increments as actual values for create
    Object.keys(updateData).forEach(key => {
      if (updateData[key].increment !== undefined) {
        createData[key] = updateData[key].increment;
      }
    });

    await prisma.cashFlow.upsert({
      where: {
        companyId_period: {
          companyId,
          period,
        },
      },
      update: updateData,
      create: createData,
    });
  }
}

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

    // Process transactions in smaller batches to avoid timeout
    const createdTransactions = [];
    const batchSize = 10; // Smaller batch size for database operations
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      // Process each batch in its own transaction with extended timeout
      const batchResults = await prisma.$transaction(async (tx: any) => {
        const results = [];
        
        const getIntercompanyDirection = (txData: any) => {
          const description = String(txData.description || '').toLowerCase();
          const category = String(txData.category || '').toLowerCase();
          const amountValue = Number(txData.amount);
          if (!Number.isNaN(amountValue) && amountValue !== 0) {
            return amountValue < 0 ? 'out' : 'in';
          }
          const hasOutflow = category.includes('transfer_out') ||
            description.includes('transfer out') ||
            (description.includes('transfer') && description.includes(' to '));
          const hasInflow = category.includes('transfer_in') ||
            description.includes('transfer in') ||
            (description.includes('transfer') && description.includes(' from '));

          if (hasInflow && !hasOutflow) return 'in';
          if (hasOutflow && !hasInflow) return 'out';
          return 'out';
        };

        for (const transactionData of batch) {
          // Handle intercompany transfers
          if (transactionData.type === 'intercompany_transfer') {
            if (!transactionData.targetCompanyId) {
              const { isIntercompany, targetCompanyId, ...dbTransactionData } = transactionData;
              const singleTransaction = await tx.transaction.create({
                data: {
                  ...dbTransactionData,
                  companyId: params.id,
                  date: new Date(transactionData.date),
                  amount: Number(transactionData.amount),
                },
              });
              results.push(singleTransaction);
              continue;
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

            const direction = getIntercompanyDirection(transactionData);
            const sourceCompany = direction === 'in' ? otherCompany : company;
            const targetCompany = direction === 'in' ? company : otherCompany;

            const transferDate = new Date(transactionData.date);
            const outgoingAmount = -Math.abs(Number(transactionData.amount));
            const incomingAmount = Math.abs(Number(transactionData.amount));
            const desc = transactionData.description || 'Intercompany transfer';

            const existingOutgoing = await tx.transaction.findFirst({
              where: {
                companyId: sourceCompany.id,
                date: transferDate,
                type: 'intercompany_transfer',
                category: transactionData.category,
                amount: outgoingAmount,
                description: { contains: desc },
              },
            });

            const existingIncoming = await tx.transaction.findFirst({
              where: {
                companyId: targetCompany.id,
                date: transferDate,
                type: 'intercompany_transfer',
                category: transactionData.category,
                amount: incomingAmount,
                description: { contains: desc },
              },
            });

            if (existingOutgoing || existingIncoming) {
              continue;
            }

            // Prepare transaction data without fields that don't exist in the database
            const { isIntercompany, targetCompanyId, ...dbTransactionData } = transactionData;

            // Create outgoing transaction (source company)
            const outgoingTransaction = await tx.transaction.create({
              data: {
                ...dbTransactionData,
                companyId: sourceCompany.id,
                date: transferDate,
                description: `${desc} [INTERCOMPANY CASH OUTFLOW to ${targetCompany.name}]`,
                amount: outgoingAmount, // Negative for outgoing
              },
            });

            // Create incoming transaction (target company)
            const incomingTransaction = await tx.transaction.create({
              data: {
                ...dbTransactionData,
                companyId: targetCompany.id,
                date: transferDate,
                description: `${desc} [INTERCOMPANY CASH INFLOW from ${sourceCompany.name}]`,
                amount: incomingAmount, // Positive for incoming
              },
            });

            results.push(outgoingTransaction, incomingTransaction);
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
          }
        }

        return results;
      }, {
        timeout: 15000, // 15 second timeout
      });
      
      createdTransactions.push(...batchResults);
      
      // Update financial statements outside of the main transaction
      for (const transactionData of batch) {
        await updatePLStatement(params.id, transactionData, 'add');
        await updateBalanceSheet(params.id, transactionData, 'add');
        await updateCashFlow(params.id, transactionData, 'add');
      }
    }

    // Format response
    const formattedTransactions = createdTransactions.map((t: any) => ({
      ...t,
      amount: t.amount.toNumber(),
    }));

    return NextResponse.json({ 
      transactions: formattedTransactions,
      message: `Successfully created ${createdTransactions.length} transactions`
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
