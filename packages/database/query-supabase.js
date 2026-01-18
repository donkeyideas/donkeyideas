// Query Supabase directly using pg library
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ncjsexetlyzmgiqqdcpu:Seminole%211@db.ncjsexetlyzmgiqqdcpu.supabase.co:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function querySupabase() {
  try {
    await client.connect();
    console.log('Connected to Supabase\n');

    const result = await client.query(`
      SELECT id, name, tagline, status, "createdAt"
      FROM companies
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);

    console.log(`Found ${result.rows.length} companies in Supabase:\n`);
    
    if (result.rows.length === 0) {
      console.log('No companies found.');
    } else {
      result.rows.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   Tagline: ${company.tagline || 'N/A'}`);
        console.log(`   Status: ${company.status}`);
        console.log(`   Created: ${new Date(company.createdAt).toLocaleString()}`);
        console.log('');
      });
    }

    // Also check users
    const userResult = await client.query(`
      SELECT id, email, name, "createdAt"
      FROM users
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    console.log(`\nFound ${userResult.rows.length} users:\n`);
    userResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error querying Supabase:', error.message);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('\nCannot connect to Supabase. The database might be:');
      console.error('1. Paused (free tier Supabase databases pause after inactivity)');
      console.error('2. Network/firewall blocked');
      console.error('3. Connection string incorrect');
    }
  } finally {
    await client.end();
  }
}

querySupabase();


