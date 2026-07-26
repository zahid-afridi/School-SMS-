import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { validateEnum, validateRequired } from "../../utils/validate.js";

const EXAM_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

function requireSchoolId(req: Request): string {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }
  return schoolId;
}

function round1(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parseDate(value: unknown, field: string): Date {
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    throw new AppError(`Invalid ${field}`, HttpStatus.BAD_REQUEST);
  }
  return d;
}

function parseMarks(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(`Invalid ${field}`, HttpStatus.BAD_REQUEST);
  }
  return round1(n);
}

function buildScopeKey(classId: string, sectionId?: string | null) {
  return sectionId ? `CLASS:${classId}:SECTION:${sectionId}` : `CLASS:${classId}`;
}

function gradeFromPercent(percent: number): string {
  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";
  if (percent >= 40) return "E";
  return "F";
}

async function getExamOrThrow(examId: string, schoolId: string) {
  const exam = await getPrisma().exam.findFirst({
    where: { id: examId, schoolId },
  });
  if (!exam) throw new AppError("Exam not found", HttpStatus.NOT_FOUND);
  return exam;
}

const examSubjectInclude = {
  subject: { select: { id: true, name: true, code: true } },
  class: { select: { id: true, className: true } },
  section: { select: { id: true, sectionName: true } },
} as const;

const examListInclude = {
  _count: { select: { subjects: true, marks: true } },
} as const;

/** GET /exams/subjects */
export const listSubjects = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const activeOnly = String(req.query.activeOnly ?? "true") !== "false";
  const subjects = await getPrisma().subject.findMany({
    where: {
      schoolId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { name: "asc" },
  });
  return ApiResponse.success(res, { message: ApiMessages.SUCCESS, data: subjects });
};

/** POST /exams/subjects */
export const createSubject = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const body = req.body ?? {};
  validateRequired(body, ["name"]);
  const name = String(body.name).trim();
  const code =
    typeof body.code === "string" && body.code.trim()
      ? body.code.trim().toUpperCase()
      : null;

  const existing = await getPrisma().subject.findFirst({
    where: { schoolId, name },
  });
  if (existing) {
    throw new AppError("Subject already exists", HttpStatus.CONFLICT);
  }

  const subject = await getPrisma().subject.create({
    data: { schoolId, name, code },
  });
  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: "Subject created",
    data: subject,
  });
};

/** PUT /exams/subjects/:id */
export const updateSubject = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const body = req.body ?? {};

  const subject = await getPrisma().subject.findFirst({
    where: { id, schoolId },
  });
  if (!subject) throw new AppError("Subject not found", HttpStatus.NOT_FOUND);

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : subject.name;

  if (name !== subject.name) {
    const clash = await getPrisma().subject.findFirst({
      where: { schoolId, name, NOT: { id } },
    });
    if (clash) throw new AppError("Subject already exists", HttpStatus.CONFLICT);
  }

  const updated = await getPrisma().subject.update({
    where: { id },
    data: {
      name,
      code:
        body.code !== undefined
          ? typeof body.code === "string" && body.code.trim()
            ? body.code.trim().toUpperCase()
            : null
          : undefined,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
  });

  return ApiResponse.success(res, { message: "Subject updated", data: updated });
};

/** DELETE /exams/subjects/:id */
export const deleteSubject = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const subject = await getPrisma().subject.findFirst({
    where: { id, schoolId },
    include: { _count: { select: { examSubjects: true } } },
  });
  if (!subject) throw new AppError("Subject not found", HttpStatus.NOT_FOUND);
  if (subject._count.examSubjects > 0) {
    await getPrisma().subject.update({
      where: { id },
      data: { isActive: false },
    });
    return ApiResponse.success(res, {
      message: "Subject deactivated (used in exams)",
      data: { id, deactivated: true },
    });
  }
  await getPrisma().subject.delete({ where: { id } });
  return ApiResponse.success(res, {
    message: "Subject deleted",
    data: { id, deleted: true },
  });
};

