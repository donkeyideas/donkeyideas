import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { requireAdmin } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await requireAdmin(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
    }

    const configs = await prisma.gameConfig.findMany({ orderBy: { group: 'asc' } });

    return NextResponse.json({ config: configs });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch config' } },
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
    const admin = await requireAdmin(token);
    if (!admin) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: { message: 'key and value are required' } },
        { status: 400 },
      );
    }

    const config = await prisma.gameConfig.update({
      where: { key },
      data: {
        value: String(value),
        updatedBy: admin.id,
      },
    });

    return NextResponse.json({ config });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update config' } },
      { status: 500 },
    );
  }
}
