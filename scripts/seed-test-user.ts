import { PrismaClient, UserRole } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local file manually
const envPath = join(process.cwd(), '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.error('Could not load .env.local file:', error);
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test user...');

  const testUser = await prisma.user.upsert({
    where: { whopUserId: 'test_user_local' },
    update: {},
    create: {
      whopUserId: 'test_user_local',
      email: 'test@comvault.local',
      name: 'Test User',
      role: UserRole.ADMIN,
    },
  });

  console.log('Test user created:', testUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
