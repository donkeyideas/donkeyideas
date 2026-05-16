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

    const promos = await prisma.gamePromo.findMany({
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ promos });
  } catch (error: any) {
    console.error('Admin promos GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch promos' } },
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
    const { name, type, multiplier, config, startDate, endDate } = body;

    if (!name || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: { message: 'name, type, startDate, and endDate are required' } },
        { status: 400 },
      );
    }

    const promo = await prisma.gamePromo.create({
      data: {
        name,
        type,
        multiplier: multiplier || 1.0,
        config: config || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy: user.id,
      },
    });

    return NextResponse.json({ promo }, { status: 201 });
  } catch (error: any) {
    console.error('Admin promos POST error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create promo' } },
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
        { error: { message: 'id is required' } },
        { status: 400 },
      );
    }

    const existing = await prisma.gamePromo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Promo not found' } },
        { status: 404 },
      );
    }

    const updateData: any = {};
    if (fields.name !== undefined) updateData.name = fields.name;
    if (fields.type !== undefined) updateData.type = fields.type;
    if (fields.multiplier !== undefined) updateData.multiplier = fields.multiplier;
    if (fields.config !== undefined) updateData.config = fields.config;
    if (fields.active !== undefined) updateData.active = fields.active;
    if (fields.startDate !== undefined) updateData.startDate = new Date(fields.startDate);
    if (fields.endDate !== undefined) updateData.endDate = new Date(fields.endDate);

    const promo = await prisma.gamePromo.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ promo });
  } catch (error: any) {
    console.error('Admin promos PUT error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update promo' } },
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
        { error: { message: 'id query parameter is required' } },
        { status: 400 },
      );
    }

    const existing = await prisma.gamePromo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Promo not found' } },
        { status: 404 },
      );
    }

    await prisma.gamePromo.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin promos DELETE error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete promo' } },
      { status: 500 },
    );
  }
}
