import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/* ------------------------------------------------------------------ */
/*  Per-track custom background images.                                */
/*                                                                     */
/*  Stored as GameConfig rows with group='track-bg':                    */
/*    key   = courseId (e.g. "gen-1043", "grand-prix-cyber")            */
/*    value = HTTPS image URL hosted on a CDN                           */
/*    label = optional display label (e.g. "Pepsi - Iron Run sponsor")  */
/*                                                                     */
/*  The mobile app fetches the full map via GET /api/game-config and    */
/*  renders the URL as a tiled background when present.                 */
/* ------------------------------------------------------------------ */

const GROUP = 'track-bg';

/* Namespaced key prefix so a courseId can NEVER collide with a different
 * group's key (rewards, betting, limits, etc.). Previously the upsert
 * used the bare courseId as the key — an admin typing `daily_reward_1`
 * would silently overwrite the daily reward config with an image URL,
 * breaking the live economy. Now keys are stored as `track-bg:gen-1043`
 * and the courseId portion is what we expose to the client / mobile. */
const KEY_PREFIX = 'track-bg:';
const toKey = (courseId: string) => `${KEY_PREFIX}${courseId}`;
const fromKey = (key: string) =>
  key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : key;

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return await getUserByToken(token);
}

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const rows = await prisma.gameConfig.findMany({
      where: { group: GROUP },
      orderBy: { key: 'asc' },
    });

    const images = rows.map((r) => ({
      courseId: fromKey(r.key),
      imageUrl: r.value,
      label: r.label,
      updatedAt: r.updatedAt,
      updatedBy: r.updatedBy,
    }));

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error('track-bg-images GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch track bg images' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const body = await request.json();
    const courseId = String(body.courseId || '').trim();
    const imageUrl = String(body.imageUrl || '').trim();
    const label = String(body.label || '').trim();

    if (!courseId) {
      return NextResponse.json({ error: { message: 'courseId is required' } }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: { message: 'imageUrl is required' } }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(imageUrl)) {
      return NextResponse.json(
        { error: { message: 'imageUrl must start with http:// or https://' } },
        { status: 400 },
      );
    }

    const key = toKey(courseId);
    const row = await prisma.gameConfig.upsert({
      where: { key },
      create: {
        key,
        value: imageUrl,
        label: label || `Background for ${courseId}`,
        group: GROUP,
        updatedBy: user.id,
      },
      update: {
        value: imageUrl,
        label: label || `Background for ${courseId}`,
        group: GROUP,
        updatedBy: user.id,
      },
    });

    return NextResponse.json({
      image: {
        courseId: fromKey(row.key),
        imageUrl: row.value,
        label: row.label,
        updatedAt: row.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('track-bg-images POST error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to save track bg image' } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json(
        { error: { message: 'courseId query parameter is required' } },
        { status: 400 },
      );
    }

    const key = toKey(courseId);
    const existing = await prisma.gameConfig.findUnique({ where: { key } });
    if (!existing || existing.group !== GROUP) {
      return NextResponse.json(
        { error: { message: 'Track background not found' } },
        { status: 404 },
      );
    }

    await prisma.gameConfig.delete({ where: { key } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('track-bg-images DELETE error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete track bg image' } },
      { status: 500 },
    );
  }
}
