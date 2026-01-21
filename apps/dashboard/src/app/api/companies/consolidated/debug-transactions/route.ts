import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * DEBUG ENDPOINT - List all transactions across all companies
 * GET /api/companies/consolidated/debug-transactions
 */
export async function GET(request: NextRequest) {
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
    
    // Get all companies
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    });
    
    // Get all transactions for all companies
    const allTransactions = await Promise.all(
      companies.map(async (company) => {
        const transactions = await prisma.transaction.findMany({
          where: { companyId: company.id },
          orderBy: { date: 'desc' },
        });
        
        return {
          companyId: company.id,
          companyName: company.name,
          transactionCount: transactions.length,
          transactions: transactions.map(tx => ({
            id: tx.id,
            date: tx.date,
            type: tx.type,
            category: tx.category,
            amount: tx.amount,
            description: tx.description,
            affectsPL: tx.affectsPL,
            affectsCashFlow: tx.affectsCashFlow,
            affectsBalance: tx.affectsBalance,
          })),
        };
      })
    );
    
    const totalTransactions = allTransactions.reduce((sum, c) => sum + c.transactionCount, 0);
    
    return NextResponse.json({
      totalCompanies: companies.length,
      totalTransactions,
      companiesWithTransactions: allTransactions.filter(c => c.transactionCount > 0).length,
      data: allTransactions.filter(c => c.transactionCount > 0), // Only show companies with transactions
    });
  } catch (error: any) {
    console.error('Failed to get debug transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve transactions' },
      { status: 500 }
    );
  }
}

/**
 * DELETE ALL transactions across all companies
 * DELETE /api/companies/consolidated/debug-transactions
 */
export async function DELETE(request: NextRequest) {
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
    
    // Get all companies
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    
    const companyIds = companies.map(c => c.id);
    
    // Delete ALL transactions, balance sheets, cash flows, and P&L statements for all companies
    const [deletedTransactions, deletedBalanceSheets, deletedCashFlows, deletedPL] = await Promise.all([
      prisma.transaction.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.balanceSheet.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.cashFlow.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.pLStatement.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
    ]);
    
    return NextResponse.json({
      message: 'All financial data deleted successfully across all companies',
      deletedTransactions: deletedTransactions.count,
      deletedBalanceSheets: deletedBalanceSheets.count,
      deletedCashFlows: deletedCashFlows.count,
      deletedPLStatements: deletedPL.count,
      companiesAffected: companies.length,
    });
  } catch (error: any) {
    console.error('Failed to delete all transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete transactions' },
      { status: 500 }
    );
  }
}
