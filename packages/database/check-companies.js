const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompanies() {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        tagline: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\nFound ${companies.length} companies:\n`);
    
    if (companies.length === 0) {
      console.log('No companies found in the database.');
    } else {
      companies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   Tagline: ${company.tagline || 'N/A'}`);
        console.log(`   Status: ${company.status}`);
        console.log(`   Created: ${company.createdAt}`);
        console.log('');
      });
    }

    // Also check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(`\nFound ${users.length} users:\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error querying database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompanies();

