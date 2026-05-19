import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const tests = await prisma.gameABTest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    const result = tests.map((test) => ({
      ...test,
      enrolledCount: test._count.assignments,
      _count: undefined,
    }));

    return NextResponse.json({ tests: result });
  } catch (error: any) {
    console.error('AB tests GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch A/B tests' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, variants, targetMetric, trafficPct } = body;

    if (!name || !variants || !targetMetric) {
      return NextResponse.json(
        { error: { message: 'Missing required fields: name, variants, targetMetric' } },
        { status: 400 },
      );
    }

    const test = await prisma.gameABTest.create({
      data: {
        name,
        description: description || null,
        variants,
        targetMetric,
        trafficPct: trafficPct ?? 100,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error: any) {
    console.error('AB tests POST error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create A/B test' } },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: { message: 'Missing required field: id' } },
        { status: 400 },
      );
    }

    // Fetch current test to check status transitions
    const existing = await prisma.gameABTest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'A/B test not found' } },
        { status: 404 },
      );
    }

    // Explicit field whitelist — mirrors the pattern in announcements/route.ts
    // PUT so that callers can't inject arbitrary columns (e.g. createdBy,
    // createdAt, id) via spread. The schema field for the variant payload is
    // `variants` (JSON), not variantA/variantB — both halves live in one
    // JSON column.
    const updateData: any = {};
    if (fields.name !== undefined) updateData.name = fields.name;
    if (fields.description !== undefined) updateData.description = fields.description;
    if (fields.variants !== undefined) updateData.variants = fields.variants;
    if (fields.targetMetric !== undefined) updateData.targetMetric = fields.targetMetric;
    if (fields.trafficPct !== undefined) updateData.trafficPct = fields.trafficPct;
    if (fields.status !== undefined) updateData.status = fields.status;
    if (fields.startDate !== undefined) {
      updateData.startDate = fields.startDate ? new Date(fields.startDate) : null;
    }
    if (fields.endDate !== undefined) {
      updateData.endDate = fields.endDate ? new Date(fields.endDate) : null;
    }
    if (fields.results !== undefined) updateData.results = fields.results;

    // Handle status transition side effects
    if (fields.status === 'running' && existing.status !== 'running') {
      if (!existing.startDate && !fields.startDate) {
        updateData.startDate = new Date();
      }
    }

    if (fields.status === 'completed' && existing.status !== 'completed') {
      if (!existing.endDate && !fields.endDate) {
        updateData.endDate = new Date();
      }
    }

    const test = await prisma.gameABTest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ test });
  } catch (error: any) {
    console.error('AB tests PUT error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update A/B test' } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: { message: 'Missing required query param: id' } },
        { status: 400 },
      );
    }

    // Cascade delete is handled by the Prisma schema relation (onDelete: Cascade)
    await prisma.gameABTest.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('AB tests DELETE error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: { message: 'A/B test not found' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete A/B test' } },
      { status: 500 },
    );
  }
}
