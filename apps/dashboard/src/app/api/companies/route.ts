import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  tagline: z.string().optional(),
  description: z.string().optional(),
});

// GET /api/companies - List user's companies
export async function GET(request: NextRequest) {
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
    
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return NextResponse.json({ companies });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch companies' } },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create new company
export async function POST(request: NextRequest) {
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
    const validated = createCompanySchema.parse(body);
    
    const company = await prisma.company.create({
      data: {
        userId: user.id,
        name: validated.name,
        tagline: validated.tagline,
        description: validated.description,
      },
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return NextResponse.json({ company }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create company' } },
      { status: 500 }
    );
  }
}


