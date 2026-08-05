import type { Request, Response } from "express";
import type {
  WhatsAppMessageStatus,
  WhatsAppMessageType,
} from "../../generated/prisma-sqlite/client.js";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { validateEnum, validateRequired } from "../../utils/validate.js";
import { normalizePhoneDigits, toWhatsAppChatId } from "../../services/whatsapp/phone.util.js";
import { WhatsAppTemplates } from "../../services/whatsapp/templates.js";
import { WhatsAppService } from "../../services/whatsapp/whatsapp.service.js";

const MESSAGE_TYPES = [
  "CUSTOM",
  "ATTENDANCE",
  "FEES",
  "RESULT",
  "ANNOUNCEMENT",
] as const;

const MESSAGE_STATUSES = ["PENDING", "SENT", "FAILED", "DELIVERED"] as const;

const messageSelect = {
  id: true,
  studentId: true,
  phone: true,
  messageType: true,
  message: true,
  messageId: true,
  status: true,
  error: true,
  schoolId: true,
  sentByUserId: true,
  timestamp: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      name: true,
      registrationNo: true,
    },
  },
} as const;

function requireSchoolId(req: Request): string {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }
  return schoolId;
}

function asTrimmedString(value: unknown): string {
  return String(value ?? "").trim();
}

async function resolveStudentPhone(
  schoolId: string,
  studentId: string
): Promise<{ studentName: string; phone: string }> {
  const student = await getPrisma().student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      name: true,
      contactPhone: true,
      emergencyPhone: true,
      parents: {
        orderBy: [{ isPrimaryGuardian: "desc" }, { createdAt: "asc" }],
        select: {
          parent: {
            select: {
              whatsappNo: true,
              mobileNo: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError(ApiMessages.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const primaryParent = student.parents[0]?.parent;
  const phone =
    primaryParent?.whatsappNo?.trim() ||
    primaryParent?.mobileNo?.trim() ||
    student.contactPhone?.trim() ||
    student.emergencyPhone?.trim() ||
    "";

  // Return empty phone — the caller will use the explicit override or throw
  return { studentName: student.name, phone };
}

async function resolvePhoneAndStudent(params: {
  schoolId: string;
  phone?: unknown;
  studentId?: unknown;
}): Promise<{ phone: string; studentId: string | null; studentName: string | null }> {
  const explicitPhone = asTrimmedString(params.phone);
  const studentId = asTrimmedString(params.studentId) || null;

  if (studentId) {
    const resolved = await resolveStudentPhone(params.schoolId, studentId);
    const finalPhone = explicitPhone || resolved.phone;

    if (!finalPhone) {
      throw new AppError(
        ApiMessages.WHATSAPP_PHONE_REQUIRED,
        HttpStatus.BAD_REQUEST,
        ["No WhatsApp/mobile number found for this student or parent. Enter a phone number manually."]
      );
    }

    return {
      phone: finalPhone,
      studentId,
      studentName: resolved.studentName,
    };
  }

  if (!explicitPhone) {
    throw new AppError(
      ApiMessages.WHATSAPP_PHONE_REQUIRED,
      HttpStatus.BAD_REQUEST,
      ["Provide phone or studentId"]
    );
  }

  return { phone: explicitPhone, studentId: null, studentName: null };
}

async function persistAndSend(params: {
  schoolId: string;
  sentByUserId?: string;
  studentId: string | null;
  phone: string;
  messageType: WhatsAppMessageType;
  message: string;
}) {
  const prisma = getPrisma();
  let chatId: string;
  try {
    chatId = toWhatsAppChatId(params.phone);
  } catch (err) {
    throw new AppError(
      err instanceof Error ? err.message : ApiMessages.WHATSAPP_PHONE_REQUIRED,
      HttpStatus.BAD_REQUEST
    );
  }

  const displayPhone = normalizePhoneDigits(params.phone);

  const record = await prisma.whatsAppMessage.create({
    data: {
      schoolId: params.schoolId,
      sentByUserId: params.sentByUserId ?? null,
      studentId: params.studentId,
      phone: displayPhone,
      messageType: params.messageType,
      message: params.message,
      status: "PENDING",
      timestamp: new Date(),
    },
    select: messageSelect,
  });

  try {
    const result = await WhatsAppService.sendText(chatId, params.message, params.schoolId);
    const updated = await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: {
        status: "SENT",
        messageId: result.messageId,
        phone: normalizePhoneDigits(result.chatId),
        error: null,
      },
      select: messageSelect,
    });
    return updated;
  } catch (err) {
    const errorMessage =
      err instanceof AppError
        ? err.message
        : err instanceof Error
          ? err.message
          : ApiMessages.WHATSAPP_FAILED;

    const failed = await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        error: errorMessage.slice(0, 1000),
      },
      select: messageSelect,
    });

    throw new AppError(errorMessage, HttpStatus.BAD_GATEWAY, [
      `messageLogId=${failed.id}`,
    ]);
  }
}

