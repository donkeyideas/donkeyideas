import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { Decimal } from '@prisma/client/runtime/library';

// PUT /api/budget/lines/[id] - Update single line
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { amount, notes } = body;

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = new Decimal(amount);
    if (notes !== undefined) updateData.notes = notes;

    const line = await prisma.budgetLine.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(line);
  } catch (error) {
    console.error('Error updating budget line:', error);
    return NextResponse.json({ error: 'Failed to update line' }, { status: 500 });
  }
}

// DELETE /api/budget/lines/[id] - Delete single line
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.budgetLine.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget line:', error);
    return NextResponse.json({ error: 'Failed to delete line' }, { status: 500 });
  }
}
