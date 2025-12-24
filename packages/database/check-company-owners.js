const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompanyOwners() {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(`\nFound ${companies.length} companies:\n`);
    
    companies.forEach((company, index) => {
      const owner = users.find(u => u.id === company.userId);
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   Owner: ${owner ? owner.email : 'Unknown user (ID: ' + company.userId + ')'}`);
      console.log(`   Company ID: ${company.id}`);
      console.log('');
    });

    console.log('\n📋 User Summary:');
    users.forEach((user, index) => {
      const userCompanies = companies.filter(c => c.userId === user.id);
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Owns ${userCompanies.length} companies`);
      console.log('');
    });

  } catch (error) {
    console.error('Error querying database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompanyOwners();

