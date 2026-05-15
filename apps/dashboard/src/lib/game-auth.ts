import { prisma } from '@donkey-ideas/database';
import { randomUUID } from 'crypto';

export async function getGamePlayerByToken(token: string) {
  const session = await prisma.gamePlayerSession.findUnique({
    where: { token },
    include: { player: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  if (session.player.status === 'banned') {
    return null;
  }

  return session.player;
}

export async function createGamePlayerSession(
  playerId: string,
  deviceId: string,
  platform: string,
) {
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30-day sessions for mobile

  await prisma.gamePlayerSession.create({
    data: { playerId, token, deviceId, platform, expiresAt },
  });

  return token;
}

/**
 * Helper to extract game player token from request.
 * Works with both cookie (via middleware bridge) and direct Bearer header.
 */
export function extractGameToken(request: Request): string | null {
  // Try cookie first (set by middleware's Bearer bridge)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/auth-token=([^;]+)/);
    if (match) return match[1];
  }

  // Fallback to direct header check
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}
