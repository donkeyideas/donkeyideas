const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\nFound ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log('');
    });

    console.log('\n📝 Login Credentials:');
    console.log('Based on seed file, default admin credentials are:');
    console.log('  Email: admin@donkeyideas.com');
    console.log('  Password: Admin123!');
    console.log('\nOr try:');
    console.log('  Email: admin@example.com');
    console.log('  Password: (any password - dev mode will auto-create/update)');
    console.log('\n💡 Note: The auth system has dev-friendly behavior:');
    console.log('  - If user doesn\'t exist, it will create them with your password');
    console.log('  - If password is wrong, it will update to your password');
    console.log('  - So you can use ANY password for existing users in dev mode!');

  } catch (error) {
    console.error('Error querying database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

