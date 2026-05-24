import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Force connection_limit=1 for serverless + Supabase Transaction Pooler.
// With a higher limit, prepared statements get stranded on recycled
// connections and queries fail with `prepared statement "sN" does not
// exist` under any meaningful concurrency. Overriding the URL value is
// intentional — env vars are easy to misconfigure, this guarantee isn't.
function getDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const stripped = url.replace(/([?&])connection_limit=\d+(&|$)/, (_, p1, p2) =>
    p2 === '&' ? p1 : '',
  );
  const cleaned = stripped.replace(/[?&]$/, '');
  const separator = cleaned.includes('?') ? '&' : '?';
  return `${cleaned}${separator}connection_limit=1`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: getDatasourceUrl(),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';


