import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient as PostgresPrismaClient } from "../generated/prisma/client.js";
import { PrismaClient as SqlitePrismaClient } from "../generated/prisma-sqlite/client.js";
import { env } from "../config/env.js";

/** Shared API type — both schemas use the same models, so one client type is enough for routes. */
export type AppPrismaClient = PostgresPrismaClient;

let prisma: AppPrismaClient | null = null;

function createOnlineClient(): PostgresPrismaClient {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required when MODE=online");
  }

  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  return new PostgresPrismaClient({ adapter });
}

function createOfflineClient(): AppPrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: env.sqliteDatabaseUrl });
  return new SqlitePrismaClient({ adapter }) as AppPrismaClient;
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
