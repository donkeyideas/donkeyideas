import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@donkey-ideas/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = 'info@donkeyideas.com';
  const adminPassword = 'Donkey2026!';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✓ Admin user already exists');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    return;
  }

  // Create admin user
  const passwordHash = await hashPassword(adminPassword);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Admin User',
      passwordHash,
    },
  });

  console.log('✓ Admin user created!');
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change this password after first login!');

  // Seed website content (as per scope document)
  const websiteContent = [
    {
      section: 'hero',
      content: {
        label: 'Innovation Laboratory / Venture Builder',
        headline: 'Transforming\nUnconventional\nIdeas Into\nIntelligent Systems',
        description:
          'We architect and deploy AI-powered products at the intersection of experimental thinking and production-grade engineering.',
        cta: {
          primary: { text: 'EXPLORE VENTURES', link: '#ventures' },
          secondary: { text: 'VIEW SERVICES', link: '#services' },
        },
      },
    },
    {
      section: 'about',
      content: {
        title: 'Who We Are',
        text: 'Donkey Ideas is an AI-powered innovation lab that transforms unconventional concepts into intelligent, production-grade systems.',
      },
    },
  ];

  for (const content of websiteContent) {
    await prisma.websiteContent.upsert({
      where: { section: content.section },
      update: { content: content.content as any },
      create: {
        section: content.section,
        content: content.content as any,
        published: true,
      },
    });
  }

  console.log('✓ Website content seeded');
  console.log('');
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