export async function sendCustomMessage(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  validateRequired(req.body as Record<string, unknown>, ["message"]);

  const message = WhatsAppTemplates.custom(asTrimmedString(req.body.message));
  if (!message) {
    throw new AppError("Message text is required", HttpStatus.BAD_REQUEST);
  }

  const resolved = await resolvePhoneAndStudent({
    schoolId,
    phone: req.body.phone,
    studentId: req.body.studentId,
  });

  const saved = await persistAndSend({
    schoolId,
    sentByUserId: req.user?.userId,
    studentId: resolved.studentId,
    phone: resolved.phone,
    messageType: "CUSTOM",
    message,
  });

  return ApiResponse.success(res, {
    message: ApiMessages.WHATSAPP_SENT,
    data: saved,
  });
}

export async function sendAttendanceNotification(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  validateRequired(req.body as Record<string, unknown>, ["studentId"]);

  const resolved = await resolvePhoneAndStudent({
    schoolId,
    phone: req.body.phone,
    studentId: req.body.studentId,
  });

  const studentName =
    asTrimmedString(req.body.studentName) || resolved.studentName || "your child";

  const message = WhatsAppTemplates.attendance({ studentName });

  const saved = await persistAndSend({
    schoolId,
    sentByUserId: req.user?.userId,
    studentId: resolved.studentId,
    phone: resolved.phone,
    messageType: "ATTENDANCE",
    message,
  });

  return ApiResponse.success(res, {
    message: ApiMessages.WHATSAPP_SENT,
    data: saved,
  });
}

export async function sendFeeReminder(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  validateRequired(req.body as Record<string, unknown>, ["amount", "dueDate"]);

  const amount = req.body.amount;
  const dueDate = asTrimmedString(req.body.dueDate);
  if (amount === undefined || amount === null || String(amount).trim() === "") {
    throw new AppError("amount is required", HttpStatus.BAD_REQUEST);
  }

  const resolved = await resolvePhoneAndStudent({
    schoolId,
    phone: req.body.phone,
    studentId: req.body.studentId,
  });

  const message = WhatsAppTemplates.fees({ amount, dueDate });

  const saved = await persistAndSend({
    schoolId,
    sentByUserId: req.user?.userId,
    studentId: resolved.studentId,
    phone: resolved.phone,
    messageType: "FEES",
    message,
  });

  return ApiResponse.success(res, {
    message: ApiMessages.WHATSAPP_SENT,
    data: saved,
  });
}

export async function sendResultNotification(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  validateRequired(req.body as Record<string, unknown>, ["studentId"]);

  const resolved = await resolvePhoneAndStudent({
    schoolId,
    phone: req.body.phone,
    studentId: req.body.studentId,
  });

  const studentName =
    asTrimmedString(req.body.studentName) || resolved.studentName || "your child";

  const message = WhatsAppTemplates.result({ studentName });

  const saved = await persistAndSend({
    schoolId,
    sentByUserId: req.user?.userId,
    studentId: resolved.studentId,
    phone: resolved.phone,
    messageType: "RESULT",
    message,
  });

  return ApiResponse.success(res, {
    message: ApiMessages.WHATSAPP_SENT,
    data: saved,
  });
}

