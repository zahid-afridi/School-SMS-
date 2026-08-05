import { Router } from "express";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getMessageById,
  getMessageHistory,
  getWhatsAppStats,
  sendAnnouncement,
  sendAttendanceNotification,
  sendCustomMessage,
  sendFeeReminder,
  sendResultNotification,
} from "../../controllers/whatsapp/whatsapp.controller.js";
import {
  connectSession,
  disconnectSession,
  getQRCode,
  getSessionStatus,
  reconnectSession,
  requestPairingCode,
} from "../../controllers/whatsapp/whatsapp.session.controller.js";

const WhatsAppRouter = Router();

// ─── Session Management ───────────────────────────────────────────────────────
WhatsAppRouter.get("/session/status", auth("ADMIN", "STAFF"), asyncHandler(getSessionStatus));
WhatsAppRouter.get("/session/qr", auth("ADMIN", "STAFF"), asyncHandler(getQRCode));
WhatsAppRouter.post("/session/connect", auth("ADMIN", "STAFF"), asyncHandler(connectSession));
WhatsAppRouter.post("/session/disconnect", auth("ADMIN", "STAFF"), asyncHandler(disconnectSession));
WhatsAppRouter.post("/session/reconnect", auth("ADMIN", "STAFF"), asyncHandler(reconnectSession));
WhatsAppRouter.post("/session/pairing-code", auth("ADMIN", "STAFF"), asyncHandler(requestPairingCode));

// ─── Stats & History ──────────────────────────────────────────────────────────
WhatsAppRouter.get("/stats", auth("ADMIN", "STAFF"), asyncHandler(getWhatsAppStats));
WhatsAppRouter.get("/messages", auth("ADMIN", "STAFF"), asyncHandler(getMessageHistory));
WhatsAppRouter.get("/messages/:id", auth("ADMIN", "STAFF"), asyncHandler(getMessageById));

// ─── Send Messages ────────────────────────────────────────────────────────────
WhatsAppRouter.post("/send", auth("ADMIN", "STAFF"), asyncHandler(sendCustomMessage));
WhatsAppRouter.post(
  "/attendance",
  auth("ADMIN", "STAFF"),
  asyncHandler(sendAttendanceNotification)
);
WhatsAppRouter.post("/fees", auth("ADMIN", "STAFF"), asyncHandler(sendFeeReminder));
WhatsAppRouter.post("/results", auth("ADMIN", "STAFF"), asyncHandler(sendResultNotification));
WhatsAppRouter.post(
  "/announcement",
  auth("ADMIN", "STAFF"),
  asyncHandler(sendAnnouncement)
);

export default WhatsAppRouter;
