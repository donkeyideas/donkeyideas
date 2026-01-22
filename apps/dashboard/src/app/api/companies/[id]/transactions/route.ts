import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const createTransactionSchema = z.object({
  date: z.string(),
  type: z.enum(['revenue', 'expense', 'asset', 'liability', 'equity']),
  category: z.string(),
  amount: z.number().min(0),
  description: z.string().optional(),
  affectsPL: z.boolean().default(true), // ✅ Revenue/Expense transactions SHOULD affect P&L by default
  affectsBalance: z.boolean().default(true),
  affectsCashFlow: z.boolean().default(true), // ✅ Most transactions are cash transactions by default
});

// GET /api/companies/:id/transactions
export async function GET(
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
    
    const transactions = await prisma.transaction.findMany({
      where: { companyId: params.id },
      orderBy: { date: 'desc' },
    });
    
    
    const formattedTransactions = transactions.map((t: any) => ({
      ...t,
      amount: t.amount.toNumber(),
    }));
    
    return NextResponse.json({ transactions: formattedTransactions });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch transactions' } },
      { status: 500 }
    );
  }
}

// POST /api/companies/:id/transactions
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
    const validated = createTransactionSchema.parse(body);
    
    // Auto-set flags based on transaction type
    // Revenue and Expense should affect P&L and Cash Flow
    // (COGS is handled as 'expense' type with specific categories)
    if (validated.type === 'revenue' || validated.type === 'expense') {
      if (body.affectsPL === undefined) {
        validated.affectsPL = true; // Auto-set to true for P&L transactions
      }
      if (!body.affectsCashFlow) {
        validated.affectsCashFlow = true; // Auto-set to true for cash transactions
      }
      if (body.affectsBalance === undefined) {
        validated.affectsBalance = true; // Auto-set to true for balance sheet
      }
    }
    
    // Asset, Liability, Equity typically don't affect P&L
    if (validated.type === 'asset' || validated.type === 'liability' || validated.type === 'equity') {
      if (body.affectsPL === undefined) {
        validated.affectsPL = false; // Assets/Liabilities/Equity don't affect P&L
      }
      if (body.affectsCashFlow === undefined) {
        // Assets usually affect cash, liabilities/equity depends on transaction
        validated.affectsCashFlow = validated.type === 'asset';
      }
      if (body.affectsBalance === undefined) {
        validated.affectsBalance = true; // All affect balance sheet
      }
    }
    
    const transactionDate = new Date(validated.date);
    const period = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);
    
    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        companyId: params.id,
        date: transactionDate,
        type: validated.type,
        category: validated.category,
        amount: new Decimal(validated.amount),
        description: validated.description,
        affectsPL: validated.affectsPL,
        affectsBalance: validated.affectsBalance,
        affectsCashFlow: validated.affectsCashFlow,
      },
    });
    
    // Auto-update P&L Statement if needed
    if (validated.affectsPL) {
      await updatePLStatement(params.id, period, validated.type, validated.category, validated.amount);
    }
    
    // Auto-update Cash Flow first if needed (so balance sheet can sync from it)
    if (validated.affectsCashFlow) {
      await updateCashFlow(params.id, period, validated.type, validated.category, validated.amount);
    }
    
    // Auto-update Balance Sheet if needed
    if (validated.affectsBalance) {
      await updateBalanceSheet(params.id, period, validated.type, validated.category, validated.amount, validated.affectsCashFlow);
    }
    
    return NextResponse.json({ transaction: { ...transaction, amount: transaction.amount.toNumber() } }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create transaction' } },
      { status: 500 }
    );
  }
}

// Helper functions
async function updatePLStatement(
  companyId: string,
  period: Date,
  type: string,
  category: string,
  amount: number
) {
  const plStatement = await prisma.pLStatement.upsert({
    where: {
      companyId_period: {
        companyId,
        period,
      },
    },
    update: {},
    create: {
      companyId,
      period,
    },
  });
  
  const updateData: any = {};
  
  if (type === 'revenue') {
    if (category === 'product_revenue') updateData.productRevenue = { increment: new Decimal(amount) };
    else if (category === 'service_revenue') updateData.serviceRevenue = { increment: new Decimal(amount) };
    else if (category === 'other_revenue') updateData.otherRevenue = { increment: new Decimal(amount) };
  } else if (type === 'expense') {
    if (category === 'direct_costs') updateData.directCosts = { increment: new Decimal(amount) };
    else if (category === 'infrastructure') updateData.infrastructureCosts = { increment: new Decimal(amount) };
    else if (category === 'sales_marketing') updateData.salesMarketing = { increment: new Decimal(amount) };
    else if (category === 'rd') updateData.rdExpenses = { increment: new Decimal(amount) };
    else if (category === 'admin' || category === 'salaries' || category === 'rent' || category === 'utilities' || 
             category === 'legal' || category === 'travel') {
      updateData.adminExpenses = { increment: new Decimal(amount) };
    }
  }
  
  if (Object.keys(updateData).length > 0) {
    await prisma.pLStatement.update({
      where: { id: plStatement.id },
      data: updateData,
    });
  }
}

