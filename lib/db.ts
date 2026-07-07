import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

type PrismaGlobal = typeof globalThis & { prisma?: PrismaClient };

const globalForPrisma = globalThis as PrismaGlobal;

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

function isTransientDbError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code && TRANSIENT_CODES.has(code)) return true;

  const message = error instanceof Error ? error.message : "";
  return /can't reach database|timed out|connection.+(closed|reset|pool)|prepared statement|server has closed/i.test(
    message,
  );
}

export async function withDbRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isTransientDbError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }

  throw lastError;
}
