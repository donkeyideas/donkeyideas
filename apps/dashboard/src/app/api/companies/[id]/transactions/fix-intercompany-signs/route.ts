import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/companies/:id/transactions/fix-intercompany-signs
// Normalize intercompany transfer direction/signs based on description/category
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

    const intercompanyTransfers = await prisma.transaction.findMany({
      where: {
        companyId: params.id,
        type: { in: ['intercompany_transfer', 'intercompany'] },
      },
      orderBy: { date: 'asc' },
    });

    const getDirection = (description: string, category: string) => {
      const desc = description.toLowerCase();
      const cat = category.toLowerCase();
      const hasOutflow = desc.includes('outflow')
        || desc.includes('transfer out')
        || desc.includes('transfer to')
        || desc.includes('from chk')
        || desc.includes('to chk')
        || desc.includes('payment to')
        || desc.includes('paid to')
        || desc.includes('sent to')
        || desc.includes('wire to')
        || (desc.includes('transfer') && desc.includes(' to '))
        || cat.includes('transfer_out');
      const hasInflow = desc.includes('inflow')
        || desc.includes('transfer in')
        || desc.includes('transfer from')
        || desc.includes('payment from')
        || desc.includes('received from')
        || desc.includes('wire from')
        || (desc.includes('transfer') && desc.includes(' from '))
        || cat.includes('transfer_in');
      if (hasOutflow && !hasInflow) return 'outflow';
      if (hasInflow && !hasOutflow) return 'inflow';
      return 'unknown';
    };

    let updated = 0;
    let skipped = 0;
    const unresolved: Array<{ id: string; description: string | null; category: string | null; amount: number }> = [];

    for (const tx of intercompanyTransfers) {
      const description = String(tx.description || '');
      const category = String(tx.category || '');
      const direction = getDirection(description, category);
      if (direction === 'unknown') {
        skipped += 1;
        if (unresolved.length < 25) {
          unresolved.push({
            id: tx.id,
            description: tx.description,
            category: tx.category,
            amount: Number(tx.amount),
          });
        }
        continue;
      }

      const rawAmount = Number(tx.amount);
      const normalizedAmount = direction === 'outflow'
        ? (rawAmount > 0 ? -rawAmount : rawAmount)
        : (rawAmount < 0 ? Math.abs(rawAmount) : rawAmount);

      const normalizedCategory = direction === 'outflow' ? 'transfer_out' : 'transfer_in';

      const needsUpdate = normalizedAmount !== rawAmount
        || (category && category.toLowerCase() !== normalizedCategory);

      if (!needsUpdate) {
        skipped += 1;
        continue;
      }

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          amount: normalizedAmount,
          category: normalizedCategory,
        },
      });
      updated += 1;
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${intercompanyTransfers.length} intercompany transfers.`,
      processed: intercompanyTransfers.length,
      updated,
      skipped,
      unresolvedCount: intercompanyTransfers.length - updated - skipped,
      unresolved: unresolved.length ? unresolved : undefined,
    });
  } catch (error: any) {
    console.error('Failed to fix intercompany signs:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fix intercompany signs' } },
      { status: 500 }
    );
  }
}
