import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.upsert({
    where: { email: 'demo@faceless-studio.local' },
    update: {},
    create: {
      email: 'demo@faceless-studio.local',
      passwordHash: 'set-via-auth-service',
      subscriptionTier: 'creator'
    }
  });

  await prisma.channel.upsert({
    where: { id: 'seed-channel' },
    update: {},
    create: {
      id: 'seed-channel',
      userId: demo.id,
      name: 'Demo Faceless Channel',
      niche: 'personal-finance',
      regionFocus: 'US',
      language: 'en',
      oauthConnected: false
    }
  });

  console.log('Seed completed for user:', demo.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
