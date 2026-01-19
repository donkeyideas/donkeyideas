import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// DELETE /api/companies/:id/transactions/delete-all
// Efficiently delete ALL transactions, statements, and related data for a company
export async function DELETE(
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
    
    // Count transactions before deletion
    const transactionCount = await prisma.transaction.count({
      where: { companyId: params.id },
    });
    
    // Delete ALL data for this company in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all transactions (cascades handled by Prisma)
      const deletedTransactions = await tx.transaction.deleteMany({
        where: { companyId: params.id },
      });
      
      // 2. Delete all P&L statements
      const deletedPLs = await tx.pLStatement.deleteMany({
        where: { companyId: params.id },
      });
      
      // 3. Delete all balance sheets
      const deletedBalanceSheets = await tx.balanceSheet.deleteMany({
        where: { companyId: params.id },
      });
      
      // 4. Delete all cash flow statements
      const deletedCashFlows = await tx.cashFlow.deleteMany({
        where: { companyId: params.id },
      });
      
      return {
        transactions: deletedTransactions.count,
        plStatements: deletedPLs.count,
        balanceSheets: deletedBalanceSheets.count,
        cashFlows: deletedCashFlows.count,
      };
    });
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted all data for ${company.name}`,
      deleted: result,
      transactionCount,
    });
  } catch (error: any) {
    console.error('Failed to delete all company data:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete all company data' } },
      { status: 500 }
    );
  }
}
