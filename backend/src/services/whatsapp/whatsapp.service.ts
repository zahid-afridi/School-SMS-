import axios, { type AxiosInstance, isAxiosError } from "axios";
import { env } from "../../config/env.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiMessages } from "../../constants/messages.js";
import { AppError } from "../../utils/AppError.js";
import { getPrisma } from "../../lib/prisma.js";
import { toWhatsAppChatId } from "./phone.util.js";

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

export type OpenWaSendResult = {
  chatId: string;
  messageId: string | null;
  raw: unknown;
};

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
  qrCode: string;
  status: SessionStatus;
};

export type WhatsAppGatewayConfig = {
  url: string;
  apiKey: string;
  source: "school" | "env";
};

export type WhatsAppConfigView = {
  gatewayConfigured: boolean;
  gatewaySource: "school" | "env" | "none";
  gatewayUrl: string;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  hasSession: boolean;
  envDefaultsAvailable: boolean;
};

type SchoolWhatsAppRow = {
  id: string;
  name: string;
  whatsappSessionId: string | null;
  whatsappGatewayUrl: string | null;
  whatsappGatewayApiKey: string | null;
};

function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 12) return "••••••••";
  return `${trimmed.slice(0, 8)}…${trimmed.slice(-4)}`;
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

async function loadSchool(schoolId: string): Promise<SchoolWhatsAppRow> {
  const school = await getPrisma().school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      whatsappSessionId: true,
      whatsappGatewayUrl: true,
      whatsappGatewayApiKey: true,
    },
  });
  if (!school) {
    throw new AppError(ApiMessages.SCHOOL_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  return school;
}

function resolveGateway(school: SchoolWhatsAppRow): WhatsAppGatewayConfig | null {
  const schoolUrl = school.whatsappGatewayUrl?.trim() ?? "";
  const schoolKey = school.whatsappGatewayApiKey?.trim() ?? "";
  if (schoolUrl && schoolKey) {
    return { url: schoolUrl.replace(/\/$/, ""), apiKey: schoolKey, source: "school" };
  }

  const envUrl = env.openwaUrl.trim();
  const envKey = env.openwaApiKey.trim();
  if (envUrl && envKey) {
    return { url: envUrl.replace(/\/$/, ""), apiKey: envKey, source: "env" };
  }

  return null;
}

function createClient(gateway: WhatsAppGatewayConfig): AxiosInstance {
  return axios.create({
    baseURL: gateway.url,
    timeout: 30_000,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": gateway.apiKey,
    },
  });
}

async function requireGateway(schoolId: string): Promise<{
  school: SchoolWhatsAppRow;
  gateway: WhatsAppGatewayConfig;
  client: AxiosInstance;
}> {
  const school = await loadSchool(schoolId);
  const gateway = resolveGateway(school);
  if (!gateway) {
    throw new AppError(
      ApiMessages.WHATSAPP_NOT_CONFIGURED,
      HttpStatus.SERVICE_UNAVAILABLE,
      [
        "Set OpenWA URL and API key in Messages → WhatsApp Setup, or in the backend .env (OPENWA_URL / OPENWA_API_KEY)",
      ]
    );
  }
  return { school, gateway, client: createClient(gateway) };
}

