import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const inviteTeamMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

// GET /api/companies/:id/team
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
    
    const teamMembers = await prisma.teamMember.findMany({
      where: { companyId: params.id },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json({ teamMembers });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch team members' } },
      { status: 500 }
    );
  }
}

// POST /api/companies/:id/team/invite
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
    const validated = inviteTeamMemberSchema.parse(body);
    
    // Check if already invited
    const existing = await prisma.teamMember.findUnique({
      where: {
        companyId_email: {
          companyId: params.id,
          email: validated.email,
        },
      },
    });
    
    if (existing) {
      return NextResponse.json(
        { error: { message: 'User already invited' } },
        { status: 409 }
      );
    }
    
    const teamMember = await prisma.teamMember.create({
      data: {
        companyId: params.id,
        email: validated.email,
        role: validated.role,
        invitedBy: user.id,
        status: 'pending',
        permissions: {},
      },
    });
    
    // In production, send invitation email here
    
    return NextResponse.json({ teamMember }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to invite team member' } },
      { status: 500 }
    );
  }
}

