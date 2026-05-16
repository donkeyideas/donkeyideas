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

    const tournaments = await prisma.gameTournamentSchedule.findMany({
      orderBy: [
        { active: 'desc' },
        { startDate: 'asc' },
      ],
    });

    return NextResponse.json({ tournaments });
  } catch (error: any) {
    console.error('Admin tournaments schedule GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch tournament schedules' } },
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
    const { name, type, entryFee, prizePool, marbleIds, startDate, endDate, recurring, config } = body;

    if (!name || !type || !startDate) {
      return NextResponse.json(
        { error: { message: 'name, type, and startDate are required' } },
        { status: 400 },
      );
    }

    const tournament = await prisma.gameTournamentSchedule.create({
      data: {
        name,
        type,
        entryFee: entryFee || 0,
        prizePool: prizePool || 0,
        marbleIds: marbleIds || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        recurring: recurring || null,
        config: config || null,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (error: any) {
    console.error('Admin tournaments schedule POST error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create tournament schedule' } },
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

    const existing = await prisma.gameTournamentSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Tournament schedule not found' } },
        { status: 404 },
      );
    }

    const updateData: any = {};
    if (fields.name !== undefined) updateData.name = fields.name;
    if (fields.type !== undefined) updateData.type = fields.type;
    if (fields.entryFee !== undefined) updateData.entryFee = fields.entryFee;
    if (fields.prizePool !== undefined) updateData.prizePool = fields.prizePool;
    if (fields.marbleIds !== undefined) updateData.marbleIds = fields.marbleIds;
    if (fields.startDate !== undefined) updateData.startDate = new Date(fields.startDate);
    if (fields.endDate !== undefined) updateData.endDate = fields.endDate ? new Date(fields.endDate) : null;
    if (fields.recurring !== undefined) updateData.recurring = fields.recurring;
    if (fields.active !== undefined) updateData.active = fields.active;
    if (fields.config !== undefined) updateData.config = fields.config;

    const tournament = await prisma.gameTournamentSchedule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ tournament });
  } catch (error: any) {
    console.error('Admin tournaments schedule PUT error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update tournament schedule' } },
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

    const existing = await prisma.gameTournamentSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Tournament schedule not found' } },
        { status: 404 },
      );
    }

    // Soft delete: deactivate instead of hard delete
    await prisma.gameTournamentSchedule.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin tournaments schedule DELETE error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to deactivate tournament schedule' } },
      { status: 500 },
    );
  }
}
