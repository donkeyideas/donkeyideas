import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { dispatchAnnouncement } from '@/lib/pushDispatch';

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

    const announcements = await prisma.gameAnnouncement.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ announcements });
  } catch (error: any) {
    console.error('Admin announcements GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch announcements' } },
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
    const { title, body: announcementBody, type, priority, startDate, endDate, targetSegment } = body;

    if (!title || !announcementBody) {
      return NextResponse.json(
        { error: { message: 'title and body are required' } },
        { status: 400 },
      );
    }

    const announcement = await prisma.gameAnnouncement.create({
      data: {
        title,
        body: announcementBody,
        type: type || 'info',
        priority: priority || 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        targetSegment: targetSegment || null,
        createdBy: user.id,
      },
    });

    // Fire push to every registered device in the background. We don't await
    // here so the operator's create request returns promptly; the dispatch
    // can take several seconds for large player bases.
    dispatchAnnouncement(announcement.id).catch((err) => {
      console.error(`Auto-dispatch failed for announcement ${announcement.id}:`, err);
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error: any) {
    console.error('Admin announcements POST error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create announcement' } },
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

    const existing = await prisma.gameAnnouncement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Announcement not found' } },
        { status: 404 },
      );
    }

    const updateData: any = {};
    if (fields.title !== undefined) updateData.title = fields.title;
    if (fields.body !== undefined) updateData.body = fields.body;
    if (fields.type !== undefined) updateData.type = fields.type;
    if (fields.priority !== undefined) updateData.priority = fields.priority;
    if (fields.active !== undefined) updateData.active = fields.active;
    if (fields.startDate !== undefined) updateData.startDate = new Date(fields.startDate);
    if (fields.endDate !== undefined) updateData.endDate = fields.endDate ? new Date(fields.endDate) : null;
    if (fields.targetSegment !== undefined) updateData.targetSegment = fields.targetSegment;

    const announcement = await prisma.gameAnnouncement.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error('Admin announcements PUT error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update announcement' } },
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

    const existing = await prisma.gameAnnouncement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Announcement not found' } },
        { status: 404 },
      );
    }

    await prisma.gameAnnouncement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin announcements DELETE error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete announcement' } },
      { status: 500 },
    );
  }
}