async function updateBalanceSheet(
  companyId: string,
  period: Date,
  type: string,
  category: string,
  amount: number,
  isCashTransaction: boolean = false
) {
  // If this is a cash flow transaction, the cash flow update already synced the balance sheet
  // But we still need to update other balance sheet items
  if (isCashTransaction && (type === 'revenue' || type === 'expense')) {
    // Cash flow already handled cash, so we only need to update if there are other items
    // For revenue/expense cash transactions, cash is already updated by cash flow
    return;
  }
  
  const balanceSheet = await prisma.balanceSheet.upsert({
    where: {
      companyId_period: {
        companyId,
        period,
      },
    },
    update: {},
    create: {
      companyId,
      period,
    },
  });
  
  const updateData: any = {};
  
  if (type === 'asset') {
    const categoryLower = category.toLowerCase().trim().replace(/[_\s]+/g, '_');
    
    if (categoryLower === 'cash') {
      // Direct cash asset transactions
      updateData.cashEquivalents = { increment: new Decimal(amount) };
    } else if (categoryLower === 'accounts_receivable' || categoryLower === 'intercompany_receivable') {
      // Intercompany receivables are treated as accounts receivable on individual balance sheets
      updateData.accountsReceivable = { increment: new Decimal(amount) };
    } else if (categoryLower === 'equipment' || categoryLower === 'inventory') {
      updateData.fixedAssets = { increment: new Decimal(amount) };
    }
  } else if (type === 'liability') {
    const categoryLower = category.toLowerCase().trim().replace(/[_\s]+/g, '_');
    
    if (categoryLower === 'accounts_payable' || categoryLower === 'intercompany_payable') {
      // Intercompany payables are treated as accounts payable on individual balance sheets
      updateData.accountsPayable = { increment: new Decimal(amount) };
    } else if (categoryLower === 'short_term_debt') {
      updateData.shortTermDebt = { increment: new Decimal(amount) };
    } else if (categoryLower === 'long_term_debt') {
      updateData.longTermDebt = { increment: new Decimal(amount) };
    }
  }
  
  // Handle revenue/expense effects on balance sheet (only if not cash flow transaction)
  if (!isCashTransaction) {
    if (type === 'revenue') {
      // Non-cash revenue increases A/R
      updateData.accountsReceivable = { increment: new Decimal(amount) };
    } else if (type === 'expense') {
      // Non-cash expense increases A/P
      updateData.accountsPayable = { increment: new Decimal(amount) };
    }
  }
  
  if (Object.keys(updateData).length > 0) {
    await prisma.balanceSheet.update({
      where: { id: balanceSheet.id },
      data: updateData,
    });
  }
}