/** GET /exams */
export const listExams = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { status, search } = req.query;
  const exams = await getPrisma().exam.findMany({
    where: {
      schoolId,
      ...(typeof status === "string" && status
        ? { status: status as (typeof EXAM_STATUSES)[number] }
        : { status: { not: "CANCELLED" } }),
      ...(typeof search === "string" && search.trim()
        ? { name: { contains: search.trim() } }
        : {}),
    },
    include: examListInclude,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
  return ApiResponse.success(res, { message: ApiMessages.SUCCESS, data: exams });
};

/** GET /exams/:id */
export const getExamById = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const exam = await getPrisma().exam.findFirst({
    where: { id, schoolId },
    include: {
      subjects: {
        include: examSubjectInclude,
        orderBy: [{ examDate: "asc" }, { sortOrder: "asc" }],
      },
      _count: { select: { marks: true, subjects: true } },
    },
  });
  if (!exam) throw new AppError("Exam not found", HttpStatus.NOT_FOUND);
  return ApiResponse.success(res, { message: ApiMessages.SUCCESS, data: exam });
};

/** POST /exams */
export const createExam = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const body = req.body ?? {};
  validateRequired(body, ["name", "startDate"]);

  const startDate = parseDate(body.startDate, "startDate");
  const endDate = body.endDate ? parseDate(body.endDate, "endDate") : null;
  if (endDate && endDate < startDate) {
    throw new AppError("endDate cannot be before startDate", HttpStatus.BAD_REQUEST);
  }

  const exam = await getPrisma().exam.create({
    data: {
      schoolId,
      name: String(body.name).trim(),
      startDate,
      endDate,
      academicYear:
        typeof body.academicYear === "string" && body.academicYear.trim()
          ? body.academicYear.trim()
          : null,
      remarks:
        typeof body.remarks === "string" && body.remarks.trim()
          ? body.remarks.trim()
          : null,
      status: "DRAFT",
    },
    include: examListInclude,
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: "Exam created",
    data: exam,
  });
};

/** PUT /exams/:id */
export const updateExam = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const body = req.body ?? {};
  const existing = await getExamOrThrow(id, schoolId);

  if (body.status !== undefined) {
    validateEnum(body.status, EXAM_STATUSES, "Invalid exam status");
  }

  const startDate =
    body.startDate !== undefined
      ? parseDate(body.startDate, "startDate")
      : existing.startDate;
  const endDate =
    body.endDate === null
      ? null
      : body.endDate !== undefined
        ? parseDate(body.endDate, "endDate")
        : existing.endDate;

  if (endDate && startDate && endDate < startDate) {
    throw new AppError("endDate cannot be before startDate", HttpStatus.BAD_REQUEST);
  }

  const updated = await getPrisma().exam.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" && body.name.trim()
        ? { name: body.name.trim() }
        : {}),
      ...(body.startDate !== undefined ? { startDate } : {}),
      ...(body.endDate !== undefined ? { endDate } : {}),
      ...(body.academicYear !== undefined
        ? {
            academicYear:
              typeof body.academicYear === "string" && body.academicYear.trim()
                ? body.academicYear.trim()
                : null,
          }
        : {}),
      ...(body.remarks !== undefined
        ? {
            remarks:
              typeof body.remarks === "string" && body.remarks.trim()
                ? body.remarks.trim()
                : null,
          }
        : {}),
      ...(body.status ? { status: body.status } : {}),
    },
    include: examListInclude,
  });

  return ApiResponse.success(res, { message: "Exam updated", data: updated });
};

/** DELETE /exams/:id */
export const deleteExam = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  await getExamOrThrow(id, schoolId);
  await getPrisma().exam.delete({ where: { id } });
  return ApiResponse.success(res, {
    message: "Exam deleted",
    data: { id, deleted: true },
  });
};

