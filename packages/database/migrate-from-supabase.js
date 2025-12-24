// Migration script to export data from Supabase and import into local SQLite
const { Client: PgClient } = require('pg');
const { PrismaClient } = require('@prisma/client');

// Temporarily disable SSL certificate validation for migration
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Get connection string from environment or use default
// You can also get this from Supabase Dashboard > Settings > Database > Connection string
const SUPABASE_CONNECTION_STRING = process.env.SUPABASE_DATABASE_URL || 
  'postgresql://postgres.ncjsexetlyzmgiqqdcpu:Seminole%211@db.ncjsexetlyzmgiqqdcpu.supabase.co:5432/postgres';

console.log('Using connection string:', SUPABASE_CONNECTION_STRING.replace(/:[^:@]+@/, ':****@'));

const supabaseClient = new PgClient({
  connectionString: SUPABASE_CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false
  }
});

const prisma = new PrismaClient();

// Helper to convert JSON to string for SQLite
function jsonToString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

async function migrateData() {
  try {
    console.log('Connecting to Supabase...\n');
    await supabaseClient.connect();
    console.log('✓ Connected to Supabase\n');

    // Start transaction for SQLite
    console.log('Starting migration...\n');

    // 1. Migrate Users
    console.log('1. Migrating Users...');
    const users = await supabaseClient.query('SELECT * FROM users ORDER BY "createdAt"');
    console.log(`   Found ${users.rows.length} users`);
    
    for (const user of users.rows) {
      try {
        await prisma.user.upsert({
          where: { id: user.id },
          update: {
            email: user.email,
            name: user.name,
            passwordHash: user.passwordHash,
            updatedAt: new Date(user.updatedAt),
          },
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.passwordHash,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
        });
      } catch (error) {
        console.error(`   Error migrating user ${user.email}:`, error.message);
      }
    }
    console.log('   ✓ Users migrated\n');

    // 2. Migrate User Settings
    console.log('2. Migrating User Settings...');
    const userSettings = await supabaseClient.query('SELECT * FROM user_settings');
    console.log(`   Found ${userSettings.rows.length} user settings`);
    
    for (const settings of userSettings.rows) {
      try {
        await prisma.userSettings.upsert({
          where: { id: settings.id },
          update: {
            deepSeekApiKey: settings.deepSeekApiKey,
            openaiApiKey: settings.openaiApiKey,
            anthropicApiKey: settings.anthropicApiKey,
            googleApiKey: settings.googleApiKey,
            stripeApiKey: settings.stripeApiKey,
            sendgridApiKey: settings.sendgridApiKey,
            twilioApiKey: settings.twilioApiKey,
            twilioApiSecret: settings.twilioApiSecret,
            updatedAt: new Date(settings.updatedAt),
          },
          create: {
            id: settings.id,
            userId: settings.userId,
            deepSeekApiKey: settings.deepSeekApiKey,
            openaiApiKey: settings.openaiApiKey,
            anthropicApiKey: settings.anthropicApiKey,
            googleApiKey: settings.googleApiKey,
            stripeApiKey: settings.stripeApiKey,
            sendgridApiKey: settings.sendgridApiKey,
            twilioApiKey: settings.twilioApiKey,
            twilioApiSecret: settings.twilioApiSecret,
            createdAt: new Date(settings.createdAt),
            updatedAt: new Date(settings.updatedAt),
          },
        });
      } catch (error) {
        console.error(`   Error migrating user settings ${settings.id}:`, error.message);
      }
    }
    console.log('   ✓ User Settings migrated\n');

    // 3. Migrate Sessions
    console.log('3. Migrating Sessions...');
    const sessions = await supabaseClient.query('SELECT * FROM sessions');
    console.log(`   Found ${sessions.rows.length} sessions`);
    
    for (const session of sessions.rows) {
      try {
        await prisma.session.upsert({
          where: { id: session.id },
          update: {
            token: session.token,
            expiresAt: new Date(session.expiresAt),
          },
          create: {
            id: session.id,
            userId: session.userId,
            token: session.token,
            expiresAt: new Date(session.expiresAt),
          },
        });
      } catch (error) {
        console.error(`   Error migrating session ${session.id}:`, error.message);
      }
    }
    console.log('   ✓ Sessions migrated\n');

    // 4. Migrate Companies
    console.log('4. Migrating Companies...');
    const companies = await supabaseClient.query('SELECT * FROM companies ORDER BY "createdAt"');
    console.log(`   Found ${companies.rows.length} companies`);
    
    const companyList = [];
    for (const company of companies.rows) {
      try {
        await prisma.company.upsert({
          where: { id: company.id },
          update: {
            name: company.name,
            tagline: company.tagline,
            description: company.description,
            logo: company.logo,
            status: company.status,
            updatedAt: new Date(company["updatedAt"]),
          },
          create: {
            id: company.id,
            userId: company.userId,
            name: company.name,
            tagline: company.tagline,
            description: company.description,
            logo: company.logo,
            status: company.status,
            createdAt: new Date(company.createdAt),
            updatedAt: new Date(company["updatedAt"]),
          },
        });
        companyList.push({ id: company.id, name: company.name });
      } catch (error) {
        console.error(`   Error migrating company ${company.name}:`, error.message);
      }
    }
    console.log('   ✓ Companies migrated');
    console.log('   Companies:');
    companyList.forEach((c, i) => console.log(`     ${i + 1}. ${c.name} (${c.id})`));
    console.log('');

    // 5. Migrate Transactions
    console.log('5. Migrating Transactions...');
    const transactions = await supabaseClient.query('SELECT * FROM transactions ORDER BY date');
    console.log(`   Found ${transactions.rows.length} transactions`);
    
    let transactionCount = 0;
    for (const tx of transactions.rows) {
      try {
        await prisma.transaction.upsert({
          where: { id: tx.id },
          update: {
            date: new Date(tx.date),
            type: tx.type,
            category: tx.category,
            amount: tx.amount.toString(),
            description: tx.description,
            affectsPL: tx["affectsPL"],
            affectsBalance: tx["affectsBalance"],
            affectsCashFlow: tx["affectsCashFlow"],
            updatedAt: new Date(tx["updatedAt"]),
          },
          create: {
            id: tx.id,
            companyId: tx.companyId,
            date: new Date(tx.date),
            type: tx.type,
            category: tx.category,
            amount: tx.amount.toString(),
            description: tx.description,
            affectsPL: tx["affectsPL"],
            affectsBalance: tx["affectsBalance"],
            affectsCashFlow: tx["affectsCashFlow"],
            createdAt: new Date(tx.createdAt),
            updatedAt: new Date(tx["updatedAt"]),
          },
        });
        transactionCount++;
      } catch (error) {
        console.error(`   Error migrating transaction ${tx.id}:`, error.message);
      }
    }
    console.log(`   ✓ ${transactionCount} transactions migrated\n`);

    // 6. Migrate Business Profiles
    console.log('6. Migrating Business Profiles...');
    const profiles = await supabaseClient.query('SELECT * FROM business_profiles');
    console.log(`   Found ${profiles.rows.length} business profiles`);
    
    for (const profile of profiles.rows) {
      try {
        await prisma.businessProfile.upsert({
          where: { id: profile.id },
          update: {
            mission: profile.mission,
            about: profile.about,
            targetMarket: profile["targetMarket"],
            competitiveAdvantage: profile["competitiveAdvantage"],
            keyCompetitors: profile["keyCompetitors"],
            totalCustomers: profile["totalCustomers"],
            monthlyRevenue: profile["monthlyRevenue"] ? profile["monthlyRevenue"].toString() : null,
            momGrowth: profile["momGrowth"] ? profile["momGrowth"].toString() : null,
            retentionRate: profile["retentionRate"] ? profile["retentionRate"].toString() : null,
            teamSize: profile["teamSize"],
            totalFunding: profile["totalFunding"] ? profile["totalFunding"].toString() : null,
            keyAchievements: profile["keyAchievements"],
            projectStatus: profile["projectStatus"],
            updatedAt: new Date(profile["updatedAt"]),
          },
          create: {
            id: profile.id,
            companyId: profile["companyId"],
            mission: profile.mission,
            about: profile.about,
            targetMarket: profile["targetMarket"],
            competitiveAdvantage: profile["competitiveAdvantage"],
            keyCompetitors: profile["keyCompetitors"],
            totalCustomers: profile["totalCustomers"],
            monthlyRevenue: profile["monthlyRevenue"] ? profile["monthlyRevenue"].toString() : null,
            momGrowth: profile["momGrowth"] ? profile["momGrowth"].toString() : null,
            retentionRate: profile["retentionRate"] ? profile["retentionRate"].toString() : null,
            teamSize: profile["teamSize"],
            totalFunding: profile["totalFunding"] ? profile["totalFunding"].toString() : null,
            keyAchievements: profile["keyAchievements"],
            projectStatus: profile["projectStatus"],
            createdAt: new Date(profile["createdAt"]),
            updatedAt: new Date(profile["updatedAt"]),
          },
        });
      } catch (error) {
        console.error(`   Error migrating business profile ${profile.id}:`, error.message);
      }
    }
    console.log('   ✓ Business Profiles migrated\n');

    // 7. Migrate Valuations
    console.log('7. Migrating Valuations...');
    const valuations = await supabaseClient.query('SELECT * FROM valuations');
    console.log(`   Found ${valuations.rows.length} valuations`);
    
    for (const val of valuations.rows) {
      try {
        await prisma.valuation.upsert({
          where: { id: val.id },
          update: {
            method: val.method,
            amount: val.amount.toString(),
            score: val.score,
            parameters: jsonToString(val.parameters),
            createdAt: new Date(val["createdAt"]),
          },
          create: {
            id: val.id,
            companyId: val["companyId"],
            method: val.method,
            amount: val.amount.toString(),
            score: val.score,
            parameters: jsonToString(val.parameters),
            createdAt: new Date(val["createdAt"]),
          },
        });
      } catch (error) {
        console.error(`   Error migrating valuation ${val.id}:`, error.message);
      }
    }
    console.log('   ✓ Valuations migrated\n');

    // 8. Migrate Boards, Columns, Cards
    console.log('8. Migrating Boards, Columns, and Cards...');
    const boards = await supabaseClient.query('SELECT * FROM boards');
    console.log(`   Found ${boards.rows.length} boards`);
    
    for (const board of boards.rows) {
      try {
        await prisma.board.upsert({
          where: { id: board.id },
          update: {
            name: board.name,
          },
          create: {
            id: board.id,
            companyId: board["companyId"],
            name: board.name,
            createdAt: new Date(board["createdAt"]),
          },
        });

        // Migrate columns for this board
        const columns = await supabaseClient.query(
          'SELECT * FROM columns WHERE "boardId" = $1 ORDER BY position',
          [board.id]
        );
        
        for (const column of columns.rows) {
          try {
            await prisma.column.upsert({
              where: { id: column.id },
              update: {
                name: column.name,
                position: column.position,
              },
              create: {
                id: column.id,
                boardId: column["boardId"],
                name: column.name,
                position: column.position,
              },
            });

            // Migrate cards for this column
            const cards = await supabaseClient.query(
              'SELECT * FROM cards WHERE "columnId" = $1 ORDER BY position',
              [column.id]
            );
            
            for (const card of cards.rows) {
              try {
                await prisma.card.upsert({
                  where: { id: card.id },
                  update: {
                    title: card.title,
                    description: card.description,
                    position: card.position,
                    tags: jsonToString(card.tags),
                  },
                  create: {
                    id: card.id,
                    columnId: card["columnId"],
                    title: card.title,
                    description: card.description,
                    position: card.position,
                    tags: jsonToString(card.tags),
                    createdAt: new Date(card["createdAt"]),
                  },
                });
              } catch (error) {
                console.error(`     Error migrating card ${card.id}:`, error.message);
              }
            }
          } catch (error) {
            console.error(`   Error migrating column ${column.id}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`   Error migrating board ${board.id}:`, error.message);
      }
    }
    console.log('   ✓ Boards, Columns, and Cards migrated\n');

    // 9. Migrate Team Members
    console.log('9. Migrating Team Members...');
    const teamMembers = await supabaseClient.query('SELECT * FROM team_members');
    console.log(`   Found ${teamMembers.rows.length} team members`);
    
    for (const member of teamMembers.rows) {
      try {
        await prisma.teamMember.upsert({
          where: { id: member.id },
          update: {
            userId: member["userId"],
            email: member.email,
            role: member.role,
            permissions: jsonToString(member.permissions),
            status: member.status,
            invitedBy: member["invitedBy"],
          },
          create: {
            id: member.id,
            companyId: member["companyId"],
            userId: member["userId"],
            email: member.email,
            role: member.role,
            permissions: jsonToString(member.permissions),
            status: member.status,
            invitedBy: member["invitedBy"],
            createdAt: new Date(member["createdAt"]),
          },
        });
      } catch (error) {
        console.error(`   Error migrating team member ${member.id}:`, error.message);
      }
    }
    console.log('   ✓ Team Members migrated\n');

    // 10. Migrate Chats and Chat Messages
    console.log('10. Migrating Chats and Messages...');
    const chats = await supabaseClient.query('SELECT * FROM chats');
    console.log(`   Found ${chats.rows.length} chats`);
    
    for (const chat of chats.rows) {
      try {
        await prisma.chat.upsert({
          where: { id: chat.id },
          update: {
            name: chat.name,
            updatedAt: new Date(chat["updatedAt"]),
          },
          create: {
            id: chat.id,
            userId: chat["userId"],
            name: chat.name,
            createdAt: new Date(chat["createdAt"]),
            updatedAt: new Date(chat["updatedAt"]),
          },
        });

        // Migrate messages for this chat
        const messages = await supabaseClient.query(
          'SELECT * FROM chat_messages WHERE "chatId" = $1 ORDER BY "createdAt"',
          [chat.id]
        );
        
        for (const message of messages.rows) {
          try {
            await prisma.chatMessage.upsert({
              where: { id: message.id },
              update: {
                role: message.role,
                content: message.content,
              },
              create: {
                id: message.id,
                chatId: message["chatId"],
                role: message.role,
                content: message.content,
                createdAt: new Date(message["createdAt"]),
              },
            });
          } catch (error) {
            console.error(`     Error migrating message ${message.id}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`   Error migrating chat ${chat.id}:`, error.message);
      }
    }
    console.log('   ✓ Chats and Messages migrated\n');

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Summary:');
    console.log(`  - Users: ${users.rows.length}`);
    console.log(`  - Companies: ${companies.rows.length}`);
    console.log(`  - Transactions: ${transactionCount}`);
    console.log(`  - Business Profiles: ${profiles.rows.length}`);
    console.log(`  - Valuations: ${valuations.rows.length}`);
    console.log(`  - Boards: ${boards.rows.length}`);
    console.log(`  - Team Members: ${teamMembers.rows.length}`);
    console.log(`  - Chats: ${chats.rows.length}\n`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      console.error('\nCannot connect to Supabase. Please check:');
      console.error('1. Is your Supabase database active? (Free tier databases pause after inactivity)');
      console.error('2. Is the connection string correct?');
      console.error('3. Are there any network/firewall issues?');
      console.error('\nTo reactivate your Supabase database:');
      console.error('1. Go to https://supabase.com/dashboard');
      console.error('2. Select your project');
      console.error('3. Go to Settings > Database');
      console.error('4. Click "Resume" if the database is paused');
    } else if (error.code === '28P01') {
      console.error('\nPassword authentication failed. Please:');
      console.error('1. Go to https://supabase.com/dashboard/project/ncjsexetlyzmgiqqdcpu');
      console.error('2. Go to Settings > Database');
      console.error('3. Copy the connection string (URI format)');
      console.error('4. Set it as SUPABASE_DATABASE_URL environment variable:');
      console.error('   $env:SUPABASE_DATABASE_URL="your-connection-string-here"');
      console.error('5. Run the migration again');
    }
    process.exit(1);
  } finally {
    await supabaseClient.end();
    await prisma.$disconnect();
    // Re-enable SSL verification
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  }
}

// Run migration
migrateData();
