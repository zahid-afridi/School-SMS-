import axios, { type AxiosInstance, isAxiosError } from "axios";
import { env } from "../../config/env.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiMessages } from "../../constants/messages.js";
import { AppError } from "../../utils/AppError.js";
import { toWhatsAppChatId } from "./phone.util.js";
import { getPrisma } from "../../lib/prisma.js";

// ─── Shared response types ────────────────────────────────────────────────────

export type OpenWaSendResult = {
  chatId: string;
  messageId: string | null;
  raw: unknown;
};

export type SessionStatus =
  | "created"
  | "initializing"
  | "qr_ready"
  | "authenticating"
  | "action_required"
  | "ready"
  | "disconnected"
  | "failed"
  | "stopped";

export type OpenWaSessionInfo = {
  id: string;
  name: string;
  status: SessionStatus;
  phone: string | null;
  pushName: string | null;
  connectedAt: string | null;
  lastActive: string | null;
  lastError: string | null;
  engineLoaded: boolean;
};

export type OpenWaQRResult = {
  qrCode: string; // data URL  e.g. "data:image/png;base64,..."
  status: SessionStatus;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function assertOpenWaGlobalConfig(): void {
  if (!env.openwaUrl || !env.openwaApiKey) {
    throw new AppError(
      ApiMessages.WHATSAPP_NOT_CONFIGURED,
      HttpStatus.SERVICE_UNAVAILABLE,
      ["Set OPENWA_URL and OPENWA_API_KEY in the backend .env file"]
    );
  }
}

/**
 * Build an Axios client pointed at OpenWA.
 * Does NOT require openwaSessionId — used for session-management calls where
 * the session ID comes from the school record instead.
 */
function createClient(): AxiosInstance {
  assertOpenWaGlobalConfig();
  return axios.create({
    baseURL: env.openwaUrl.replace(/\/$/, ""),
    timeout: 30_000,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.openwaApiKey,
    },
  });
}

