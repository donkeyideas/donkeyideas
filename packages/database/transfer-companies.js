const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function transferCompanies() {
  try {
    // Get the target user (admin@donkeyideas.com)
    const targetUser = await prisma.user.findUnique({
      where: { email: 'admin@donkeyideas.com' },
    });

    if (!targetUser) {
      console.error('Target user admin@donkeyideas.com not found!');
      process.exit(1);
    }

    console.log(`\nTransferring all companies to: ${targetUser.email} (${targetUser.name})\n`);

    // Get all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
      },
    });

    console.log(`Found ${companies.length} companies to transfer\n`);

    let transferred = 0;
    for (const company of companies) {
      if (company.userId !== targetUser.id) {
        await prisma.company.update({
          where: { id: company.id },
          data: { userId: targetUser.id },
        });
        console.log(`✓ Transferred: ${company.name}`);
        transferred++;
      } else {
        console.log(`- Already owned: ${company.name}`);
      }
    }

    console.log(`\n✅ Transfer complete! ${transferred} companies transferred.`);
    console.log(`\nNow all ${companies.length} companies belong to admin@donkeyideas.com`);
    console.log('\nLogin with:');
    console.log('  Email: admin@donkeyideas.com');
    console.log('  Password: Admin123! (or any password in dev mode)');

  } catch (error) {
    console.error('Error transferring companies:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

transferCompanies();

