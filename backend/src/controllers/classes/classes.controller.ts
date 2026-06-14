import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { validateRequired } from "../../utils/validate.js";

const classSelect = {
  id: true,
  className: true,
  montlyFee: true,
  schoolId: true,
  classTeacherId: true,
  createdAt: true,
  updatedAt: true,
  classTeacher: {
    select: {
      id: true,
      name: true,
      employeeCode: true,
      designation: true,
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

function parseMonthlyFee(value: unknown): number {
  const fee = Number(value);
  if (Number.isNaN(fee) || fee < 0) {
    throw new AppError("Invalid monthly fee", HttpStatus.BAD_REQUEST);
  }
  return fee;
}

function normalizeTeacherId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

async function validateClassTeacher(classTeacherId: string | null, schoolId: string) {
  if (!classTeacherId) return;

  const teacher = await getPrisma().employee.findFirst({
    where: { id: classTeacherId, schoolId },
    select: { id: true, designation: true },
  });

  if (!teacher) {
    throw new AppError("Class teacher not found", HttpStatus.NOT_FOUND);
  }

  if (teacher.designation !== "TEACHER") {
    throw new AppError("Class teacher must be a teacher", HttpStatus.BAD_REQUEST);
  }
}

async function findClassInSchool(id: string, schoolId: string) {
  const classRecord = await getPrisma().class.findFirst({
    where: { id, schoolId },
    select: classSelect,
  });

  if (!classRecord) {
    throw new AppError(ApiMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return classRecord;
}

async function assertUniqueClassName(
  schoolId: string,
  className: string,
  excludeId?: string
) {
  const trimmedName = className.trim();
  const existing = await getPrisma().class.findFirst({
    where: {
      schoolId,
      className: trimmedName,
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Class with this name already exists", HttpStatus.CONFLICT);
  }
}

export const createClass = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const body = req.body ?? {};
  const { className, montlyFee, classTeacherId } = body;

  validateRequired(body, ["className", "montlyFee"]);

  const parsedFee = parseMonthlyFee(montlyFee);
  const teacherId = normalizeTeacherId(classTeacherId);
  await validateClassTeacher(teacherId, schoolId);
  await assertUniqueClassName(schoolId, className);

  const createdClass = await getPrisma().class.create({
    data: {
      className: className.trim(),
      montlyFee: parsedFee,
      schoolId,
      classTeacherId: teacherId,
    },
    select: classSelect,
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.CREATED,
    data: createdClass,
  });
};

export const getAllClasses = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);

  const classes = await getPrisma().class.findMany({
    where: { schoolId },
    select: classSelect,
    orderBy: { className: "asc" },
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: classes,
  });
};

export const getClassById = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const classRecord = await findClassInSchool(id, schoolId);

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: classRecord,
  });
};

export const updateClass = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  await findClassInSchool(id, schoolId);

  const body = req.body ?? {};
  const { className, montlyFee, classTeacherId } = body;

  validateRequired(body, ["className", "montlyFee"]);

  const parsedFee = parseMonthlyFee(montlyFee);
  const teacherId = normalizeTeacherId(classTeacherId);
  await validateClassTeacher(teacherId, schoolId);
  await assertUniqueClassName(schoolId, className, id);

  const updatedClass = await getPrisma().class.update({
    where: { id },
    data: {
      className: className.trim(),
      montlyFee: parsedFee,
      classTeacherId: teacherId,
    },
    select: classSelect,
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.UPDATED,
    data: updatedClass,
  });
};

export const deleteClass = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  await findClassInSchool(id, schoolId);

  await getPrisma().class.delete({ where: { id } });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.DELETED,
  });
};
