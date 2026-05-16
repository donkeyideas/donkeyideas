import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

/* ------------------------------------------------------------------ */
/*  Public endpoint — no cookie auth. Game sends its playerId param.  */
/* ------------------------------------------------------------------ */

interface Variant {
  id: string;
  name: string;
  weight: number;
}

function pickVariant(variants: Variant[]): string {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const variant of variants) {
    rand -= variant.weight;
    if (rand <= 0) {
      return variant.id;
    }
  }

  // Fallback to last variant
  return variants[variants.length - 1].id;
}

export async function GET(request: NextRequest) {
  try {
    const playerId = request.nextUrl.searchParams.get('playerId');
    if (!playerId) {
      return NextResponse.json({ assignments: [] });
    }

    // Find all running tests
    const runningTests = await prisma.gameABTest.findMany({
      where: { status: 'running' },
      include: {
        assignments: {
          where: { playerId },
        },
      },
    });

    const assignments: { testId: string; testName: string; variant: string }[] = [];

    for (const test of runningTests) {
      const existing = test.assignments[0];

      if (existing) {
        // Player already assigned
        assignments.push({
          testId: test.id,
          testName: test.name,
          variant: existing.variant,
        });
      } else {
        // Assign player to a variant based on weights
        const variants = test.variants as unknown as Variant[];
        const chosenVariant = pickVariant(variants);

        await prisma.gameABTestAssignment.create({
          data: {
            testId: test.id,
            playerId,
            variant: chosenVariant,
          },
        });

        assignments.push({
          testId: test.id,
          testName: test.name,
          variant: chosenVariant,
        });
      }
    }

    return NextResponse.json({ assignments });
  } catch (error: any) {
    // On error, return empty array so the game never breaks
    return NextResponse.json({ assignments: [] });
  }
}
