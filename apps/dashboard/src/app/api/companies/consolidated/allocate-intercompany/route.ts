import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const normalizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\bllc\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const extractTargetName = (description: string) => {
  const bracketMatches = [...description.matchAll(/\[[^\]]*?\bto\s+([^\]]+)\]/gi)];
  if (bracketMatches.length > 0) {
    return bracketMatches[bracketMatches.length - 1][1].trim();
  }

  const companyBeforeBracket = description.match(/;\s*([^;\[]+)\s*\[/i);
  if (companyBeforeBracket?.[1]) {
    return companyBeforeBracket[1].trim();
  }

  const genericMatch = description.match(/\bto\s+(.+?)(?:;|\[|$)/i);
  return genericMatch?.[1]?.trim() || '';
};

/**
 * ALLOCATE INTERCOMPANY TRANSFERS
 * POST /api/companies/consolidated/allocate-intercompany
 *
 * Creates mirrored inflow transactions for the recipient company based on
 * existing intercompany outflows.
 */
export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    });

    const companyByNormalizedName = new Map(
      companies.map((c) => [normalizeName(c.name), c])
    );

    const outflows = await prisma.transaction.findMany({
      where: {
        companyId: { in: companies.map((c) => c.id) },
        type: { in: ['intercompany_transfer', 'intercompany'] },
        amount: { lt: 0 },
      },
      orderBy: { date: 'asc' },
    });

    let created = 0;
    let skipped = 0;
    const missingTargets: Array<{ sourceId: string; description: string }> = [];

    for (const tx of outflows) {
      const description = String(tx.description || '');
      const txAmount = Number(tx.amount);
      const targetRaw = extractTargetName(description);
      const targetNormalized = normalizeName(targetRaw);
      const targetCompany = companyByNormalizedName.get(targetNormalized);

      if (!targetCompany || targetCompany.id === tx.companyId) {
        missingTargets.push({ sourceId: tx.id, description });
        continue;
      }

      const mirrorTag = `[AUTO MIRROR ${tx.id}]`;
      const existing = await prisma.transaction.findFirst({
        where: {
          companyId: targetCompany.id,
          date: tx.date,
          amount: Math.abs(txAmount),
          description: { contains: mirrorTag },
        },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.transaction.create({
        data: {
          companyId: targetCompany.id,
          date: tx.date,
          type: 'intercompany_transfer',
          category: 'cash',
          amount: Math.abs(txAmount),
          description: `Intercompany transfer from ${companies.find((c) => c.id === tx.companyId)?.name || 'Unknown'} ${mirrorTag}`,
          affectsPL: false,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      });

      created += 1;
    }

    return NextResponse.json({
      success: true,
      message: 'Intercompany allocations completed',
      summary: {
        outflowsProcessed: outflows.length,
        mirroredCreated: created,
        mirroredSkipped: skipped,
        missingTargets: missingTargets.length,
      },
      missingTargets: missingTargets.slice(0, 50),
    });
  } catch (error: any) {
    console.error('❌ Failed to allocate intercompany transfers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to allocate intercompany transfers' },
      { status: 500 }
    );
  }
}
