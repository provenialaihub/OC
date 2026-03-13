import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;

function makeClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const db = global.prisma ?? makeClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}
