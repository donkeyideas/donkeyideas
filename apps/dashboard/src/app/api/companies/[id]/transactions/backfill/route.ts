import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Decimal } from '@prisma/client/runtime/library';

// POST /api/companies/:id/transactions/backfill
// This endpoint attempts to create Transaction records from P&L data
// for transactions that were added before the Transaction model existed
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
    
    // Get all P&L statements
    const plStatements = await prisma.pLStatement.findMany({
      where: { companyId: params.id },
      orderBy: { period: 'desc' },
    });
    
    const createdTransactions: any[] = [];
    const errors: string[] = [];
    
    // For each P&L statement, check if we need to create transactions
    for (const pl of plStatements) {
      const period = new Date(pl.period);
      const periodEnd = new Date(period.getFullYear(), period.getMonth() + 1, 0); // Last day of month
      
      // Check existing transactions for this period
      const existingTransactions = await prisma.transaction.findMany({
        where: {
          companyId: params.id,
          date: {
            gte: period,
            lte: periodEnd,
          },
        },
      });
      
      const existingTotal = existingTransactions.reduce((sum: number, t: any) => {
        if (t.type === 'expense') {
          return sum + Number(t.amount);
        }
        return sum;
      }, 0);
      
      // Calculate total expenses from P&L
      const plTotalExpenses = 
        Number(pl.directCosts) +
        Number(pl.infrastructureCosts) +
        Number(pl.salesMarketing) +
        Number(pl.rdExpenses) +
        Number(pl.adminExpenses);
      
      // If P&L has expenses but no transactions match, create a placeholder
      if (plTotalExpenses > 0 && Math.abs(plTotalExpenses - existingTotal) > 0.01) {
        const missingAmount = plTotalExpenses - existingTotal;
        
        // Try to determine category from which expense line item has the difference
        let category = 'admin'; // default
        if (Number(pl.adminExpenses) > 0) category = 'admin';
        else if (Number(pl.salesMarketing) > 0) category = 'sales_marketing';
        else if (Number(pl.infrastructureCosts) > 0) category = 'infrastructure';
        else if (Number(pl.directCosts) > 0) category = 'direct_costs';
        else if (Number(pl.rdExpenses) > 0) category = 'rd';
        
        try {
          const transaction = await prisma.transaction.create({
            data: {
              companyId: params.id,
              date: periodEnd, // Use last day of period
              type: 'expense',
              category: category,
              amount: new Decimal(missingAmount),
              description: `Backfilled transaction from P&L for ${period.toLocaleDateString()}`,
              affectsPL: true,
              affectsBalance: true,
              affectsCashFlow: true,
            },
          });
          
          createdTransactions.push({
            id: transaction.id,
            date: transaction.date,
            amount: transaction.amount.toString(),
            category: category,
          });
        } catch (error: any) {
          errors.push(`Failed to create transaction for period ${period.toLocaleDateString()}: ${error.message}`);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      created: createdTransactions.length,
      transactions: createdTransactions,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to backfill transactions' } },
      { status: 500 }
    );
  }
}