function extractMessageId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  for (const key of ["id", "messageId", "msgId", "_serialized"]) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  if (obj.message && typeof obj.message === "object") {
    const nested = obj.message as Record<string, unknown>;
    for (const key of ["id", "messageId", "_serialized"]) {
      const value = nested[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  if (obj.data && typeof obj.data === "object") return extractMessageId(obj.data);
  return null;
}

function wrapAxiosError(err: unknown, operation: string): AppError {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    const remoteMessage = data?.message ?? data?.error ?? err.message;
    const status = err.response?.status;
    return new AppError(
      `OpenWA ${operation} error: ${remoteMessage}`,
      status === 404
        ? HttpStatus.NOT_FOUND
        : status === 400
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.BAD_GATEWAY,
      [`status=${status ?? "network"}`]
    );
  }
  if (err instanceof AppError) return err;
  return new AppError(`OpenWA ${operation} failed`, HttpStatus.BAD_GATEWAY);
}

// ─── School session resolution ────────────────────────────────────────────────

/**
 * Get or create the OpenWA session ID for a school.
 *
 * Strategy:
 *   1. If School.whatsappSessionId is set → use it directly.
 *   2. Otherwise → create a new OpenWA session named after the school,
 *      persist the returned session ID on the School row, and return it.
 *
 * The session name is deterministic: `school-{schoolId-prefix}` so recreating
 * it after a DB reset hits a 409 (already exists in OpenWA) which we resolve
 * by fetching the existing session.
 */
async function resolveSchoolSessionId(schoolId: string): Promise<string> {
  const prisma = getPrisma();
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, whatsappSessionId: true, name: true },
  });

  if (!school) {
    throw new AppError(ApiMessages.SCHOOL_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  if (school.whatsappSessionId) {
    return school.whatsappSessionId;
  }

  // No session yet — create one in OpenWA
  const sessionName = `school-${schoolId.slice(0, 8)}`;
  const client = createClient();

  let openwaSessionId: string;

  try {
    const resp = await client.post<OpenWaSessionInfo>("/api/sessions", {
      name: sessionName,
    });
    openwaSessionId = resp.data.id;
  } catch (err) {
    // 409 = session name already exists in OpenWA (e.g. DB was reset)
    if (isAxiosError(err) && err.response?.status === 409) {
      // Find it by listing sessions
      const list = await client.get<OpenWaSessionInfo[]>("/api/sessions");
      const found = list.data.find((s) => s.name === sessionName);
      if (!found) {
        throw new AppError(
          "Failed to create or locate OpenWA session",
          HttpStatus.BAD_GATEWAY
        );
      }
      openwaSessionId = found.id;
    } else {
      throw wrapAxiosError(err, "createSession");
    }
  }

  // Persist the resolved session ID on the school
  await prisma.school.update({
    where: { id: schoolId },
    data: { whatsappSessionId: openwaSessionId },
  });

  return openwaSessionId;
}

// ─── WhatsAppService ──────────────────────────────────────────────────────────

export class WhatsAppService {
  // ── Messaging (school-scoped) ─────────────────────────────────────────────

  /**
   * Send a plain-text WhatsApp message for the given school.
   * Uses the school's own OpenWA session.
   */
  static async sendText(
    phone: string,
    text: string,
    schoolId?: string
  ): Promise<OpenWaSendResult> {
    const chatId = toWhatsAppChatId(phone);
    const message = String(text ?? "").trim();

    if (!message) {
      throw new AppError("Message text is required", HttpStatus.BAD_REQUEST);
    }

    const sessionId = schoolId
      ? await resolveSchoolSessionId(schoolId)
      : WhatsAppService.getLegacySessionId();

    const client = createClient();
    const path = `/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;

    try {
      const response = await client.post(path, { chatId, text: message });
      return {
        chatId,
        messageId: extractMessageId(response.data),
        raw: response.data,
      };
    } catch (err) {
      throw wrapAxiosError(err, "sendText");
    }
  }

  // ── Session management (school-scoped) ────────────────────────────────────

  /** Get current session status for a school. */
  static async getSessionStatus(schoolId: string): Promise<OpenWaSessionInfo> {
    const sessionId = await resolveSchoolSessionId(schoolId);
    const client = createClient();
    try {
      const resp = await client.get<OpenWaSessionInfo>(
        `/api/sessions/${encodeURIComponent(sessionId)}`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "getSessionStatus");
    }
  }

  /** Get the QR code for a school's session. */
  static async getQRCode(schoolId: string): Promise<OpenWaQRResult> {
    const sessionId = await resolveSchoolSessionId(schoolId);
    const client = createClient();
    try {
      const resp = await client.get<OpenWaQRResult>(
        `/api/sessions/${encodeURIComponent(sessionId)}/qr`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "getQRCode");
    }
  }

  /** Start (connect) a school's WhatsApp session. */
  static async startSession(schoolId: string): Promise<OpenWaSessionInfo> {
    const sessionId = await resolveSchoolSessionId(schoolId);
    const client = createClient();
    try {
      const resp = await client.post<OpenWaSessionInfo>(
        `/api/sessions/${encodeURIComponent(sessionId)}/start`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "startSession");
    }
  }

  /** Stop (disconnect) a school's WhatsApp session without logging out. */
  static async stopSession(schoolId: string): Promise<OpenWaSessionInfo> {
    const sessionId = await resolveSchoolSessionId(schoolId);
    const client = createClient();
    try {
      const resp = await client.post<OpenWaSessionInfo>(
        `/api/sessions/${encodeURIComponent(sessionId)}/stop`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "stopSession");
    }
  }

  /**
   * Reconnect: stop then start the session.
   * OpenWA has no dedicated reconnect endpoint so we chain stop → start.
   */
  static async reconnectSession(schoolId: string): Promise<OpenWaSessionInfo> {
    const sessionId = await resolveSchoolSessionId(schoolId);
    const client = createClient();
    try {
      // Stop may fail if already stopped — tolerate that
      await client
        .post(`/api/sessions/${encodeURIComponent(sessionId)}/stop`)
        .catch(() => undefined);
      const resp = await client.post<OpenWaSessionInfo>(
        `/api/sessions/${encodeURIComponent(sessionId)}/start`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "reconnectSession");
    }
  }

  /**
   * Request a pairing code (phone-number-based link) for a school's session.
   * The session must already be started and in qr_ready state.
   */
  static async requestPairingCode(
    schoolId: string,
    phoneNumber: string
  ): Promise<{ pairingCode: string }> {
    const sessionId = await resolveSchoolSessionId(schoolId);
    const client = createClient();
    try {
      const resp = await client.post<{ pairingCode: string }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/pairing-code`,
        { phoneNumber }
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "requestPairingCode");
    }
  }

  // ── Configuration helpers ─────────────────────────────────────────────────

  /** True if OPENWA_URL and OPENWA_API_KEY are set (global config). */
  static isConfigured(): boolean {
    return Boolean(env.openwaUrl && env.openwaApiKey);
  }

  /**
   * Legacy fallback: returns OPENWA_SESSION_ID from .env when no schoolId is
   * available (e.g. the old single-school path). Throws if not set.
   */
  private static getLegacySessionId(): string {
    if (!env.openwaSessionId) {
      throw new AppError(
        ApiMessages.WHATSAPP_NOT_CONFIGURED,
        HttpStatus.SERVICE_UNAVAILABLE,
        ["Set OPENWA_SESSION_ID in .env or pass a schoolId"]
      );
    }
    return env.openwaSessionId;
  }
}
