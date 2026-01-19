import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { calculateFinancials, Transaction } from '@donkey-ideas/financial-engine';

/**
 * NEW CLEAN ENDPOINT
 * GET /api/companies/:id/financials/calculate
 * 
 * Uses the clean financial engine to calculate statements from transactions
 * No more database writes to balance sheets/cash flows
 * Everything calculated on-demand from transactions
 */
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
    
    // Get query params for month filter
    const { searchParams } = new URL(request.url);
    const monthFilter = searchParams.get('month'); // Format: YYYY-MM
    
    // Build date filter if month is provided
    let dateFilter: any = {};
    if (monthFilter) {
      const [year, month] = monthFilter.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }
    
    // Fetch transactions from database (single source of truth)
    const dbTransactions = await prisma.transaction.findMany({
      where: {
        companyId: params.id,
        ...dateFilter,
      },
      orderBy: { date: 'asc' },
    });
    
    // Transform to engine format
    const transactions: Transaction[] = dbTransactions.map(tx => ({
      id: tx.id,
      date: new Date(tx.date),
      type: tx.type as any,
      category: tx.category || 'Uncategorized',
      amount: Number(tx.amount),
      description: tx.description || undefined,
      // Use nullish coalescing to default to true if null/undefined
      affectsPL: tx.affectsPL ?? true,
      affectsCashFlow: tx.affectsCashFlow ?? true,
      affectsBalance: tx.affectsBalance ?? true,
    }));
    
    // Calculate financials using clean engine
    const statements = calculateFinancials(transactions, 0);
    
    // Add company metadata
    const response = {
      companyId: company.id,
      companyName: company.name,
      transactionCount: transactions.length,
      ...statements,
    };
    
    // If not valid, include errors in response
    if (!statements.isValid) {
      console.warn(`[${company.name}] Financial statements invalid:`, statements.errors);
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Failed to calculate financials:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to calculate financials' } },
      { status: 500 }
    );
  }
}
