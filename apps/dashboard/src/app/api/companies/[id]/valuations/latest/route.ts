import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get the latest valuation for this company
    const latestValuation = await prisma.valuation.findFirst({
      where: {
        companyId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestValuation) {
      return NextResponse.json(
        { error: { message: 'No valuation found for this company' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ valuation: latestValuation });
  } catch (error) {
    console.error('Error fetching latest valuation:', error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch latest valuation',
        },
      },
      { status: 500 }
    );
  }
}
