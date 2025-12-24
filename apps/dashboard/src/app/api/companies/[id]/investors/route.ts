import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const inviteInvestorSchema = z.object({
  email: z.string().email(),
  accessLevel: z.enum(['read_only', 'metrics_only']).default('read_only'),
  investment: z.string().optional(),
});

// GET /api/companies/:id/investors
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
    
    const investors = await prisma.investorAccess.findMany({
      where: { companyId: params.id },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json({ investors });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch investors' } },
      { status: 500 }
    );
  }
}

// POST /api/companies/:id/investors/invite
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
    
    const body = await request.json();
    const validated = inviteInvestorSchema.parse(body);
    
    // Check if already invited
    const existing = await prisma.investorAccess.findUnique({
      where: {
        companyId_email: {
          companyId: params.id,
          email: validated.email,
        },
      },
    });
    
    if (existing) {
      return NextResponse.json(
        { error: { message: 'Investor already invited' } },
        { status: 409 }
      );
    }
    
    const investor = await prisma.investorAccess.create({
      data: {
        companyId: params.id,
        email: validated.email,
        accessLevel: validated.accessLevel,
        investment: validated.investment,
        status: 'pending',
      },
    });
    
    // In production, send invitation email here
    
    return NextResponse.json({ investor }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to invite investor' } },
      { status: 500 }
    );
  }
}


