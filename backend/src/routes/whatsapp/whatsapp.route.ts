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
  getWhatsAppConfig,
  logoutSession,
  reconnectSession,
  requestPairingCode,
  resetSession,
  saveWhatsAppConfig,
} from "../../controllers/whatsapp/whatsapp.session.controller.js";
import {
  getMessageTemplates,
  removeMessageTemplate,
  saveMessageTemplates,
} from "../../controllers/whatsapp/whatsapp.templates.controller.js";

const WhatsAppRouter = Router();

WhatsAppRouter.get("/config", auth("ADMIN", "STAFF"), asyncHandler(getWhatsAppConfig));
WhatsAppRouter.put("/config", auth("ADMIN"), asyncHandler(saveWhatsAppConfig));

WhatsAppRouter.get("/templates", auth("ADMIN", "STAFF"), asyncHandler(getMessageTemplates));
WhatsAppRouter.put("/templates", auth("ADMIN"), asyncHandler(saveMessageTemplates));
WhatsAppRouter.delete(
  "/templates/:key",
  auth("ADMIN"),
  asyncHandler(removeMessageTemplate)
);

WhatsAppRouter.get("/session/status", auth("ADMIN", "STAFF"), asyncHandler(getSessionStatus));
WhatsAppRouter.get("/session/qr", auth("ADMIN", "STAFF"), asyncHandler(getQRCode));
WhatsAppRouter.post("/session/connect", auth("ADMIN", "STAFF"), asyncHandler(connectSession));
WhatsAppRouter.post("/session/disconnect", auth("ADMIN", "STAFF"), asyncHandler(disconnectSession));
WhatsAppRouter.post("/session/reconnect", auth("ADMIN", "STAFF"), asyncHandler(reconnectSession));
WhatsAppRouter.post("/session/logout", auth("ADMIN"), asyncHandler(logoutSession));
WhatsAppRouter.post("/session/reset", auth("ADMIN"), asyncHandler(resetSession));
WhatsAppRouter.post("/session/pairing-code", auth("ADMIN", "STAFF"), asyncHandler(requestPairingCode));

WhatsAppRouter.get("/stats", auth("ADMIN", "STAFF"), asyncHandler(getWhatsAppStats));
WhatsAppRouter.get("/messages", auth("ADMIN", "STAFF"), asyncHandler(getMessageHistory));
WhatsAppRouter.get("/messages/:id", auth("ADMIN", "STAFF"), asyncHandler(getMessageById));

WhatsAppRouter.post("/send", auth("ADMIN", "STAFF"), asyncHandler(sendCustomMessage));
WhatsAppRouter.post("/attendance", auth("ADMIN", "STAFF"), asyncHandler(sendAttendanceNotification));
WhatsAppRouter.post("/fees", auth("ADMIN", "STAFF"), asyncHandler(sendFeeReminder));
WhatsAppRouter.post("/results", auth("ADMIN", "STAFF"), asyncHandler(sendResultNotification));
WhatsAppRouter.post("/announcement", auth("ADMIN", "STAFF"), asyncHandler(sendAnnouncement));

export default WhatsAppRouter;
