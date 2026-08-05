import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import {
  deleteCustomTemplate,
  listTemplates,
  upsertTemplates,
} from "../../services/whatsapp/templates.js";

function requireSchoolId(req: Request): string {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }
  return schoolId;
}

/** GET /api/whatsapp/templates */
export async function getMessageTemplates(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  const data = await listTemplates(schoolId);
  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data,
  });
}

/** PUT /api/whatsapp/templates — upsert one or many */
export async function saveMessageTemplates(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  const items = Array.isArray(req.body?.templates)
    ? req.body.templates
    : [req.body];

  const data = await upsertTemplates(
    schoolId,
    items.map((t: Record<string, unknown>) => ({
      key: String(t.key ?? ""),
      name: String(t.name ?? ""),
      body: String(t.body ?? ""),
      isActive: t.isActive !== false,
    }))
  );

  return ApiResponse.success(res, {
    message: "Templates saved",
    data,
  });
}

/** DELETE /api/whatsapp/templates/:key — custom templates only */
export async function removeMessageTemplate(req: Request, res: Response) {
  const schoolId = requireSchoolId(req);
  const key = String(req.params.key ?? "").trim();
  try {
    const data = await deleteCustomTemplate(schoolId, key);
    return ApiResponse.success(res, {
      message: "Template deleted",
      data,
    });
  } catch (err) {
    throw new AppError(
      err instanceof Error ? err.message : "Cannot delete template",
      HttpStatus.BAD_REQUEST
    );
  }
}
