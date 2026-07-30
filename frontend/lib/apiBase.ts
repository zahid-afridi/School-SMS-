/**
 * Resolves backend URLs at runtime.
 *
 * Hardcoding localhost breaks LAN access (a phone would resolve localhost to
 * itself), so when no explicit env var is set we reuse the host the app is
 * being viewed from and only swap the port.
 */

const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT ?? "5000";

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

/** Origin serving uploads, e.g. http://10.210.61.30:5000 */
export function getUploadBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL?.trim();
  if (explicit) return trimSlash(explicit);

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${BACKEND_PORT}`;
  }

  return `http://localhost:${BACKEND_PORT}`;
}

/** REST API root, e.g. http://10.210.61.30:5000/api */
export function getApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return trimSlash(explicit);
  return `${getUploadBaseUrl()}/api`;
}

/** Turns a stored relative upload path into an absolute URL. */
export function resolveUploadUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${getUploadBaseUrl()}/${path.replace(/^\/+/, "")}`;
}
