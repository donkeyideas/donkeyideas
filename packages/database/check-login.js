const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogin() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    console.log('\n=== Login Credentials ===\n');
    
    if (users.length === 0) {
      console.log('No users found in database.');
      console.log('\nIn development mode, you can use ANY email/password.');
      console.log('The system will automatically create the user on first login.');
      console.log('\nRecommended:');
      console.log('  Email: info@donkeyideas.com');
      console.log('  Password: (any password)');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
      
      console.log('⚠️  IMPORTANT:');
      console.log('In development mode, the system has DEV-FRIENDLY behavior:');
      console.log('  - You can use ANY email/password combination');
      console.log('  - If user doesn\'t exist, it will be created');
      console.log('  - If password is wrong, it will be updated to match');
      console.log('');
      console.log('Recommended login:');
      console.log('  Email: info@donkeyideas.com');
      console.log('  Password: (any password you want)');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogin();


