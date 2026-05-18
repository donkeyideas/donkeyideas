import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

/**
 * Record a completed in-app session (foreground → background).
 *
 * The mobile app posts when AppState transitions away from 'active'. We
 * store durationSecs as the authoritative measure because clocks drift and
 * clients can fake startedAt independently; durationSecs is what the
 * dashboard reports.
 *
 * Body: { startedAt: string, endedAt: string, durationSecs: number,
 *         platform: 'ios' | 'android' }
 *
 * Sessions shorter than 2 seconds are rejected as noise (rapid background
 * cycles from system permission prompts, etc). Sessions longer than 4 hours
 * are clamped to 4 hours — typical mobile session caps from Localytics /
 * GA4 treat anything longer as the device sitting in the player's pocket
 * with the app accidentally foregrounded.
 */

const MIN_SECONDS = 2;
const MAX_SECONDS = 4 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const token = extractGameToken(request);
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const player = await getGamePlayerByToken(token);
    if (!player) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { startedAt, endedAt, durationSecs, platform } = body as {
      startedAt?: string;
      endedAt?: string;
      durationSecs?: number;
      platform?: string;
    };

    if (!startedAt || !endedAt || typeof durationSecs !== 'number') {
      return NextResponse.json(
        { error: { message: 'startedAt, endedAt, and durationSecs are required' } },
        { status: 400 },
      );
    }
    if (platform !== 'ios' && platform !== 'android' && platform !== 'web') {
      return NextResponse.json(
        { error: { message: 'platform must be ios, android, or web' } },
        { status: 400 },
      );
    }

    const startDate = new Date(startedAt);
    const endDate = new Date(endedAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: { message: 'Invalid date' } }, { status: 400 });
    }

    const duration = Math.max(0, Math.round(durationSecs));
    if (duration < MIN_SECONDS) {
      return NextResponse.json({ accepted: false, reason: 'too_short' });
    }
    const capped = Math.min(MAX_SECONDS, duration);

    await prisma.gameAppSession.create({
      data: {
        playerId: player.id,
        platform,
        durationSecs: capped,
        startedAt: startDate,
        endedAt: endDate,
      },
    });

    return NextResponse.json({ accepted: true });
  } catch (error: any) {
    console.error('App session post error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to record session' } },
      { status: 500 },
    );
  }
}
