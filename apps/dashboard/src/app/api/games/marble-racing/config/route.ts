import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

export async function GET(_request: NextRequest) {
  try {
    const configs = await prisma.gameConfig.findMany();

    const grouped = configs.reduce(
      (acc, c) => {
        if (!acc[c.group]) acc[c.group] = {};
        acc[c.group][c.key] = c.value;
        return acc;
      },
      {} as Record<string, Record<string, string>>,
    );

    return NextResponse.json({ config: grouped });
  } catch (error: any) {
    console.error('Game config error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch config' } },
      { status: 500 },
    );
  }
}
