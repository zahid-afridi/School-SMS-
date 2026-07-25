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
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { enrollments: true },
  },
  sections: {
    select: {
      id: true,
      sectionName: true,
      teacherId: true,
      teacher: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          designation: true,
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: { sectionName: "asc" as const },
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

type SectionInput = {
  id?: string;
  sectionName: string;
  teacherId: string | null;
};

function parseSections(value: unknown, { requireNonEmpty = true } = {}): SectionInput[] {
  if (!Array.isArray(value)) {
    throw new AppError("Sections must be an array", HttpStatus.BAD_REQUEST);
  }
  if (requireNonEmpty && value.length === 0) {
    throw new AppError("At least one section is required", HttpStatus.BAD_REQUEST);
  }

  const parsed: SectionInput[] = value.map((section, index) => {
    if (typeof section === "string") {
      const sectionName = section.trim();
      if (!sectionName) {
        throw new AppError(`Invalid section at index ${index}`, HttpStatus.BAD_REQUEST);
      }
      return { sectionName, teacherId: null };
    }

    if (typeof section === "object" && section !== null) {
      const raw = section as {
        id?: unknown;
        sectionName?: unknown;
        teacherId?: unknown;
      };
      const sectionName = String(raw.sectionName ?? "").trim();
      const teacherId = normalizeTeacherId(raw.teacherId);
      const id =
        raw.id !== undefined && raw.id !== null && String(raw.id).trim() !== ""
          ? String(raw.id)
          : undefined;
      if (!sectionName) {
        throw new AppError(`Invalid sectionName at index ${index}`, HttpStatus.BAD_REQUEST);
      }
      return { id, sectionName, teacherId };
    }

    throw new AppError(`Invalid section format at index ${index}`, HttpStatus.BAD_REQUEST);
  });

  const uniqueNames = new Set(parsed.map((s) => s.sectionName.toLowerCase()));
  if (uniqueNames.size !== parsed.length) {
    throw new AppError("Section names must be unique per class", HttpStatus.BAD_REQUEST);
  }

  return parsed;
}

async function validateSectionTeachers(sections: SectionInput[], schoolId: string) {
  const teacherIds = sections
    .map((section) => section.teacherId)
    .filter((id): id is string => Boolean(id));

  if (teacherIds.length === 0) return;

  const teachers = await getPrisma().employee.findMany({
    where: { id: { in: teacherIds }, schoolId, designation: "TEACHER" },
    select: { id: true },
  });

  const validTeacherIds = new Set(teachers.map((teacher) => teacher.id));
  const invalidTeacherId = teacherIds.find((id) => !validTeacherIds.has(id));
  if (invalidTeacherId) {
    throw new AppError(`Invalid teacherId: ${invalidTeacherId}`, HttpStatus.BAD_REQUEST);
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
  const { className, montlyFee, sections } = body;

  validateRequired(body, ["className", "montlyFee", "sections"]);

  const parsedFee = parseMonthlyFee(montlyFee);
  const parsedSections = parseSections(sections);
  await validateSectionTeachers(parsedSections, schoolId);
  await assertUniqueClassName(schoolId, className);

  const createdClass = await getPrisma().$transaction(async (tx) => {
    const created = await tx.class.create({
      data: {
        className: className.trim(),
        montlyFee: parsedFee,
        schoolId,
      },
    });

    await tx.section.createMany({
      data: parsedSections.map((section) => ({
        sectionName: section.sectionName,
        teacherId: section.teacherId,
        classId: created.id,
      })),
    });

    return tx.class.findUniqueOrThrow({
      where: { id: created.id },
      select: classSelect,
    });
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
  const { className, montlyFee, sections } = body;

  validateRequired(body, ["className", "montlyFee"]);

  const parsedFee = parseMonthlyFee(montlyFee);
  await assertUniqueClassName(schoolId, className, id);

  const parsedSections =
    sections === undefined ? null : parseSections(sections, { requireNonEmpty: true });

  if (parsedSections) {
    await validateSectionTeachers(parsedSections, schoolId);
  }

  const updatedClass = await getPrisma().$transaction(async (tx) => {
    await tx.class.update({
      where: { id },
      data: {
        className: className.trim(),
        montlyFee: parsedFee,
      },
    });

    if (parsedSections) {
      const existingSections = await tx.section.findMany({
        where: { classId: id },
        select: { id: true },
      });
      const existingIds = new Set(existingSections.map((s) => s.id));
      const keepIds = new Set(
        parsedSections.map((s) => s.id).filter((sid): sid is string => Boolean(sid))
      );

      for (const sid of existingIds) {
        if (!keepIds.has(sid)) {
          await tx.section.delete({ where: { id: sid } });
        }
      }

      for (const section of parsedSections) {
        if (section.id && existingIds.has(section.id)) {
          await tx.section.update({
            where: { id: section.id },
            data: {
              sectionName: section.sectionName,
              teacherId: section.teacherId,
            },
          });
        } else {
          await tx.section.create({
            data: {
              classId: id,
              sectionName: section.sectionName,
              teacherId: section.teacherId,
            },
          });
        }
      }
    }

    return tx.class.findUniqueOrThrow({
      where: { id },
      select: classSelect,
    });
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

  const enrollmentCount = await getPrisma().studentEnrollment.count({
    where: { classId: id },
  });
  if (enrollmentCount > 0) {
    throw new AppError(
      `Cannot delete class with ${enrollmentCount} enrolled student(s)`,
      HttpStatus.CONFLICT
    );
  }

  await getPrisma().class.delete({ where: { id } });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.DELETED,
  });
};

async function findSectionInSchool(sectionId: string, schoolId: string) {
  const section = await getPrisma().section.findFirst({
    where: { id: sectionId, class: { schoolId } },
    select: {
      id: true,
      sectionName: true,
      classId: true,
      teacherId: true,
      createdAt: true,
      updatedAt: true,
      teacher: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          designation: true,
        },
      },
    },
  });

  if (!section) {
    throw new AppError(ApiMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return section;
}

async function assertUniqueSectionNameInClass(
  classId: string,
  sectionName: string,
  excludeId?: string
) {
  const existing = await getPrisma().section.findFirst({
    where: {
      classId,
      sectionName: sectionName.trim(),
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Section with this name already exists in class", HttpStatus.CONFLICT);
  }
}

export const createSection = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const body = req.body ?? {};
  const { classId, sectionName, teacherId } = body;

  validateRequired(body, ["classId", "sectionName"]);
  await findClassInSchool(String(classId), schoolId);

  const normalizedTeacherId = normalizeTeacherId(teacherId);
  await validateSectionTeachers([{ sectionName: String(sectionName), teacherId: normalizedTeacherId }], schoolId);
  await assertUniqueSectionNameInClass(String(classId), String(sectionName));

  const section = await getPrisma().section.create({
    data: {
      classId: String(classId),
      sectionName: String(sectionName).trim(),
      teacherId: normalizedTeacherId,
    },
  });

  const createdSection = await findSectionInSchool(section.id, schoolId);

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.CREATED,
    data: createdSection,
  });
};

export const getAllSections = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);

  const sections = await getPrisma().section.findMany({
    where: { class: { schoolId } },
    select: {
      id: true,
      sectionName: true,
      classId: true,
      teacherId: true,
      createdAt: true,
      updatedAt: true,
      class: { select: { id: true, className: true } },
      teacher: {
        select: { id: true, name: true, employeeCode: true, designation: true },
      },
    },
    orderBy: [{ class: { className: "asc" } }, { sectionName: "asc" }],
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: sections,
  });
};

export const getSectionById = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const section = await findSectionInSchool(id, schoolId);

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: section,
  });
};