async function ensureSessionId(
  school: SchoolWhatsAppRow,
  client: AxiosInstance
): Promise<string> {
  if (school.whatsappSessionId) {
    return school.whatsappSessionId;
  }

  const sessionName = `school-${school.id.slice(0, 8)}`;
  let openwaSessionId: string;

  try {
    const resp = await client.post<OpenWaSessionInfo>("/api/sessions", {
      name: sessionName,
    });
    openwaSessionId = resp.data.id;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 409) {
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

  await getPrisma().school.update({
    where: { id: school.id },
    data: { whatsappSessionId: openwaSessionId },
  });

  return openwaSessionId;
}

export class WhatsAppService {
  static getConfigView(school: SchoolWhatsAppRow): WhatsAppConfigView {
    const gateway = resolveGateway(school);
    const envDefaultsAvailable = Boolean(
      env.openwaUrl.trim() && env.openwaApiKey.trim()
    );

    return {
      gatewayConfigured: Boolean(gateway),
      gatewaySource: gateway?.source ?? "none",
      gatewayUrl: gateway?.url ?? school.whatsappGatewayUrl?.trim() ?? env.openwaUrl.trim(),
      hasApiKey: Boolean(gateway?.apiKey),
      apiKeyPreview: gateway ? maskApiKey(gateway.apiKey) : null,
      hasSession: Boolean(school.whatsappSessionId),
      envDefaultsAvailable,
    };
  }

  static async getConfig(schoolId: string): Promise<WhatsAppConfigView> {
    const school = await loadSchool(schoolId);
    return WhatsAppService.getConfigView(school);
  }

  static async saveGatewayConfig(
    schoolId: string,
    input: { gatewayUrl?: string | null; gatewayApiKey?: string | null; clearSchoolGateway?: boolean }
  ): Promise<WhatsAppConfigView> {
    const prisma = getPrisma();
    const school = await loadSchool(schoolId);

    if (input.clearSchoolGateway) {
      await prisma.school.update({
        where: { id: schoolId },
        data: {
          whatsappGatewayUrl: null,
          whatsappGatewayApiKey: null,
        },
      });
      return WhatsAppService.getConfig(schoolId);
    }

    const nextUrl =
      input.gatewayUrl === undefined
        ? school.whatsappGatewayUrl
        : String(input.gatewayUrl ?? "").trim() || null;

    let nextKey = school.whatsappGatewayApiKey;
    if (input.gatewayApiKey !== undefined) {
      const raw = String(input.gatewayApiKey ?? "").trim();
      // Empty string = keep existing key when updating URL only
      nextKey = raw || school.whatsappGatewayApiKey;
    }

    if ((nextUrl && !nextKey) || (!nextUrl && nextKey)) {
      throw new AppError(
        "Both OpenWA URL and API key are required",
        HttpStatus.BAD_REQUEST
      );
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        whatsappGatewayUrl: nextUrl,
        whatsappGatewayApiKey: nextKey,
      },
    });

    return WhatsAppService.getConfig(schoolId);
  }

  /** True if this school can reach an OpenWA gateway (school override or env). */
  static async isConfiguredForSchool(schoolId: string): Promise<boolean> {
    const school = await loadSchool(schoolId);
    return Boolean(resolveGateway(school));
  }

  /** Legacy helper used by stats — env defaults only. Prefer isConfiguredForSchool. */
  static isConfigured(): boolean {
    return Boolean(env.openwaUrl.trim() && env.openwaApiKey.trim());
  }

  static async sendText(
    phone: string,
    text: string,
    schoolId: string
  ): Promise<OpenWaSendResult> {
    const chatId = toWhatsAppChatId(phone);
    const message = String(text ?? "").trim();
    if (!message) {
      throw new AppError("Message text is required", HttpStatus.BAD_REQUEST);
    }

    const { school, client } = await requireGateway(schoolId);
    const sessionId = await ensureSessionId(school, client);
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

  static async getSessionStatus(schoolId: string): Promise<OpenWaSessionInfo> {
    const { school, client } = await requireGateway(schoolId);
    const sessionId = await ensureSessionId(school, client);
    try {
      const resp = await client.get<OpenWaSessionInfo>(
        `/api/sessions/${encodeURIComponent(sessionId)}`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "getSessionStatus");
    }
  }

  static async getQRCode(schoolId: string): Promise<OpenWaQRResult> {
    const { school, client } = await requireGateway(schoolId);
    const sessionId = await ensureSessionId(school, client);
    try {
      const resp = await client.get<OpenWaQRResult>(
        `/api/sessions/${encodeURIComponent(sessionId)}/qr`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "getQRCode");
    }
  }

  static async startSession(schoolId: string): Promise<OpenWaSessionInfo> {
    const { school, client } = await requireGateway(schoolId);
    const sessionId = await ensureSessionId(school, client);
    try {
      const resp = await client.post<OpenWaSessionInfo>(
        `/api/sessions/${encodeURIComponent(sessionId)}/start`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "startSession");
    }
  }

  static async stopSession(schoolId: string): Promise<OpenWaSessionInfo> {
    const { school, client } = await requireGateway(schoolId);
    const sessionId = await ensureSessionId(school, client);
    try {
      const resp = await client.post<OpenWaSessionInfo>(
        `/api/sessions/${encodeURIComponent(sessionId)}/stop`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "stopSession");
    }
  }

  static async reconnectSession(schoolId: string): Promise<OpenWaSessionInfo> {
    const { school, client } = await requireGateway(schoolId);
    const sessionId = await ensureSessionId(school, client);
    try {
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

  static async logoutSession(schoolId: string): Promise<OpenWaSessionInfo> {
    const { school, client } = await requireGateway(schoolId);
    const sessionId = await ensureSessionId(school, client);
    try {
      const resp = await client.post<OpenWaSessionInfo>(
        `/api/sessions/${encodeURIComponent(sessionId)}/logout`
      );
      return resp.data;
    } catch (err) {
      throw wrapAxiosError(err, "logoutSession");
    }
  }

  /** Clear saved session id so the next connect creates a fresh OpenWA session. */
  static async resetSession(schoolId: string): Promise<WhatsAppConfigView> {
    await getPrisma().school.update({
      where: { id: schoolId },
      data: { whatsappSessionId: null },
    });
    return WhatsAppService.getConfig(schoolId);
  }

  static async requestPairingCode(
    schoolId: string,
    phoneNumber: string
  ): Promise<{ pairingCode: string }> {
    const { school, client } = await requireGateway(schoolId);
    const sessionId = await ensureSessionId(school, client);
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
}
