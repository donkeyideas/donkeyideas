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

const getDirection = (description: string, category: string) => {
  const desc = description.toLowerCase();
  const cat = category.toLowerCase();
  const hasOutflow = desc.includes('outflow')
    || desc.includes('transfer out')
    || desc.includes('transfer to')
    || desc.includes('from chk')
    || desc.includes('to chk')
    || desc.includes('payment to')
    || desc.includes('paid to')
    || desc.includes('sent to')
    || desc.includes('wire to')
    || (desc.includes('transfer') && desc.includes(' to '))
    || cat.includes('transfer_out');
  const hasInflow = desc.includes('inflow')
    || desc.includes('transfer in')
    || desc.includes('transfer from')
    || desc.includes('payment from')
    || desc.includes('received from')
    || desc.includes('wire from')
    || (desc.includes('transfer') && desc.includes(' from '))
    || cat.includes('transfer_in');
  if (hasOutflow) return 'outflow';
  if (hasInflow) return 'inflow';
  return 'unknown';
};

/**
 * NUCLEAR INTERCOMPANY REBUILD
 * POST /api/companies/consolidated/nuclear-intercompany
 *
 * - Deletes all positive intercompany transfers (reset inbound mirrors)
 * - Normalizes all intercompany signs/categories by description hints
 * - Recreates missing inbound mirrors from outflow transactions
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

    const companyIds = companies.map((c) => c.id);
    const companyByName = new Map(companies.map((c) => [normalizeName(c.name), c]));

    const resetDeleted = await prisma.transaction.deleteMany({
      where: {
        companyId: { in: companyIds },
        type: { in: ['intercompany_transfer', 'intercompany'] },
        amount: { gt: 0 },
      },
    });

    const intercompanyTransfers = await prisma.transaction.findMany({
      where: {
        companyId: { in: companyIds },
        type: { in: ['intercompany_transfer', 'intercompany'] },
      },
      orderBy: { date: 'asc' },
    });

    let updated = 0;
    let unresolved = 0;
    let mirrorsCreated = 0;
    const unresolvedSamples: Array<{ id: string; description: string | null }> = [];

    for (const tx of intercompanyTransfers) {
      const description = String(tx.description || '');
      const category = String(tx.category || '');
      const direction = getDirection(description, category);
      const rawAmount = Number(tx.amount);
      const normalizedAmount = direction === 'outflow'
        ? (rawAmount > 0 ? -rawAmount : rawAmount)
        : direction === 'inflow'
          ? (rawAmount < 0 ? Math.abs(rawAmount) : rawAmount)
          : rawAmount;
      const normalizedCategory = direction === 'outflow' ? 'transfer_out' : direction === 'inflow' ? 'transfer_in' : category;

      const needsUpdate = normalizedAmount !== rawAmount
        || (normalizedCategory && category.toLowerCase() !== normalizedCategory.toLowerCase());

      if (needsUpdate) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: {
            amount: normalizedAmount,
            category: normalizedCategory,
          },
        });
        updated += 1;
      }
    }

    const outflows = await prisma.transaction.findMany({
      where: {
        companyId: { in: companyIds },
        type: { in: ['intercompany_transfer', 'intercompany'] },
        amount: { lt: 0 },
      },
      orderBy: { date: 'asc' },
    });

    for (const tx of outflows) {
      const description = String(tx.description || '');
      const targetRaw = extractTargetName(description);
      const targetCompany = companyByName.get(normalizeName(targetRaw));

      if (!targetCompany || targetCompany.id === tx.companyId) {
        unresolved += 1;
        if (unresolvedSamples.length < 25) {
          unresolvedSamples.push({ id: tx.id, description: tx.description });
        }
        continue;
      }

      const mirrorTag = `[NUCLEAR MIRROR ${tx.id}]`;
      const existing = await prisma.transaction.findFirst({
        where: {
          companyId: targetCompany.id,
          date: tx.date,
          amount: Math.abs(tx.amount),
          description: { contains: mirrorTag },
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      await prisma.transaction.create({
        data: {
          companyId: targetCompany.id,
          date: tx.date,
          type: 'intercompany_transfer',
          category: 'cash',
          amount: Math.abs(tx.amount),
          description: `Intercompany transfer from ${companies.find((c) => c.id === tx.companyId)?.name || 'Unknown'} ${mirrorTag}`,
          affectsPL: false,
          affectsCashFlow: true,
          affectsBalance: true,
        },
      });

      mirrorsCreated += 1;
    }

    return NextResponse.json({
      success: true,
      message: 'NUCLEAR INTERCOMPANY REBUILD COMPLETE',
      summary: {
        companiesProcessed: companies.length,
        resetDeleted: resetDeleted.count,
        signUpdates: updated,
        mirrorsCreated,
        unresolved,
      },
      unresolvedSamples: unresolvedSamples.length ? unresolvedSamples : undefined,
    });
  } catch (error: any) {
    console.error('❌ Nuclear intercompany rebuild failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rebuild intercompany data' },
      { status: 500 }
    );
  }
}
