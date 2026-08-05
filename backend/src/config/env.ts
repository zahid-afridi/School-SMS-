export type AppMode = "online" | "offline";
export type StorageProvider = "local" | "s3";

function parseMode(value: string | undefined): AppMode {
  if (value === "offline") return "offline";
  return "online";
}

function parseStorageProvider(value: string | undefined): StorageProvider {
  if (value === "s3") return "s3";
  return "local";
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  mode: parseMode(process.env.MODE),
  databaseUrl: process.env.DATABASE_URL,
  sqliteDatabaseUrl: process.env.SQLITE_DATABASE_URL ?? "file:./data/school.db",
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  // File storage
  uploadDir: process.env.UPLOAD_DIR ?? "./data/uploads",
  publicUploadBaseUrl: process.env.PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000/uploads",
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 5,
  storageProvider: parseStorageProvider(process.env.STORAGE_PROVIDER),

  // S3 (online mode — optional until you configure)
  awsRegion: process.env.AWS_REGION ?? "",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",

  // OpenWA WhatsApp gateway defaults (optional — school can override in UI)
  openwaUrl: process.env.OPENWA_URL ?? "",
  openwaApiKey: process.env.OPENWA_API_KEY ?? "",
} as const;

export function validateEnv(): void {
  if (env.mode === "online" && !env.databaseUrl) {
    throw new Error("DATABASE_URL is required when MODE=online");
  }

  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  if (env.mode === "online" && env.storageProvider === "s3") {
    if (!env.awsS3Bucket || !env.awsRegion) {
      throw new Error("AWS_S3_BUCKET and AWS_REGION are required when STORAGE_PROVIDER=s3");
    }
  }
}

/** Offline mode always uses local disk. Online mode uses memory → S3. */
export function isOfflineStorage(): boolean {
  return env.mode === "offline";
}
