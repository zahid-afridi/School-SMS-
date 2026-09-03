import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env, isOfflineStorage } from "../config/env.js";
import { HttpStatus } from "../constants/httpStatus.js";
import { ApiMessages } from "../constants/messages.js";
import { AppError } from "../utils/AppError.js";

export interface SavedFile {
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
}

const FOLDERS = {
  image: "images",
  file: "files",
} as const;

// ─── Public API (same functions for offline & online) ───────────────────────

export function initStorage(): void {
  if (isOfflineStorage()) {
    fs.mkdirSync(env.uploadDir, { recursive: true });
  }
}

export function getStorageInfo() {
  return {
    mode: env.mode,
    provider: isOfflineStorage() ? "local-disk" : env.storageProvider,
    uploadDir: isOfflineStorage() ? getUploadRoot() : null,
  };
}

export function getPublicFileUrl(storageKey: string): string {
  const key = storageKey.replace(/\\/g, "/");
  return `${env.publicUploadBaseUrl}/${key}`;
}

export async function uploadImage(
  file: Express.Multer.File,
  schoolId: string
): Promise<SavedFile> {
  return saveFile(file, FOLDERS.image, schoolId);
}
// hello haroon hello
export async function uploadMultipleImages(
  files: Express.Multer.File[],
  schoolId: string
): Promise<SavedFile[]> {
  return Promise.all(files.map((file) => saveFile(file, FOLDERS.image, schoolId)));
}

export async function uploadFile(
  file: Express.Multer.File,
  schoolId: string
): Promise<SavedFile> {
  return saveFile(file, FOLDERS.file, schoolId);
}

export async function uploadMultipleFiles(
  files: Express.Multer.File[],
  schoolId: string
): Promise<SavedFile[]> {
  return Promise.all(files.map((file) => saveFile(file, FOLDERS.file, schoolId)));
}

export async function deleteFile(storageKey: string): Promise<void> {
  await removeFile(storageKey);
}

export async function deleteMultipleFiles(storageKeys: string[]): Promise<void> {
  await Promise.all(storageKeys.map((key) => removeFile(key)));
}

/** Extract storage key from a public file URL saved in DB */
export function getStorageKeyFromUrl(fileUrl: string): string | null {
  const base = env.publicUploadBaseUrl.replace(/\/$/, "") + "/";
  if (!fileUrl.startsWith(base)) return null;
  return fileUrl.slice(base.length).replace(/\\/g, "/");
}

/** Delete files by their public URLs (logoUrl, coverUrl, etc.) */
export async function deleteFilesByUrls(
  urls: (string | null | undefined)[]
): Promise<void> {
  const keys = urls
    .map((url) => (url ? getStorageKeyFromUrl(url) : null))
    .filter((key): key is string => Boolean(key));

  if (keys.length > 0) {
    await deleteMultipleFiles(keys);
  }
}

/** Delete all uploaded files for a school (offline: removes school folder) */
export async function deleteSchoolStorage(schoolId: string): Promise<void> {
  if (isOfflineStorage()) {
    const dir = path.join(getUploadRoot(), schoolId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return;
  }

  // TODO: delete S3 prefix when online storage is enabled
}

// ─── Internal (online/offline switch lives here only) ───────────────────────

function getUploadRoot(): string {
  return path.resolve(env.uploadDir);
}

function buildStorageKey(schoolId: string, folder: string, fileName: string): string {
  return `${schoolId}/${folder}/${fileName}`.replace(/\\/g, "/");
}

function toSavedFile(file: Express.Multer.File, storageKey: string): SavedFile {
  return {
    fileName: file.originalname,
    storageKey,
    url: getPublicFileUrl(storageKey),
    mimeType: file.mimetype,
    size: file.size,
  };
}

async function saveFile(
  file: Express.Multer.File,
  folder: string,
  schoolId: string
): Promise<SavedFile> {
  if (isOfflineStorage()) {
    return saveToDisk(file, folder, schoolId);
  }
  return saveToCloud(file, folder, schoolId);
}

async function removeFile(storageKey: string): Promise<void> {
  if (isOfflineStorage()) {
    removeFromDisk(storageKey);
    return;
  }
  await removeFromCloud(storageKey);
}

// Offline → local disk
function saveToDisk(
  file: Express.Multer.File,
  folder: string,
  schoolId: string
): SavedFile {
  // multer diskStorage already saved the file — just read the path
  if (file.path) {
    const storageKey = path.relative(getUploadRoot(), file.path).replace(/\\/g, "/");
    return toSavedFile(file, storageKey);
  }

  // fallback: write buffer manually if needed
  const ext = path.extname(file.originalname).toLowerCase();
  const fileName = `${randomUUID()}${ext}`;
  const storageKey = buildStorageKey(schoolId, folder, fileName);
  const fullPath = path.join(getUploadRoot(), storageKey);

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, file.buffer);

  return toSavedFile(file, storageKey);
}

function removeFromDisk(storageKey: string): void {
  const fullPath = path.join(getUploadRoot(), storageKey);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

// Online → S3 (enable when MODE=online + STORAGE_PROVIDER=s3)
async function saveToCloud(
  file: Express.Multer.File,
  folder: string,
  schoolId: string
): Promise<SavedFile> {
  if (env.storageProvider !== "s3") {
    throw new AppError(ApiMessages.ONLINE_STORAGE_NOT_CONFIGURED, HttpStatus.NOT_IMPLEMENTED);
  }

  if (!file.buffer) {
    throw new AppError(ApiMessages.UPLOAD_FAILED, HttpStatus.INTERNAL_SERVER);
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const fileName = `${randomUUID()}${ext}`;
  const storageKey = buildStorageKey(schoolId, folder, fileName);

  // TODO: @aws-sdk/client-s3 PutObjectCommand here
  throw new AppError(
    "S3 upload not implemented yet. Install @aws-sdk/client-s3.",
    HttpStatus.NOT_IMPLEMENTED
  );
}

async function removeFromCloud(_storageKey: string): Promise<void> {
  if (env.storageProvider !== "s3") {
    throw new AppError(ApiMessages.ONLINE_STORAGE_NOT_CONFIGURED, HttpStatus.NOT_IMPLEMENTED);
  }

  // TODO: @aws-sdk/client-s3 DeleteObjectCommand here
  throw new AppError(
    "S3 delete not implemented yet. Install @aws-sdk/client-s3.",
    HttpStatus.NOT_IMPLEMENTED
  );
}

/** Used by multer middleware to know where to save files (offline only). */
export function getUploadRootPath(): string {
  return getUploadRoot();
}

export function getSchoolUploadPath(schoolId: string, folder: string): string {
  const dir = path.join(getUploadRoot(), schoolId, folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
