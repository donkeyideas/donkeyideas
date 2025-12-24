import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().url().optional().nullable(),
  status: z.enum(['active', 'beta', 'paused', 'archived']).optional(),
});

// GET /api/companies/:id
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
    
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Ensure user owns the company
      },
    });
    
    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ company });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch company' } },
      { status: 500 }
    );
  }
}

// PUT /api/companies/:id
export async function PUT(
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
    
    const body = await request.json();
    const validated = updateCompanySchema.parse(body);
    
    // Check ownership
    const existing = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }
    
    const company = await prisma.company.update({
      where: { id: params.id },
      data: validated,
    });
    
    return NextResponse.json({ company });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update company' } },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/:id
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
    
    // Check ownership
    const existing = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }
    
    await prisma.company.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete company' } },
      { status: 500 }
    );
  }
}


