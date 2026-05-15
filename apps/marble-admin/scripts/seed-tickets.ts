import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get our test player
  const player = await prisma.gamePlayer.findFirst();
  if (!player) {
    console.error('No player found — seed a player first');
    process.exit(1);
  }

  console.log(`Using player: ${player.playerName} (${player.id})`);

  const tickets = [
    {
      ticketNumber: 'TKT-0001',
      playerId: player.id,
      playerName: player.playerName,
      playerEmail: player.email,
      platform: player.platform,
      subject: 'Coins not received after purchase',
      category: 'purchase',
      priority: 'urgent',
      status: 'open',
      messages: [
        {
          authorName: player.playerName,
          authorType: 'player',
          content: 'I purchased the Popular Pack (6,000 coins) for $4.99 but my coin balance did not increase. The charge went through on my card. Please help!',
        },
      ],
    },
    {
      ticketNumber: 'TKT-0002',
      playerId: player.id,
      playerName: player.playerName,
      playerEmail: player.email,
      platform: player.platform,
      subject: 'App crashes during race on Volcano Rush',
      category: 'bug',
      priority: 'high',
      status: 'open',
      messages: [
        {
          authorName: player.playerName,
          authorType: 'player',
          content: 'Every time I race on Volcano Rush the app crashes about halfway through. This has happened 3 times. I am on Android 14, Pixel 8.',
        },
      ],
    },
    {
      ticketNumber: 'TKT-0003',
      playerId: player.id,
      playerName: player.playerName,
      playerEmail: player.email,
      platform: player.platform,
      subject: 'How do I change my display name?',
      category: 'account',
      priority: 'low',
      status: 'pending',
      messages: [
        {
          authorName: player.playerName,
          authorType: 'player',
          content: 'I want to change my name from "Kuban" to something else. Where is the setting for this?',
        },
        {
          authorName: 'Admin',
          authorType: 'admin',
          content: 'Hi! Currently display name changes are not available in the app settings. We can change it for you from our end. What would you like your new name to be?',
        },
      ],
    },
    {
      ticketNumber: 'TKT-0004',
      playerId: player.id,
      playerName: player.playerName,
      playerEmail: player.email,
      platform: player.platform,
      subject: 'Request refund for accidental purchase',
      category: 'refund',
      priority: 'high',
      status: 'open',
      messages: [
        {
          authorName: player.playerName,
          authorType: 'player',
          content: 'My kid accidentally purchased the Whale Pack ($24.99) while playing. I did not authorize this purchase. Please refund it.',
        },
      ],
    },
    {
      ticketNumber: 'TKT-0005',
      playerId: player.id,
      playerName: player.playerName,
      playerEmail: player.email,
      platform: player.platform,
      subject: 'Season pass rewards not unlocking',
      category: 'bug',
      priority: 'low',
      status: 'resolved',
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      resolution: 'Fixed — rewards granted manually',
      messages: [
        {
          authorName: player.playerName,
          authorType: 'player',
          content: 'I reached level 5 on my season pass but the 500 coin reward did not unlock.',
        },
        {
          authorName: 'Admin',
          authorType: 'admin',
          content: 'Thanks for reporting this. We found a sync issue with pass rewards. I have manually added 500 coins to your account. The underlying bug is being fixed in the next update.',
        },
        {
          authorName: player.playerName,
          authorType: 'player',
          content: 'Got the coins, thanks for the quick fix!',
        },
      ],
    },
  ];

  for (const t of tickets) {
    const { messages, ...ticketData } = t;
    const ticket = await prisma.supportTicket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {},
      create: ticketData,
    });

    // Check if messages already exist
    const existingMsgCount = await prisma.ticketMessage.count({ where: { ticketId: ticket.id } });
    if (existingMsgCount === 0) {
      for (let i = 0; i < messages.length; i++) {
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            authorName: messages[i].authorName,
            authorType: messages[i].authorType,
            content: messages[i].content,
            createdAt: new Date(Date.now() - (messages.length - i) * 3600000), // stagger by 1h
          },
        });
      }
    }

    console.log(`  ✓ ${t.ticketNumber} [${t.status}] ${t.subject}`);
  }

  console.log(`\nDone! Seeded ${tickets.length} support tickets.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
