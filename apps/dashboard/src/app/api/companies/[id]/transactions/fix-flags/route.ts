import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/companies/:id/transactions/fix-flags - Fix affectsPL and affectsCashFlow flags for existing transactions
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
    
    // Get all transactions for this company
    const transactions = await prisma.transaction.findMany({
      where: { companyId: params.id },
    });
    
    let updatedCount = 0;
    
    // Update each transaction with correct flags
    for (const tx of transactions) {
      const updates: any = {};
      
      // Revenue and Expense transactions should affect P&L by default
      if ((tx.type === 'revenue' || tx.type === 'expense') && tx.affectsPL === false) {
        updates.affectsPL = true;
        updatedCount++;
      }
      
      // Revenue and Expense transactions should affect Cash Flow by default
      if ((tx.type === 'revenue' || tx.type === 'expense') && tx.affectsCashFlow === false) {
        updates.affectsCashFlow = true;
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: updates,
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Fixed ${updatedCount} transactions`,
      totalTransactions: transactions.length,
      updatedCount,
    });
  } catch (error: any) {
    console.error('Failed to fix transaction flags:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fix transaction flags' } },
      { status: 500 }
    );
  }
}
