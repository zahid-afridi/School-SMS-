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

const WhatsAppRouter = Router();

WhatsAppRouter.get("/stats", auth("ADMIN", "STAFF"), asyncHandler(getWhatsAppStats));
WhatsAppRouter.get("/messages", auth("ADMIN", "STAFF"), asyncHandler(getMessageHistory));
WhatsAppRouter.get("/messages/:id", auth("ADMIN", "STAFF"), asyncHandler(getMessageById));

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
