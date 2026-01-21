import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

// PUT /api/budget/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, type, accountCode, color, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (accountCode !== undefined) updateData.accountCode = accountCode;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.budgetCategory.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating budget category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE /api/budget/categories/[id] - Soft delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete by marking as inactive
    const category = await prisma.budgetCategory.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Error deleting budget category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
