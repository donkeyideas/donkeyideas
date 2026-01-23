import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/companies/:id/transactions/cleanup-duplicates
// Permanently removes duplicate intercompany transfer rows for a company
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

    const intercompanyTransactions = await prisma.transaction.findMany({
      where: {
        companyId: params.id,
        type: {
          in: ['intercompany_transfer', 'intercompany'],
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });

    const seen = new Set<string>();
    const duplicateIds: string[] = [];

    for (const tx of intercompanyTransactions) {
      const dateKey = new Date(tx.date).toISOString().split('T')[0];
      const rawType = String(tx.type || '').toLowerCase().trim();
      const category = String(tx.category || '').toLowerCase().trim();
      const description = String(tx.description || '').trim();
      const amount = Number(tx.amount);
      const key = `${dateKey}|${rawType}|${category}|${amount}|${description}`;

      if (seen.has(key)) {
        duplicateIds.push(tx.id);
        continue;
      }
      seen.add(key);
    }

    if (duplicateIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No duplicate intercompany transfers found',
        deleted: 0,
      });
    }

    const deleted = await prisma.transaction.deleteMany({
      where: { id: { in: duplicateIds } },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.count} duplicate intercompany transfers`,
      deleted: deleted.count,
    });
  } catch (error: any) {
    console.error('Failed to cleanup duplicate intercompany transfers:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to cleanup duplicates' } },
      { status: 500 }
    );
  }
}