export async function sendAnnouncement(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  validateRequired(req.body as Record<string, unknown>, ["announcement"]);

  const announcement = asTrimmedString(req.body.announcement);
  if (!announcement) {
    throw new AppError("announcement is required", HttpStatus.BAD_REQUEST);
  }

  const message = WhatsAppTemplates.announcement({ announcement });

  type Target = { phone: string; studentId: string | null };
  const targets: Target[] = [];

  const studentIds = Array.isArray(req.body.studentIds)
    ? (req.body.studentIds as unknown[]).map((id) => asTrimmedString(id)).filter(Boolean)
    : [];
  const phones = Array.isArray(req.body.phones)
    ? (req.body.phones as unknown[]).map((p) => asTrimmedString(p)).filter(Boolean)
    : [];

  if (studentIds.length > 0) {
    for (const studentId of studentIds) {
      const resolved = await resolveStudentPhone(schoolId, studentId);
      if (!resolved.phone) continue; // will surface as a failed send below
      targets.push({ phone: resolved.phone, studentId });
    }
  }

  for (const phone of phones) {
    targets.push({ phone, studentId: null });
  }

  // Single recipient fallback
  if (targets.length === 0) {
    const resolved = await resolvePhoneAndStudent({
      schoolId,
      phone: req.body.phone,
      studentId: req.body.studentId,
    });
    targets.push({ phone: resolved.phone, studentId: resolved.studentId });
  }

  const results: unknown[] = [];
  const errors: string[] = [];

  for (const target of targets) {
    try {
      const saved = await persistAndSend({
        schoolId,
        sentByUserId: req.user?.userId,
        studentId: target.studentId,
        phone: target.phone,
        messageType: "ANNOUNCEMENT",
        message,
      });
      results.push(saved);
    } catch (err) {
      errors.push(
        err instanceof Error ? err.message : `Failed for ${target.phone}`
      );
    }
  }

  if (results.length === 0) {
    throw new AppError(
      ApiMessages.WHATSAPP_FAILED,
      HttpStatus.BAD_GATEWAY,
      errors
    );
  }

  return ApiResponse.success(res, {
    message:
      errors.length > 0 ? ApiMessages.WHATSAPP_PARTIAL : ApiMessages.WHATSAPP_SENT,
    data: {
      sent: results.length,
      failed: errors.length,
      errors,
      messages: results,
    },
  });
}

export async function getMessageHistory(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  const prisma = getPrisma();

  const search = asTrimmedString(req.query.search);
  const studentId = asTrimmedString(req.query.studentId);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  let messageType: WhatsAppMessageType | undefined;
  let status: WhatsAppMessageStatus | undefined;

  if (req.query.messageType) {
    validateEnum(
      asTrimmedString(req.query.messageType).toUpperCase(),
      MESSAGE_TYPES,
      "Invalid messageType"
    );
    messageType = asTrimmedString(req.query.messageType).toUpperCase() as WhatsAppMessageType;
  }

  if (req.query.status) {
    validateEnum(
      asTrimmedString(req.query.status).toUpperCase(),
      MESSAGE_STATUSES,
      "Invalid status"
    );
    status = asTrimmedString(req.query.status).toUpperCase() as WhatsAppMessageStatus;
  }

  const where = {
    schoolId,
    ...(studentId ? { studentId } : {}),
    ...(messageType ? { messageType } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { phone: { contains: search } },
            { message: { contains: search } },
            { messageId: { contains: search } },
            { student: { name: { contains: search } } },
            { student: { registrationNo: { contains: search } } },
          ],
        }
      : {}),
  };

  const [total, messages] = await Promise.all([
    prisma.whatsAppMessage.count({ where }),
    prisma.whatsAppMessage.findMany({
      where,
      select: messageSelect,
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
}

export async function getMessageById(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  const id = asTrimmedString(req.params.id);

  const message = await getPrisma().whatsAppMessage.findFirst({
    where: { id, schoolId },
    select: messageSelect,
  });

  if (!message) {
    throw new AppError(ApiMessages.WHATSAPP_MESSAGE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: message,
  });
}

export async function getWhatsAppStats(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  const prisma = getPrisma();

  const [total, sent, failed, pending, delivered, byType] = await Promise.all([
    prisma.whatsAppMessage.count({ where: { schoolId } }),
    prisma.whatsAppMessage.count({ where: { schoolId, status: "SENT" } }),
    prisma.whatsAppMessage.count({ where: { schoolId, status: "FAILED" } }),
    prisma.whatsAppMessage.count({ where: { schoolId, status: "PENDING" } }),
    prisma.whatsAppMessage.count({ where: { schoolId, status: "DELIVERED" } }),
    prisma.whatsAppMessage.groupBy({
      by: ["messageType"],
      where: { schoolId },
      _count: { _all: true },
    }),
  ]);

  const recent = await prisma.whatsAppMessage.findMany({
    where: { schoolId },
    select: messageSelect,
    orderBy: { timestamp: "desc" },
    take: 5,
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      configured: WhatsAppService.isConfigured(),
      totals: { total, sent, failed, pending, delivered },
      byType: byType.map((row) => ({
        messageType: row.messageType,
        count: row._count._all,
      })),
      recent,
    },
  });
}
