// Lazy Prisma client. Imported only by API routes that need persistence.
// The client is instantiated on first use, so pure engine tests do not need a live database.

import { PrismaClient, type PrismaClient as PrismaClientType } from '@prisma/client';

declare global {
  var __facelessPrisma: PrismaClientType | undefined;
}

export function getPrisma(): PrismaClientType | null {
  if (typeof globalThis === 'undefined') return null;
  if (globalThis.__facelessPrisma) return globalThis.__facelessPrisma;
  try {
    const client = new PrismaClient();
    globalThis.__facelessPrisma = client;
    return client;
  } catch {
    return null;
  }
}
