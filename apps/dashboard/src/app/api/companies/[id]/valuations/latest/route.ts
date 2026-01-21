import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';

// GET /api/companies/:id/valuations/latest
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
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
        id: resolvedParams.id,
        userId: user.id,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }
    
    // Get latest valuation
    const latestValuation = await prisma.valuation.findFirst({
      where: {
        companyId: resolvedParams.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(latestValuation);
  } catch (error) {
    console.error('Error fetching latest valuation:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch valuation' } },
      { status: 500 }
    );
  }
}
