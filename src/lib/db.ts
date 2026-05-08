// Lazy Prisma client. Imported only by API routes that need persistence.
// Falls back to a local-no-op client if Prisma is unavailable at build time
// so that pure engine tests can run without a live database.

import type { PrismaClient } from '@prisma/client';

declare global {

  var __facelessPrisma: PrismaClient | undefined;
}

export function getPrisma(): PrismaClient | null {
  if (typeof globalThis === 'undefined') return null;
  if (globalThis.__facelessPrisma) return globalThis.__facelessPrisma;
  try {

    const mod = require('@prisma/client');
    const client = new mod.PrismaClient();
    globalThis.__facelessPrisma = client;
    return client;
  } catch {
    return null;
  }
}
