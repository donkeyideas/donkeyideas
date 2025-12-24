// Temporarily check Supabase for companies
const { PrismaClient } = require('@prisma/client');

// Create a Prisma client with Supabase connection
const prismaSupabase = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SUPABASE_DATABASE_URL || 'postgresql://postgres.ncjsexetlyzmgiqqdcpu:Seminole%211@db.ncjsexetlyzmgiqqdcpu.supabase.co:5432/postgres?sslmode=require'
    }
  }
});

async function checkSupabaseCompanies() {
  try {
    console.log('Attempting to connect to Supabase...\n');
    
    const companies = await prismaSupabase.company.findMany({
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
      take: 50, // Limit to 50 companies
    });

    console.log(`Found ${companies.length} companies in Supabase:\n`);
    
    if (companies.length === 0) {
      console.log('No companies found in Supabase database.');
    } else {
      companies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   Tagline: ${company.tagline || 'N/A'}`);
        console.log(`   Status: ${company.status}`);
        console.log(`   Created: ${company.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error connecting to Supabase:', error.message);
    console.error('\nThis might be because:');
    console.error('1. The Supabase database is paused or unavailable');
    console.error('2. Network/firewall issues');
    console.error('3. Connection string needs updating');
  } finally {
    await prismaSupabase.$disconnect();
  }
}

checkSupabaseCompanies();

