import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient as SqlitePrismaClient } from "../generated/prisma-sqlite/client.js";
import { env } from "../config/env.js";

/** Use SQLite client types — both schemas share the same models. Regenerate both with `npm run prisma:generate`. */
export type AppPrismaClient = SqlitePrismaClient;

let prisma: AppPrismaClient | null = null;

function createOnlineClient(): AppPrismaClient {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required when MODE=online");
  }

  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  // Cast needed since postgres client is not generated in offline-only setups
  return new SqlitePrismaClient({ adapter: adapter as never }) as unknown as AppPrismaClient;
}

function createOfflineClient(): AppPrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: env.sqliteDatabaseUrl });
  return new SqlitePrismaClient({ adapter });
}

export function initPrisma(): AppPrismaClient {
  if (prisma) return prisma;

  prisma = env.mode === "offline" ? createOfflineClient() : createOnlineClient();
  return prisma;
}

export function getPrisma(): AppPrismaClient {
  if (!prisma) {
    throw new Error("Database not initialized. Call initPrisma() before using getPrisma().");
  }     
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export function getDatabaseInfo() {
  return {
    mode: env.mode,
    provider: env.mode === "offline" ? "sqlite" : "postgresql",
    connection:
      env.mode === "offline" ? env.sqliteDatabaseUrl : (env.databaseUrl ?? "not configured"),
  };
}
