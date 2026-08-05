import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { WhatsAppService } from "../../services/whatsapp/whatsapp.service.js";
import { validateRequired } from "../../utils/validate.js";

function requireSchoolId(req: Request): string {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }
  return schoolId;
}

function assertConfigured(): void {
  if (!WhatsAppService.isConfigured()) {
    throw new AppError(
      ApiMessages.WHATSAPP_NOT_CONFIGURED,
      HttpStatus.SERVICE_UNAVAILABLE,
      ["Set OPENWA_URL and OPENWA_API_KEY in the backend .env file"]
    );
  }
}

/** GET /api/whatsapp/session/status */
export async function getSessionStatus(req: Request, res: Response) {
  assertConfigured();
  const schoolId = requireSchoolId(req);
  const data = await WhatsAppService.getSessionStatus(schoolId);
  return ApiResponse.success(res, {
    message: ApiMessages.WHATSAPP_SESSION_STATUS,
    data,
  });
}

/** GET /api/whatsapp/session/qr */
export async function getQRCode(req: Request, res: Response) {
  assertConfigured();
  const schoolId = requireSchoolId(req);
  const data = await WhatsAppService.getQRCode(schoolId);
  return ApiResponse.success(res, {
    message: ApiMessages.WHATSAPP_SESSION_QR,
    data,
  });
}

/** POST /api/whatsapp/session/connect */
export async function connectSession(req: Request, res: Response) {
  assertConfigured();
  const schoolId = requireSchoolId(req);
  const data = await WhatsAppService.startSession(schoolId);
  return ApiResponse.success(res, {
    message: ApiMessages.WHATSAPP_SESSION_STARTED,
    data,
  });
}

/** POST /api/whatsapp/session/disconnect */
export async function disconnectSession(req: Request, res: Response) {
  assertConfigured();
  const schoolId = requireSchoolId(req);
  const data = await WhatsAppService.stopSession(schoolId);
  return ApiResponse.success(res, {
    message: ApiMessages.WHATSAPP_SESSION_STOPPED,
    data,
  });
}

/** POST /api/whatsapp/session/reconnect */
export async function reconnectSession(req: Request, res: Response) {
  assertConfigured();
  const schoolId = requireSchoolId(req);
  const data = await WhatsAppService.reconnectSession(schoolId);
  return ApiResponse.success(res, {
    message: ApiMessages.WHATSAPP_SESSION_RECONNECTED,
    data,
  });
}

/** POST /api/whatsapp/session/pairing-code */
export async function requestPairingCode(req: Request, res: Response) {
  assertConfigured();
  const schoolId = requireSchoolId(req);
  validateRequired(req.body as Record<string, unknown>, ["phoneNumber"]);
  const phoneNumber = String(req.body.phoneNumber).trim();
  const data = await WhatsAppService.requestPairingCode(schoolId, phoneNumber);
  return ApiResponse.success(res, {
    message: "Pairing code generated",
    data,
  });
}
