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

    const dedupeIntercompany = (transactions: typeof dbTransactions) => {
      const seen = new Set<string>();
      return transactions.filter((tx) => {
        const rawType = String(tx.type || '').toLowerCase().trim();
        if (rawType !== 'intercompany_transfer' && rawType !== 'intercompany') {
          return true;
        }

        const dateKey = new Date(tx.date).toISOString().split('T')[0];
        const category = String(tx.category || '').toLowerCase().trim();
        const description = String(tx.description || '').trim();
        const amount = Number(tx.amount);
        const key = `${dateKey}|${rawType}|${category}|${amount}|${description}`;

        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    };

    const dedupedTransactions = dedupeIntercompany(dbTransactions);
    
    const normalizeIntercompany = (tx: typeof dbTransactions[number]): Transaction[] => {
      const rawType = String(tx.type || '').toLowerCase().trim();
      if (rawType !== 'intercompany_transfer' && rawType !== 'intercompany') {
        return [{
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
        }];
      }

      const rawAmount = Number(tx.amount);
      const description = String(tx.description || '').toLowerCase();
      const category = String(tx.category || '').toLowerCase();
      const hasOutflow = description.includes('outflow') ||
        description.includes('transfer out') ||
        (description.includes('transfer') && description.includes(' to ')) ||
        category.includes('transfer_out');
      const hasInflow = description.includes('inflow') ||
        description.includes('transfer in') ||
        (description.includes('transfer') && description.includes(' from ')) ||
        category.includes('transfer_in');
      const amount = hasOutflow && rawAmount > 0
        ? -rawAmount
        : hasInflow && rawAmount < 0
          ? Math.abs(rawAmount)
          : rawAmount;
      if (!amount) {
        return [];
      }

      const base = {
        id: tx.id,
        date: new Date(tx.date),
        description: tx.description || undefined,
        affectsPL: false,
        affectsBalance: true,
      };

      if (amount < 0) {
        // Transfer out: cash decreases, intercompany receivable increases.
        return [
          {
            ...base,
            type: 'asset',
            category: 'cash',
            amount,
            affectsCashFlow: true,
          },
          {
            ...base,
            type: 'asset',
            category: 'intercompany_receivable',
            amount: Math.abs(amount),
            affectsCashFlow: false,
          },
        ];
      }

      // Transfer in: cash increases, intercompany payable increases.
      return [
        {
          ...base,
          type: 'asset',
          category: 'cash',
          amount,
          affectsCashFlow: true,
        },
        {
          ...base,
          type: 'liability',
          category: 'intercompany_payable',
          amount: Math.abs(amount),
          affectsCashFlow: false,
        },
      ];
    };

    // Transform to engine format (normalize intercompany transfers)
    const transactions: Transaction[] = dedupedTransactions.flatMap(normalizeIntercompany);
    
    // Calculate financials using clean engine
    const statements = calculateFinancials(transactions, 0);
    
    // Add company metadata
    const response = {
      companyId: company.id,
      companyName: company.name,
      transactionCount: dedupedTransactions.length,
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
