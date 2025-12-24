import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// DELETE /api/companies/:id/financials/statements
// Deletes all financial statements (P&L, Balance Sheet, Cash Flow) for a company
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
    
    // Delete all financial statements for this company
    await Promise.all([
      prisma.pLStatement.deleteMany({
        where: { companyId: params.id },
      }),
      prisma.balanceSheet.deleteMany({
        where: { companyId: params.id },
      }),
      prisma.cashFlow.deleteMany({
        where: { companyId: params.id },
      }),
    ]);
    
    return NextResponse.json({ 
      success: true,
      message: 'All financial statements deleted successfully' 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete financial statements' } },
      { status: 500 }
    );
  }
}