async function updateCashFlow(
  companyId: string,
  period: Date,
  type: string,
  category: string,
  amount: number
) {
  // Get the most recent period's ending cash before the current period for beginning cash
  const mostRecentCashFlow = await prisma.cashFlow.findFirst({
    where: {
      companyId,
      period: {
        lt: period,
      },
    },
    orderBy: { period: 'desc' },
  });
  
  // If no previous period, check balance sheet for initial cash
  let beginningCash = 0;
  if (mostRecentCashFlow) {
    beginningCash = Number(mostRecentCashFlow.endingCash || 0);
  } else {
    // Check if there's a balance sheet with cash before this period
    const previousBalanceSheet = await prisma.balanceSheet.findFirst({
      where: {
        companyId,
        period: {
          lt: period,
        },
      },
      orderBy: { period: 'desc' },
    });
    if (previousBalanceSheet) {
      beginningCash = Number(previousBalanceSheet.cashEquivalents || 0);
    }
  }
  
  // Check if cash flow already exists
  const existingCashFlow = await prisma.cashFlow.findUnique({
    where: {
      companyId_period: {
        companyId,
        period,
      },
    },
  });
  
  const cashFlow = existingCashFlow || await prisma.cashFlow.create({
    data: {
      companyId,
      period,
      beginningCash: new Decimal(beginningCash),
      endingCash: new Decimal(beginningCash),
      operatingCashFlow: new Decimal(0),
      investingCashFlow: new Decimal(0),
      financingCashFlow: new Decimal(0),
      netCashFlow: new Decimal(0),
    },
  });
  
  // If cash flow already existed, ensure beginning cash is correct
  if (existingCashFlow && Number(existingCashFlow.beginningCash || 0) !== beginningCash) {
    await prisma.cashFlow.update({
      where: { id: cashFlow.id },
      data: {
        beginningCash: new Decimal(beginningCash),
      },
    });
  }
  
  const updateData: any = {};
  
  // Operating Cash Flow: Revenue, Expenses (all categories), Cash receipts/payments
  if (type === 'revenue') {
    // Revenue increases operating cash flow
    updateData.operatingCashFlow = { increment: new Decimal(amount) };
  } else if (type === 'expense') {
    // All expenses decrease operating cash flow
    updateData.operatingCashFlow = { increment: new Decimal(-amount) };
  } else if (type === 'asset' && category === 'cash') {
    // Cash receipts increase operating cash flow
    updateData.operatingCashFlow = { increment: new Decimal(amount) };
  } else if (type === 'asset' && (category === 'equipment' || category === 'inventory')) {
    // Equipment and inventory purchases are investing activities
    updateData.investingCashFlow = { increment: new Decimal(-amount) };
  } else if (type === 'equity') {
    // Equity contributions are financing activities
    updateData.financingCashFlow = { increment: new Decimal(amount) };
  } else if (type === 'liability') {
    // Liability increases (borrowing) are financing activities, decreases (payments) are negative
    // For now, assume increases are positive financing
    if (category === 'short_term_debt' || category === 'long_term_debt') {
      updateData.financingCashFlow = { increment: new Decimal(amount) };
    } else if (category === 'accounts_payable') {
      // Paying accounts payable is operating (cash payment)
      updateData.operatingCashFlow = { increment: new Decimal(-amount) };
    }
  }
  
  if (Object.keys(updateData).length > 0) {
    await prisma.cashFlow.update({
      where: { id: cashFlow.id },
      data: updateData,
    });
    
    // Recalculate net cash flow and ending cash
    const updated = await prisma.cashFlow.findUnique({
      where: { id: cashFlow.id },
    });
    
    if (updated) {
      const operating = Number(updated.operatingCashFlow || 0);
      const investing = Number(updated.investingCashFlow || 0);
      const financing = Number(updated.financingCashFlow || 0);
      const netCashFlow = operating + investing + financing;
      const endingCash = Number(updated.beginningCash || 0) + netCashFlow;
      
      await prisma.cashFlow.update({
        where: { id: cashFlow.id },
        data: {
          netCashFlow: new Decimal(netCashFlow),
          endingCash: new Decimal(endingCash),
        },
      });
      
      // Sync ending cash with balance sheet cashEquivalents for this period
      const balanceSheet = await prisma.balanceSheet.findFirst({
        where: {
          companyId,
          period,
        },
      });
      
      if (balanceSheet) {
        await prisma.balanceSheet.update({
          where: { id: balanceSheet.id },
          data: {
            cashEquivalents: new Decimal(endingCash),
          },
        });
      } else {
        // Create balance sheet entry if it doesn't exist
        await prisma.balanceSheet.upsert({
          where: {
            companyId_period: {
              companyId,
              period,
            },
          },
          update: {
            cashEquivalents: new Decimal(endingCash),
          },
          create: {
            companyId,
            period,
            cashEquivalents: new Decimal(endingCash),
          },
        });
      }
      
      // Recalculate all subsequent periods' beginning cash
      await recalculateSubsequentCashFlows(companyId, period);
    }
  }
}

// Helper function to recalculate subsequent cash flows when a period is updated
async function recalculateSubsequentCashFlows(companyId: string, updatedPeriod: Date) {
  // Get all cash flows after the updated period, ordered by period
  const subsequentCashFlows = await prisma.cashFlow.findMany({
    where: {
      companyId,
      period: {
        gt: updatedPeriod,
      },
    },
    orderBy: { period: 'asc' },
  });
  
  // Get the ending cash from the updated period
  const updatedCashFlow = await prisma.cashFlow.findUnique({
    where: {
      companyId_period: {
        companyId,
        period: updatedPeriod,
      },
    },
  });
  
  if (!updatedCashFlow) return;
  
  let previousEndingCash = Number(updatedCashFlow.endingCash || 0);
  
  // Recalculate each subsequent period
  for (const cashFlow of subsequentCashFlows) {
    // Get current cash flow values
    const current = await prisma.cashFlow.findUnique({
      where: { id: cashFlow.id },
    });
    
    if (current) {
      const operating = Number(current.operatingCashFlow || 0);
      const investing = Number(current.investingCashFlow || 0);
      const financing = Number(current.financingCashFlow || 0);
      const netCashFlow = operating + investing + financing;
      const endingCash = previousEndingCash + netCashFlow;
      
      // Update beginning cash, net cash flow, and ending cash in a single update to avoid multiple queries
      await prisma.cashFlow.update({
        where: { id: cashFlow.id },
        data: {
          beginningCash: new Decimal(previousEndingCash),
          netCashFlow: new Decimal(netCashFlow),
          endingCash: new Decimal(endingCash),
        },
      });
      
      // Update balance sheet for this period
      const balanceSheet = await prisma.balanceSheet.findFirst({
        where: {
          companyId,
          period: cashFlow.period,
        },
      });
      
      if (balanceSheet) {
        await prisma.balanceSheet.update({
          where: { id: balanceSheet.id },
          data: {
            cashEquivalents: new Decimal(endingCash),
          },
        });
      }
      
      previousEndingCash = endingCash;
    }
  }
}
