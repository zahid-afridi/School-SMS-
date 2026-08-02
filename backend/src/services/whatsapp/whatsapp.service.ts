import axios, { type AxiosInstance, isAxiosError } from "axios";
import { env } from "../../config/env.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiMessages } from "../../constants/messages.js";
import { AppError } from "../../utils/AppError.js";
import { toWhatsAppChatId } from "./phone.util.js";

export type OpenWaSendResult = {
  chatId: string;
  messageId: string | null;
  raw: unknown;
};

function assertOpenWaConfigured(): void {
  if (!env.openwaUrl || !env.openwaApiKey || !env.openwaSessionId) {
    throw new AppError(
      ApiMessages.WHATSAPP_NOT_CONFIGURED,
      HttpStatus.SERVICE_UNAVAILABLE,
      [
        "Set OPENWA_URL, OPENWA_API_KEY, and OPENWA_SESSION_ID in the backend .env file",
      ]
    );
  }
}

function createClient(): AxiosInstance {
  assertOpenWaConfigured();
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

  if (obj.data && typeof obj.data === "object") {
    return extractMessageId(obj.data);
  }

  return null;
}

/**
 * Reusable OpenWA WhatsApp client (Axios).
 * POST /api/sessions/:sessionId/messages/send-text
 */
export class WhatsAppService {
  /**
   * Send a plain text WhatsApp message.
   * Accepts local PK numbers (03…) or chat IDs (…@c.us).
   */
  static async sendText(phone: string, text: string): Promise<OpenWaSendResult> {
    const chatId = toWhatsAppChatId(phone);
    const message = String(text ?? "").trim();

    if (!message) {
      throw new AppError("Message text is required", HttpStatus.BAD_REQUEST);
    }

    const client = createClient();
    const path = `/api/sessions/${encodeURIComponent(env.openwaSessionId)}/messages/send-text`;

    try {
      const response = await client.post(path, {
        chatId,
        text: message,
      });

      return {
        chatId,
        messageId: extractMessageId(response.data),
        raw: response.data,
      };
    } catch (err) {
      if (isAxiosError(err)) {
        const remoteMessage =
          (err.response?.data as { message?: string; error?: string } | undefined)
            ?.message ??
          (err.response?.data as { message?: string; error?: string } | undefined)
            ?.error ??
          err.message;

        throw new AppError(
          `OpenWA error: ${remoteMessage}`,
          HttpStatus.BAD_GATEWAY,
          [
            `status=${err.response?.status ?? "network"}`,
            `chatId=${chatId}`,
          ]
        );
      }

      throw err;
    }
  }

  static isConfigured(): boolean {
    return Boolean(env.openwaUrl && env.openwaApiKey && env.openwaSessionId);
  }
}
