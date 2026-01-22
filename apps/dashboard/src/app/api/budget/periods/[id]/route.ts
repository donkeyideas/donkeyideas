import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { calculateFinancials, Transaction as FinancialTransaction } from '@donkey-ideas/financial-engine';

// GET /api/budget/periods/[id] - Get single period with all lines
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const period = await prisma.budgetPeriod.findUnique({
      where: { id: params.id },
      include: {
        lines: {
          include: {
            category: true,
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    const priorTransactions = await prisma.transaction.findMany({
      where: {
        companyId: period.companyId,
        date: {
          lt: period.startDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const financialTransactions: FinancialTransaction[] = priorTransactions.map((tx) => ({
      id: tx.id,
      date: new Date(tx.date),
      type: tx.type as FinancialTransaction['type'],
      category: tx.category || 'Uncategorized',
      amount: Number(tx.amount),
      description: tx.description || undefined,
      affectsPL: tx.affectsPL ?? true,
      affectsCashFlow: tx.affectsCashFlow ?? true,
      affectsBalance: tx.affectsBalance ?? true,
    }));

    const openingStatements = calculateFinancials(financialTransactions, 0);

    return NextResponse.json({
      ...period,
      openingBalance: openingStatements.cashFlow.endingCash,
    });
  } catch (error) {
    console.error('Error fetching budget period:', error);
    return NextResponse.json({ error: 'Failed to fetch period' }, { status: 500 });
  }
}

// PUT /api/budget/periods/[id] - Update period
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, startDate, endDate, status } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status;

    const period = await prisma.budgetPeriod.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(period);
  } catch (error) {
    console.error('Error updating budget period:', error);
    return NextResponse.json({ error: 'Failed to update period' }, { status: 500 });
  }
}

// DELETE /api/budget/periods/[id] - Delete period and all lines
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete all lines first (cascade should handle this, but being explicit)
    await prisma.budgetLine.deleteMany({
      where: { periodId: params.id },
    });

    // Delete the period
    await prisma.budgetPeriod.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget period:', error);
    return NextResponse.json({ error: 'Failed to delete period' }, { status: 500 });
  }
}