export const updateSection = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const existing = await findSectionInSchool(id, schoolId);

  const body = req.body ?? {};
  const { sectionName, teacherId } = body;
  validateRequired(body, ["sectionName"]);

  const normalizedTeacherId = normalizeTeacherId(teacherId);
  await validateSectionTeachers(
    [{ sectionName: String(sectionName), teacherId: normalizedTeacherId }],
    schoolId
  );
  await assertUniqueSectionNameInClass(existing.classId, String(sectionName), id);

  await getPrisma().section.update({
    where: { id },
    data: {
      sectionName: String(sectionName).trim(),
      teacherId: normalizedTeacherId,
    },
  });

  const updatedSection = await findSectionInSchool(id, schoolId);
  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.UPDATED,
    data: updatedSection,
  });
};

export const deleteSection = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const existing = await findSectionInSchool(id, schoolId);

  const siblingCount = await getPrisma().section.count({
    where: { classId: existing.classId },
  });
  if (siblingCount <= 1) {
    throw new AppError(
      "Cannot delete the last section of a class",
      HttpStatus.BAD_REQUEST
    );
  }

  const enrollmentCount = await getPrisma().studentEnrollment.count({
    where: { sectionId: id },
  });
  if (enrollmentCount > 0) {
    throw new AppError(
      `Cannot delete section with ${enrollmentCount} enrolled student(s)`,
      HttpStatus.CONFLICT
    );
  }

  await getPrisma().section.delete({ where: { id } });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.DELETED,
  });
};