/** GET /exams/:examId/schedule */
export const getExamSchedule = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { examId } = req.params as { examId: string };
  await getExamOrThrow(examId, schoolId);

  const classId =
    typeof req.query.classId === "string" && req.query.classId
      ? req.query.classId
      : null;

  const rows = await getPrisma().examSubject.findMany({
    where: {
      examId,
      ...(classId ? { classId } : {}),
    },
    include: examSubjectInclude,
    orderBy: [{ examDate: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return ApiResponse.success(res, { message: ApiMessages.SUCCESS, data: rows });
};

/** POST /exams/:examId/schedule */
export const addExamSchedule = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { examId } = req.params as { examId: string };
  await getExamOrThrow(examId, schoolId);
  const body = req.body ?? {};
  validateRequired(body, ["subjectId", "classId", "maxMarks"]);

  const classId = String(body.classId);
  const subjectId = String(body.subjectId);
  const sectionId =
    typeof body.sectionId === "string" && body.sectionId
      ? body.sectionId
      : null;

  const [klass, subject] = await Promise.all([
    getPrisma().class.findFirst({ where: { id: classId, schoolId } }),
    getPrisma().subject.findFirst({ where: { id: subjectId, schoolId } }),
  ]);
  if (!klass) throw new AppError("Class not found", HttpStatus.NOT_FOUND);
  if (!subject) throw new AppError("Subject not found", HttpStatus.NOT_FOUND);
  if (!subject.isActive) {
    throw new AppError(
      "Subject is inactive. Activate it or choose another subject.",
      HttpStatus.BAD_REQUEST
    );
  }

  if (sectionId) {
    const section = await getPrisma().section.findFirst({
      where: { id: sectionId, classId },
    });
    if (!section) throw new AppError("Section not found", HttpStatus.NOT_FOUND);
  }

  const maxMarks = parseMarks(body.maxMarks, "maxMarks");
  const passMarks =
    body.passMarks !== undefined
      ? parseMarks(body.passMarks, "passMarks")
      : round1(maxMarks * 0.33);
  if (passMarks > maxMarks) {
    throw new AppError("passMarks cannot exceed maxMarks", HttpStatus.BAD_REQUEST);
  }

  const scopeKey = buildScopeKey(classId, sectionId);
  const existing = await getPrisma().examSubject.findUnique({
    where: {
      examId_subjectId_scopeKey: { examId, subjectId, scopeKey },
    },
  });
  if (existing) {
    throw new AppError(
      sectionId
        ? "This subject is already scheduled for the selected class/section"
        : "This subject is already scheduled for the selected class",
      HttpStatus.CONFLICT
    );
  }

  const row = await getPrisma().examSubject.create({
    data: {
      examId,
      subjectId,
      classId,
      sectionId,
      scopeKey,
      maxMarks,
      passMarks,
      examDate: body.examDate ? parseDate(body.examDate, "examDate") : null,
      startTime:
        typeof body.startTime === "string" && body.startTime.trim()
          ? body.startTime.trim()
          : null,
      endTime:
        typeof body.endTime === "string" && body.endTime.trim()
          ? body.endTime.trim()
          : null,
      room:
        typeof body.room === "string" && body.room.trim()
          ? body.room.trim()
          : null,
      sortOrder: Number.isFinite(Number(body.sortOrder))
        ? Number(body.sortOrder)
        : 0,
    },
    include: examSubjectInclude,
  });

  await getPrisma().exam.updateMany({
    where: { id: examId, status: "DRAFT" },
    data: { status: "SCHEDULED" },
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: "Schedule entry added",
    data: row,
  });
};

/** PUT /exams/schedule/:id */
export const updateExamSchedule = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const body = req.body ?? {};

  const row = await getPrisma().examSubject.findFirst({
    where: { id, exam: { schoolId } },
  });
  if (!row) throw new AppError("Schedule entry not found", HttpStatus.NOT_FOUND);

  const maxMarks =
    body.maxMarks !== undefined
      ? parseMarks(body.maxMarks, "maxMarks")
      : row.maxMarks;
  const passMarks =
    body.passMarks !== undefined
      ? parseMarks(body.passMarks, "passMarks")
      : row.passMarks;
  if (passMarks > maxMarks) {
    throw new AppError("passMarks cannot exceed maxMarks", HttpStatus.BAD_REQUEST);
  }

  const updated = await getPrisma().examSubject.update({
    where: { id },
    data: {
      maxMarks,
      passMarks,
      examDate:
        body.examDate === null
          ? null
          : body.examDate !== undefined
            ? parseDate(body.examDate, "examDate")
            : undefined,
      startTime:
        body.startTime !== undefined
          ? typeof body.startTime === "string" && body.startTime.trim()
            ? body.startTime.trim()
            : null
          : undefined,
      endTime:
        body.endTime !== undefined
          ? typeof body.endTime === "string" && body.endTime.trim()
            ? body.endTime.trim()
            : null
          : undefined,
      room:
        body.room !== undefined
          ? typeof body.room === "string" && body.room.trim()
            ? body.room.trim()
            : null
          : undefined,
      sortOrder:
        body.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))
          ? Number(body.sortOrder)
          : undefined,
    },
    include: examSubjectInclude,
  });

  return ApiResponse.success(res, {
    message: "Schedule updated",
    data: updated,
  });
};

/** DELETE /exams/schedule/:id */
export const deleteExamSchedule = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const row = await getPrisma().examSubject.findFirst({
    where: { id, exam: { schoolId } },
  });
  if (!row) throw new AppError("Schedule entry not found", HttpStatus.NOT_FOUND);
  await getPrisma().examSubject.delete({ where: { id } });
  return ApiResponse.success(res, {
    message: "Schedule entry deleted",
    data: { id, deleted: true },
  });
};

