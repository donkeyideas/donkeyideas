const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWebsiteContent() {
  try {
    const content = await prisma.websiteContent.findMany({
      orderBy: { section: 'asc' },
    });

    console.log(`\nFound ${content.length} website content sections:\n`);
    
    if (content.length === 0) {
      console.log('No website content found in database.');
      console.log('The homepage uses default content defined in /home/page.tsx');
    } else {
      content.forEach((item, index) => {
        console.log(`${index + 1}. Section: ${item.section}`);
        console.log(`   Published: ${item.published}`);
        console.log(`   Updated: ${new Date(item.updatedAt).toLocaleString()}`);
        console.log(`   Content keys: ${Object.keys(item.content || {}).join(', ')}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error querying database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWebsiteContent();


