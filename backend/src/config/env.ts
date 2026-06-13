export type AppMode = "online" | "offline";

function parseMode(value: string | undefined): AppMode {
  if (value === "offline") return "offline";
  return "online";
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  mode: parseMode(process.env.MODE),
  databaseUrl: process.env.DATABASE_URL,
  sqliteDatabaseUrl: process.env.SQLITE_DATABASE_URL ?? "file:./data/school.db",
} as const;

export function validateEnv(): void {
  if (env.mode === "online" && !env.databaseUrl) {
    throw new Error("DATABASE_URL is required when MODE=online");
  }
}
