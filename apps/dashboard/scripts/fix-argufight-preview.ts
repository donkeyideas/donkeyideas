/**
 * Updates ArguFight venture to include websiteUrl for live iframe preview.
 *
 * Usage:
 *   export DATABASE_URL="your-database-url"
 *   npx tsx apps/dashboard/scripts/fix-argufight-preview.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const record = await prisma.websiteContent.findFirst({
    where: { section: 'ventures-page' },
  });

  if (!record || !record.content) {
    console.error('No ventures-page content found in database.');
    process.exit(1);
  }

  const content: any =
    typeof record.content === 'string'
      ? JSON.parse(record.content)
      : record.content;

  const ventures: any[] = content.ventures || content.sections || [];

  console.log(`Found ${ventures.length} ventures:\n`);
  ventures.forEach((v: any, i: number) => {
    console.log(`  ${i}: "${v.title}" — websiteUrl: ${v.websiteUrl || '(none)'}`);
  });

  // Find ArguFight venture (case-insensitive match on title)
  const arguIndex = ventures.findIndex(
    (v: any) => v.title && v.title.toLowerCase().includes('argufight')
  );

  if (arguIndex === -1) {
    console.error('\nCould not find an ArguFight venture. Listing all titles:');
    ventures.forEach((v: any, i: number) => console.log(`  ${i}: ${v.title}`));
    process.exit(1);
  }

  ventures[arguIndex].websiteUrl = 'https://www.argufight.com/';
  console.log(`\nUpdated venture #${arguIndex} ("${ventures[arguIndex].title}") with websiteUrl: https://www.argufight.com/`);

  // Save back
  if (content.ventures) {
    content.ventures = ventures;
  } else {
    content.sections = ventures;
  }

  await prisma.websiteContent.update({
    where: { id: record.id },
    data: { content: content as any },
  });

  console.log('Database updated successfully!');
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
