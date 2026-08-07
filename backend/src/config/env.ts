import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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

function toSqliteFileUrl(absolutePath: string): string {
  // encodeURI keeps drive letters and slashes; encodes spaces (School SmS → School%20SmS)
  return `file:${encodeURI(absolutePath.replace(/\\/g, "/"))}`;
}

/**
 * Desktop / installer sets SCHOOL_SMS_DATA_DIR to the install folder's `data` dir.
 * When present, DB + uploads MUST live there (ignore relative .env paths).
 */
function offlineSqliteUrl(): string {
  const dataRoot = process.env.SCHOOL_SMS_DATA_DIR?.trim();
  if (dataRoot) {
    return toSqliteFileUrl(resolve(dataRoot, "school.db"));
  }
  return process.env.SQLITE_DATABASE_URL ?? "file:./data/school.db";
}

function offlineUploadDir(): string {
  const dataRoot = process.env.SCHOOL_SMS_DATA_DIR?.trim();
  if (dataRoot) {
    return resolve(dataRoot, "uploads");
  }
  return process.env.UPLOAD_DIR ?? "./data/uploads";
}

function offlinePublicUploadBaseUrl(): string {
  if (process.env.PUBLIC_UPLOAD_BASE_URL?.trim()) {
    return process.env.PUBLIC_UPLOAD_BASE_URL.trim();
  }
  if (process.env.SCHOOL_SMS_DATA_DIR?.trim()) {
    return "http://127.0.0.1:5000/uploads";
  }
  return "http://localhost:5000/uploads";
}

// Absolute path to OpenWA's api-key file — resolved once at module load.
// OpenWA writes this file in its own data/ folder regardless of where it is started from.
const OPENWA_KEY_FILE_PATH = ((): string => {
  const cwd = process.cwd(); // = backend/
  const candidates = [
    resolve(cwd, "../OpenWA/data/.api-key"),
    resolve(cwd, "../Whatsapp/OpenWA/data/.api-key"),
    resolve(cwd, "../../OpenWA/data/.api-key"),
    resolve(cwd, "../../Whatsapp/OpenWA/data/.api-key"),
  ];
  return candidates.find((p) => existsSync(p)) ?? "";
})();

/**
 * Read the OpenWA API key fresh on every call.
 *
 * Priority:
 *   1. OPENWA_API_KEY in .env  (explicit pin — remove this line to go fully auto)
 *   2. The live key file at OpenWA/data/.api-key  (auto-sync, survives restarts)
 *
 * Reading from the file on every request means the backend NEVER needs restarting
 * after OpenWA regenerates its key — the next request will pick it up automatically.
 */
export function getOpenWaApiKey(): string {
  // Env var always wins when set
  const envKey = process.env.OPENWA_API_KEY?.trim();
  if (envKey) return envKey;

  // Live file read — fresh every call, so a key rotation is invisible
  if (OPENWA_KEY_FILE_PATH && existsSync(OPENWA_KEY_FILE_PATH)) {
    return readFileSync(OPENWA_KEY_FILE_PATH, "utf8").trim();
  }

  return "";
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  mode: parseMode(process.env.MODE),
  databaseUrl: process.env.DATABASE_URL,
  sqliteDatabaseUrl: offlineSqliteUrl(),
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  // File storage
  uploadDir: offlineUploadDir(),
  publicUploadBaseUrl: offlinePublicUploadBaseUrl(),
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 5,
  storageProvider: parseStorageProvider(process.env.STORAGE_PROVIDER),

  // S3 (online mode — optional until you configure)
  awsRegion: process.env.AWS_REGION ?? "",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",

  // OpenWA WhatsApp — URL only (key is read live via getOpenWaApiKey())
  openwaUrl: process.env.OPENWA_URL ?? "",
  // Legacy single-session fallback (used when schoolId is unavailable)
  openwaSessionId: process.env.OPENWA_SESSION_ID ?? "",
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