/** GET /exams/:examId/marks-sheet */
export const getMarksSheet = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { examId } = req.params as { examId: string };
  await getExamOrThrow(examId, schoolId);

  const classId = String(req.query.classId || "");
  const subjectId = String(req.query.subjectId || "");
  const sectionId =
    typeof req.query.sectionId === "string" && req.query.sectionId
      ? req.query.sectionId
      : null;

  if (!classId || !subjectId) {
    throw new AppError("classId and subjectId are required", HttpStatus.BAD_REQUEST);
  }

  const scopeKey = buildScopeKey(classId, sectionId);
  let examSubject = await getPrisma().examSubject.findUnique({
    where: {
      examId_subjectId_scopeKey: { examId, subjectId, scopeKey },
    },
    include: examSubjectInclude,
  });

  // Fall back: class-wide paper when section-specific missing
  if (!examSubject && sectionId) {
    examSubject = await getPrisma().examSubject.findUnique({
      where: {
        examId_subjectId_scopeKey: {
          examId,
          subjectId,
          scopeKey: buildScopeKey(classId, null),
        },
      },
      include: examSubjectInclude,
    });
  }

  // Fall back: any section paper for this class+subject when no section filter
  if (!examSubject && !sectionId) {
    examSubject = await getPrisma().examSubject.findFirst({
      where: { examId, subjectId, classId },
      include: examSubjectInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  if (!examSubject) {
    throw new AppError(
      "Subject is not scheduled for this exam/class. Add it in Exam Schedule first.",
      HttpStatus.BAD_REQUEST
    );
  }

  const students = await getPrisma().student.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      enrollments: {
        some: {
          isCurrent: true,
          classId,
          ...(sectionId ? { sectionId } : {}),
        },
      },
    },
    select: {
      id: true,
      name: true,
      registrationNo: true,
      photoUrl: true,
      enrollments: {
        where: { isCurrent: true },
        take: 1,
        select: {
          rollNo: true,
          section: { select: { id: true, sectionName: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const marks = await getPrisma().examMark.findMany({
    where: {
      examSubjectId: examSubject.id,
      studentId: { in: students.map((s) => s.id) },
    },
  });
  const markMap = new Map(marks.map((m) => [m.studentId, m]));

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      examSubject,
      students: students.map((s) => {
        const mark = markMap.get(s.id);
        return {
          studentId: s.id,
          name: s.name,
          registrationNo: s.registrationNo,
          photoUrl: s.photoUrl,
          rollNo: s.enrollments[0]?.rollNo ?? null,
          sectionName: s.enrollments[0]?.section?.sectionName ?? null,
          obtainedMarks: mark?.obtainedMarks ?? null,
          isAbsent: mark?.isAbsent ?? false,
          remarks: mark?.remarks ?? null,
          markId: mark?.id ?? null,
        };
      }),
    },
  });
};

/** PUT /exams/:examId/marks */
export const saveMarks = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { examId } = req.params as { examId: string };
  await getExamOrThrow(examId, schoolId);
  const body = req.body ?? {};
  validateRequired(body, ["examSubjectId", "entries"]);

  const examSubjectId = String(body.examSubjectId);
  const examSubject = await getPrisma().examSubject.findFirst({
    where: { id: examSubjectId, examId, exam: { schoolId } },
  });
  if (!examSubject) {
    throw new AppError("Exam subject not found", HttpStatus.NOT_FOUND);
  }

  if (!Array.isArray(body.entries)) {
    throw new AppError("entries must be an array", HttpStatus.BAD_REQUEST);
  }

  const results = await getPrisma().$transaction(async (tx) => {
    const saved = [];
    const skipped: string[] = [];

    for (const entry of body.entries as Array<{
      studentId?: string;
      obtainedMarks?: unknown;
      isAbsent?: boolean;
      remarks?: string;
    }>) {
      const studentId = String(entry.studentId || "");
      if (!studentId) {
        skipped.push("missing-studentId");
        continue;
      }

      const student = await tx.student.findFirst({
        where: {
          id: studentId,
          schoolId,
          enrollments: {
            some: {
              isCurrent: true,
              classId: examSubject.classId,
              ...(examSubject.sectionId
                ? { sectionId: examSubject.sectionId }
                : {}),
            },
          },
        },
        select: { id: true },
      });
      if (!student) {
        skipped.push(studentId);
        continue;
      }

      const isAbsent = Boolean(entry.isAbsent);
      const hasMarksField = Object.prototype.hasOwnProperty.call(
        entry,
        "obtainedMarks"
      );

      let obtainedMarks: number | null | undefined = undefined;
      if (isAbsent) {
        obtainedMarks = null;
      } else if (hasMarksField) {
        if (
          entry.obtainedMarks === null ||
          entry.obtainedMarks === undefined ||
          entry.obtainedMarks === ""
        ) {
          obtainedMarks = null;
        } else {
          obtainedMarks = parseMarks(entry.obtainedMarks, "obtainedMarks");
          if (obtainedMarks > examSubject.maxMarks) {
            throw new AppError(
              `Marks cannot exceed max (${examSubject.maxMarks}) for a student`,
              HttpStatus.BAD_REQUEST
            );
          }
        }
      }

      const row = await tx.examMark.upsert({
        where: {
          examSubjectId_studentId: { examSubjectId, studentId },
        },
        create: {
          examId,
          examSubjectId,
          studentId,
          obtainedMarks: obtainedMarks ?? null,
          isAbsent,
          remarks:
            typeof entry.remarks === "string" && entry.remarks.trim()
              ? entry.remarks.trim()
              : null,
        },
        update: {
          isAbsent,
          ...(obtainedMarks !== undefined ? { obtainedMarks } : {}),
          remarks:
            entry.remarks !== undefined
              ? typeof entry.remarks === "string" && entry.remarks.trim()
                ? entry.remarks.trim()
                : null
              : undefined,
        },
      });
      saved.push(row);
    }

    if (saved.length === 0 && body.entries.length > 0) {
      throw new AppError(
        "No valid students to save. Students must be enrolled in this class.",
        HttpStatus.BAD_REQUEST
      );
    }

    return { saved, skipped };
  });

  await getPrisma().exam.updateMany({
    where: { id: examId, status: { in: ["DRAFT", "SCHEDULED"] } },
    data: { status: "ONGOING" },
  });

  return ApiResponse.success(res, {
    message: `Saved marks for ${results.saved.length} student(s)`,
    data: {
      saved: results.saved.length,
      skipped: results.skipped.length,
      entries: results.saved,
    },
  });
};

function buildStudentResult(
  subjects: Array<{
    id: string;
    maxMarks: number;
    passMarks: number;
    subject: { id: string; name: string; code: string | null };
    class: { id: string; className: string };
  }>,
  marks: Array<{
    examSubjectId: string;
    obtainedMarks: number | null;
    isAbsent: boolean;
  }>
) {
  const markMap = new Map(marks.map((m) => [m.examSubjectId, m]));
  let totalMax = 0;
  let totalObtained = 0;
  let countedMax = 0; // excludes pending subjects from % denominator
  let passedSubjects = 0;
  let failedSubjects = 0;
  let absentSubjects = 0;
  let pendingSubjects = 0;

  const lines = subjects.map((sub) => {
    const mark = markMap.get(sub.id);
    const obtained = mark?.isAbsent ? null : (mark?.obtainedMarks ?? null);
    const isAbsent = mark?.isAbsent ?? false;
    totalMax += sub.maxMarks;

    let status: "PASS" | "FAIL" | "ABSENT" | "PENDING" = "PENDING";
    if (isAbsent) {
      status = "ABSENT";
      absentSubjects += 1;
      countedMax += sub.maxMarks;
    } else if (obtained === null || obtained === undefined) {
      status = "PENDING";
      pendingSubjects += 1;
    } else {
      countedMax += sub.maxMarks;
      totalObtained += obtained;
      if (obtained >= sub.passMarks) {
        status = "PASS";
        passedSubjects += 1;
      } else {
        status = "FAIL";
        failedSubjects += 1;
      }
    }

    const percent =
      obtained !== null && sub.maxMarks > 0
        ? round1((obtained / sub.maxMarks) * 100)
        : isAbsent && sub.maxMarks > 0
          ? 0
          : null;

    return {
      examSubjectId: sub.id,
      subjectId: sub.subject.id,
      subjectName: sub.subject.name,
      subjectCode: sub.subject.code,
      className: sub.class.className,
      maxMarks: sub.maxMarks,
      passMarks: sub.passMarks,
      obtainedMarks: obtained,
      isAbsent,
      percent,
      grade:
        percent !== null
          ? gradeFromPercent(percent)
          : isAbsent
            ? "Abs"
            : null,
      status,
    };
  });

  const overallPercent =
    countedMax > 0 ? round1((totalObtained / countedMax) * 100) : 0;
  const overallStatus =
    subjects.length === 0
      ? "PENDING"
      : absentSubjects === subjects.length
        ? "ABSENT"
        : pendingSubjects > 0
          ? "PENDING"
          : failedSubjects > 0
            ? "FAIL"
            : "PASS";

  const grade =
    subjects.length === 0 ||
    overallStatus === "PENDING" ||
    overallStatus === "ABSENT"
      ? "—"
      : gradeFromPercent(overallPercent);

  return {
    lines,
    summary: {
      totalMax: round1(totalMax),
      totalObtained: round1(totalObtained),
      overallPercent,
      grade,
      passedSubjects,
      failedSubjects,
      absentSubjects,
      subjectCount: subjects.length,
      overallStatus,
    },
  };
}

/** GET /exams/:examId/result-card/:studentId */
export const getResultCard = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { examId, studentId } = req.params as {
    examId: string;
    studentId: string;
  };
  const exam = await getExamOrThrow(examId, schoolId);

  const [school, student] = await Promise.all([
    getPrisma().school.findFirst({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
      },
    }),
    getPrisma().student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        name: true,
        registrationNo: true,
        photoUrl: true,
        dateOfBirth: true,
        gender: true,
        contactPhone: true,
        email: true,
        address: true,
        city: true,
        admissionDate: true,
        religion: true,
        nationality: true,
        enrollments: {
          where: { isCurrent: true },
          take: 1,
          select: {
            rollNo: true,
            academicYear: true,
            class: { select: { id: true, className: true } },
            section: { select: { id: true, sectionName: true } },
          },
        },
        parents: {
          include: {
            parent: {
              select: {
                name: true,
                type: true,
                mobileNo: true,
                occupation: true,
                nationalId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!student) {
    throw new AppError(ApiMessages.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const enrollment = student.enrollments[0];
  if (!enrollment) {
    throw new AppError("Student has no current enrollment", HttpStatus.BAD_REQUEST);
  }

  const subjects = await getPrisma().examSubject.findMany({
    where: {
      examId,
      classId: enrollment.class.id,
      OR: [
        { sectionId: null },
        ...(enrollment.section?.id
          ? [{ sectionId: enrollment.section.id }]
          : []),
      ],
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, className: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { examDate: "asc" }],
  });

  const bySubject = new Map<string, (typeof subjects)[0]>();
  for (const s of subjects) {
    const existing = bySubject.get(s.subjectId);
    if (!existing) bySubject.set(s.subjectId, s);
    else if (!existing.sectionId && s.sectionId) bySubject.set(s.subjectId, s);
  }
  const subjectList = [...bySubject.values()];

  const marks = await getPrisma().examMark.findMany({
    where: {
      examId,
      studentId,
      examSubjectId: { in: subjectList.map((s) => s.id) },
    },
  });

  const result = buildStudentResult(subjectList, marks);

  // Class position among active classmates with marks entered
  const classmates = await getPrisma().student.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      enrollments: {
        some: {
          isCurrent: true,
          classId: enrollment.class.id,
          ...(enrollment.section?.id
            ? { sectionId: enrollment.section.id }
            : {}),
        },
      },
    },
    select: { id: true },
  });

  const classmateMarks = await getPrisma().examMark.findMany({
    where: {
      examId,
      examSubjectId: { in: subjectList.map((s) => s.id) },
      studentId: { in: classmates.map((c) => c.id) },
    },
  });

  const marksByStudent = new Map<string, typeof classmateMarks>();
  for (const m of classmateMarks) {
    const list = marksByStudent.get(m.studentId) ?? [];
    list.push(m);
    marksByStudent.set(m.studentId, list);
  }

  type RankRow = { studentId: string; percent: number };
  const rankRows: RankRow[] = [];
  for (const mate of classmates) {
    const mateResult = buildStudentResult(
      subjectList,
      marksByStudent.get(mate.id) ?? []
    );
    // Only rank students who have at least one graded/absent subject
    const hasAnyEntry = (marksByStudent.get(mate.id) ?? []).length > 0;
    if (!hasAnyEntry) continue;
    if (mateResult.summary.overallStatus === "PENDING") continue;
    rankRows.push({
      studentId: mate.id,
      percent: mateResult.summary.overallPercent,
    });
  }

  rankRows.sort((a, b) => b.percent - a.percent);

  // Dense? Standard competition ranking: 1,2,2,4
  let classPosition: number | null = null;
  let lastPercent: number | null = null;
  let lastRank = 0;
  for (let i = 0; i < rankRows.length; i++) {
    const row = rankRows[i];
    const rank =
      lastPercent !== null && row.percent === lastPercent ? lastRank : i + 1;
    lastPercent = row.percent;
    lastRank = rank;
    if (row.studentId === studentId) {
      classPosition = rank;
      break;
    }
  }
  const classStrength = classmates.length;

  const father = student.parents.find((p) => p.parent.type === "FATHER")?.parent;
  const mother = student.parents.find((p) => p.parent.type === "MOTHER")?.parent;
  const guardian = student.parents.find(
    (p) => p.parent.type === "GUARDIAN"
  )?.parent;

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      issuedAt: new Date().toISOString(),
      school: school
        ? {
            id: school.id,
            name: school.name,
            address: school.address,
            phone: school.phone,
            email: school.email,
            website: school.website,
            logoUrl: school.logoUrl,
          }
        : null,
      exam: {
        id: exam.id,
        name: exam.name,
        startDate: exam.startDate,
        endDate: exam.endDate,
        academicYear: exam.academicYear ?? enrollment.academicYear,
        status: exam.status,
      },
      student: {
        id: student.id,
        name: student.name,
        registrationNo: student.registrationNo,
        photoUrl: student.photoUrl,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        contactPhone: student.contactPhone,
        email: student.email,
        address: student.address,
        city: student.city,
        admissionDate: student.admissionDate,
        religion: student.religion,
        nationality: student.nationality,
        rollNo: enrollment.rollNo,
        className: enrollment.class.className,
        sectionName: enrollment.section?.sectionName ?? null,
        academicYear: enrollment.academicYear,
        fatherName: father?.name ?? null,
        fatherPhone: father?.mobileNo ?? null,
        fatherOccupation: father?.occupation ?? null,
        fatherCnic: father?.nationalId ?? null,
        motherName: mother?.name ?? null,
        motherPhone: mother?.mobileNo ?? null,
        guardianName: guardian?.name ?? null,
        guardianPhone: guardian?.mobileNo ?? null,
      },
      classPosition,
      classStrength,
      ...result,
    },
  });
};

/** GET /exams/:examId/result-sheet */
export const getResultSheet = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { examId } = req.params as { examId: string };
  const exam = await getExamOrThrow(examId, schoolId);

  const classId = String(req.query.classId || "");
  if (!classId) {
    throw new AppError("classId is required", HttpStatus.BAD_REQUEST);
  }
  const sectionId =
    typeof req.query.sectionId === "string" && req.query.sectionId
      ? req.query.sectionId
      : null;

  const klass = await getPrisma().class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, className: true },
  });
  if (!klass) throw new AppError("Class not found", HttpStatus.NOT_FOUND);

  const subjects = await getPrisma().examSubject.findMany({
    where: {
      examId,
      classId,
      ...(sectionId ? { OR: [{ sectionId }, { sectionId: null }] } : {}),
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, className: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { examDate: "asc" }],
  });

  const bySubject = new Map<string, (typeof subjects)[0]>();
  for (const s of subjects) {
    const existing = bySubject.get(s.subjectId);
    if (!existing) bySubject.set(s.subjectId, s);
    else if (!existing.sectionId && s.sectionId) bySubject.set(s.subjectId, s);
  }
  const subjectList = [...bySubject.values()];

  const students = await getPrisma().student.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      enrollments: {
        some: {
          isCurrent: true,
          classId,
          ...(sectionId ? { sectionId } : {}),
        },
      },
    },
    select: {
      id: true,
      name: true,
      registrationNo: true,
      enrollments: {
        where: { isCurrent: true },
        take: 1,
        select: {
          rollNo: true,
          section: { select: { sectionName: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const allMarks = await getPrisma().examMark.findMany({
    where: {
      examId,
      examSubjectId: { in: subjectList.map((s) => s.id) },
      studentId: { in: students.map((s) => s.id) },
    },
  });

  const rows = students.map((student) => {
    const studentMarks = allMarks.filter((m) => m.studentId === student.id);
    const result = buildStudentResult(subjectList, studentMarks);
    return {
      student: {
        id: student.id,
        name: student.name,
        registrationNo: student.registrationNo,
        rollNo: student.enrollments[0]?.rollNo ?? null,
        sectionName: student.enrollments[0]?.section?.sectionName ?? null,
      },
      ...result,
    };
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      exam: {
        id: exam.id,
        name: exam.name,
        startDate: exam.startDate,
        endDate: exam.endDate,
      },
      class: klass,
      sectionId,
      subjects: subjectList.map((s) => ({
        id: s.id,
        subjectId: s.subjectId,
        name: s.subject.name,
        code: s.subject.code,
        maxMarks: s.maxMarks,
        passMarks: s.passMarks,
      })),
      rows,
    },
  });
};

/** GET /exams/:examId/date-sheet */
export const getDateSheet = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { examId } = req.params as { examId: string };
  const exam = await getExamOrThrow(examId, schoolId);
  const classId =
    typeof req.query.classId === "string" && req.query.classId
      ? req.query.classId
      : null;

  const rows = await getPrisma().examSubject.findMany({
    where: {
      examId,
      ...(classId ? { classId } : {}),
    },
    include: examSubjectInclude,
    orderBy: [{ examDate: "asc" }, { startTime: "asc" }, { sortOrder: "asc" }],
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      exam: {
        id: exam.id,
        name: exam.name,
        startDate: exam.startDate,
        endDate: exam.endDate,
        academicYear: exam.academicYear,
      },
      entries: rows,
    },
  });
};

/** GET /exams/:examId/award-list */
export const getAwardList = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { examId } = req.params as { examId: string };
  const exam = await getExamOrThrow(examId, schoolId);

  const classId = String(req.query.classId || "");
  const subjectId = String(req.query.subjectId || "");
  const blank = String(req.query.blank ?? "true") !== "false";
  const sectionId =
    typeof req.query.sectionId === "string" && req.query.sectionId
      ? req.query.sectionId
      : null;

  if (!classId || !subjectId) {
    throw new AppError("classId and subjectId are required", HttpStatus.BAD_REQUEST);
  }

  const scopeKey = buildScopeKey(classId, sectionId);
  let examSubject = await getPrisma().examSubject.findUnique({
    where: {
      examId_subjectId_scopeKey: { examId, subjectId, scopeKey },
    },
    include: examSubjectInclude,
  });
  if (!examSubject && sectionId) {
    examSubject = await getPrisma().examSubject.findUnique({
      where: {
        examId_subjectId_scopeKey: {
          examId,
          subjectId,
          scopeKey: buildScopeKey(classId, null),
        },
      },
      include: examSubjectInclude,
    });
  }
  if (!examSubject && !sectionId) {
    examSubject = await getPrisma().examSubject.findFirst({
      where: { examId, subjectId, classId },
      include: examSubjectInclude,
      orderBy: { createdAt: "asc" },
    });
  }
  if (!examSubject) {
    throw new AppError(
      "Subject is not scheduled for this exam/class",
      HttpStatus.BAD_REQUEST
    );
  }

  const students = await getPrisma().student.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      enrollments: {
        some: {
          isCurrent: true,
          classId,
          ...(sectionId ? { sectionId } : {}),
        },
      },
    },
    select: {
      id: true,
      name: true,
      registrationNo: true,
      enrollments: {
        where: { isCurrent: true },
        take: 1,
        select: {
          rollNo: true,
          section: { select: { sectionName: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  let markMap = new Map<
    string,
    { obtainedMarks: number | null; isAbsent: boolean }
  >();
  if (!blank) {
    const marks = await getPrisma().examMark.findMany({
      where: {
        examSubjectId: examSubject.id,
        studentId: { in: students.map((s) => s.id) },
      },
    });
    markMap = new Map(
      marks.map((m) => [
        m.studentId,
        { obtainedMarks: m.obtainedMarks, isAbsent: m.isAbsent },
      ])
    );
  }

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      blank,
      exam: { id: exam.id, name: exam.name },
      examSubject,
      students: students.map((s, index) => {
        const mark = markMap.get(s.id);
        return {
          sr: index + 1,
          studentId: s.id,
          name: s.name,
          registrationNo: s.registrationNo,
          rollNo: s.enrollments[0]?.rollNo ?? null,
          sectionName: s.enrollments[0]?.section?.sectionName ?? null,
          obtainedMarks: blank ? null : (mark?.obtainedMarks ?? null),
          isAbsent: blank ? false : (mark?.isAbsent ?? false),
        };
      }),
    },
  });
};
