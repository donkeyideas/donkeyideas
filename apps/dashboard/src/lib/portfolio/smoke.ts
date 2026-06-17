// Read-only smoke test: runs collect + score against the live DB for the owner
// and prints the result. No DeepSeek call, no DB writes. Run with:
//   $env:DATABASE_URL="<pooler url>"; npx tsx src/lib/portfolio/smoke.ts
import { prisma } from '@donkey-ideas/database';
import { collectMetrics } from './collect';
import { scoreProject, detectQuietlyBroken, countZones, rankProjects } from './score';

async function main() {
  const email = process.env.PORTFOLIO_OWNER_EMAIL || 'info@donkeyideas.com';
  const owner = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (!owner) {
    console.error(`No owner user found for ${email}`);
    process.exit(1);
  }
  const companyCount = await prisma.company.count({ where: { userId: owner.id } });
  console.log(`Owner: ${owner.email}  (${companyCount} companies in DB)\n`);

  const { metrics, beaconsReachable, beaconsTotal } = await collectMetrics(owner.id);
  const scored = rankProjects(metrics.map(scoreProject));
  const broken = detectQuietlyBroken(scored);
  const zones = countZones(scored);

  console.log(`Beacons reachable: ${beaconsReachable}/${beaconsTotal}\n`);
  console.log('RANKED:');
  for (const s of scored) {
    console.log(
      `  ${s.displayName.padEnd(22)} ${s.archetype.padEnd(16)} T=${String(s.traction).padStart(3)} L=${String(s.leverage).padStart(3)}  ${s.zone.padEnd(20)} src=${s.metrics.source}`,
    );
  }
  console.log(`\nZones: ${JSON.stringify(zones)}`);
  console.log(`\nQuietly broken (${broken.length}):`);
  for (const b of broken) console.log(`  - ${b.title}`);
  console.log('\nNotes per product:');
  for (const m of metrics) {
    if (m.notes.length) console.log(`  ${m.displayName}: ${m.notes.join(' | ')}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('SMOKE FAILED:', e?.message || e);
  process.exit(1);
});
