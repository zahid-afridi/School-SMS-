import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { validateEnum, validateRequired } from "../../utils/validate.js";

const ATTENDANCE_STATUSES = ["PRESENT", "LEAVE", "ABSENT"] as const;
type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

function requireSchoolId(req: Request): string {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }
  return schoolId;
}

function parseDateKey(value: unknown): { dateKey: string; date: Date } {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AppError("date must be YYYY-MM-DD", HttpStatus.BAD_REQUEST);
  }
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Invalid date", HttpStatus.BAD_REQUEST);
  }
  return { dateKey: raw, date };
}

function buildScopeKey(classId: string, sectionId?: string | null) {
  if (sectionId) return `CLASS:${classId}:SECTION:${sectionId}`;
  return `CLASS:${classId}`;
}

async function assertClassInSchool(classId: string, schoolId: string) {
  const cls = await getPrisma().class.findFirst({
    where: { id: classId, schoolId },
    select: {
      id: true,
      className: true,
      sections: { select: { id: true, sectionName: true }, orderBy: { sectionName: "asc" } },
    },
  });
  if (!cls) throw new AppError("Class not found", HttpStatus.NOT_FOUND);
  return cls;
}

async function getEnrolledStudents(
  schoolId: string,
  classId: string,
  sectionId?: string | null
) {
  return getPrisma().student.findMany({
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
        where: {
          isCurrent: true,
          classId,
          ...(sectionId ? { sectionId } : {}),
        },
        take: 1,
        select: {
          rollNo: true,
          section: { select: { id: true, sectionName: true } },
        },
      },
      parents: {
        take: 1,
        orderBy: { isPrimaryGuardian: "desc" },
        select: {
          parent: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

function formatStudentRow(
  student: Awaited<ReturnType<typeof getEnrolledStudents>>[number],
  status?: AttendanceStatus | null
) {
  const enrollment = student.enrollments[0];
  const parentName = student.parents[0]?.parent.name ?? null;
  return {
    studentId: student.id,
    name: student.name,
    registrationNo: student.registrationNo,
    photoUrl: student.photoUrl,
    rollNo: enrollment?.rollNo ?? null,
    sectionName: enrollment?.section?.sectionName ?? null,
    parentName,
    status: status ?? ("PRESENT" as AttendanceStatus),
  };
}

/** GET /attendance/students/sheet?date=&classId=&sectionId= */
export const getStudentAttendanceSheet = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const classId = String(req.query.classId ?? "");
  const sectionId =
    typeof req.query.sectionId === "string" && req.query.sectionId
      ? req.query.sectionId
      : null;

  if (!classId) throw new AppError("classId is required", HttpStatus.BAD_REQUEST);
  if (!req.query.date) throw new AppError("date is required", HttpStatus.BAD_REQUEST);

  const { dateKey, date } = parseDateKey(req.query.date);
  const cls = await assertClassInSchool(classId, schoolId);

  if (sectionId) {
    const sectionOk = cls.sections.some((s) => s.id === sectionId);
    if (!sectionOk) throw new AppError("Section not found in class", HttpStatus.BAD_REQUEST);
  }

  const scopeKey = buildScopeKey(classId, sectionId);
  const students = await getEnrolledStudents(schoolId, classId, sectionId);

  const sheet = await getPrisma().studentAttendanceSheet.findUnique({
    where: {
      schoolId_scopeKey_dateKey: { schoolId, scopeKey, dateKey },
    },
    include: {
      entries: true,
      section: { select: { id: true, sectionName: true } },
    },
  });

  const statusMap = new Map(
    (sheet?.entries ?? []).map((e) => [e.studentId, e.status as AttendanceStatus])
  );

  const rows = students.map((s) =>
    formatStudentRow(s, statusMap.get(s.id) ?? null)
  );

  const counts = {
    present: rows.filter((r) => r.status === "PRESENT").length,
    leave: rows.filter((r) => r.status === "LEAVE").length,
    absent: rows.filter((r) => r.status === "ABSENT").length,
    total: rows.length,
  };

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      dateKey,
      date,
      alreadyTaken: Boolean(sheet),
      sheetId: sheet?.id ?? null,
      class: { id: cls.id, className: cls.className },
      section: sheet?.section
        ?? (sectionId
          ? cls.sections.find((s) => s.id === sectionId) ?? null
          : null),
      sections: cls.sections,
      students: rows,
      counts,
      updatedAt: sheet?.updatedAt ?? null,
    },
  });
};

/** PUT /attendance/students/sheet */
export const saveStudentAttendanceSheet = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const body = req.body ?? {};
  validateRequired(body, ["date", "classId", "entries"]);

  const { dateKey, date } = parseDateKey(body.date);
  const classId = String(body.classId);
  const sectionId =
    typeof body.sectionId === "string" && body.sectionId
      ? body.sectionId
      : null;

  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    throw new AppError("entries are required", HttpStatus.BAD_REQUEST);
  }

  const cls = await assertClassInSchool(classId, schoolId);
  if (sectionId && !cls.sections.some((s) => s.id === sectionId)) {
    throw new AppError("Section not found in class", HttpStatus.BAD_REQUEST);
  }

  const enrolled = await getEnrolledStudents(schoolId, classId, sectionId);
  const enrolledIds = new Set(enrolled.map((s) => s.id));

  const entries = body.entries.map(
    (item: { studentId?: string; status?: string; remarks?: string }) => {
      const studentId = String(item.studentId ?? "");
      if (!enrolledIds.has(studentId)) {
        throw new AppError(
          `Student ${studentId} is not enrolled in this class/section`,
          HttpStatus.BAD_REQUEST
        );
      }
      validateEnum(
        String(item.status ?? ""),
        ATTENDANCE_STATUSES,
        "Invalid attendance status"
      );
      return {
        studentId,
        status: String(item.status) as AttendanceStatus,
        remarks:
          typeof item.remarks === "string" && item.remarks.trim()
            ? item.remarks.trim()
            : null,
      };
    }
  );

  const scopeKey = buildScopeKey(classId, sectionId);

  const sheet = await getPrisma().$transaction(async (tx) => {
    const saved = await tx.studentAttendanceSheet.upsert({
      where: {
        schoolId_scopeKey_dateKey: { schoolId, scopeKey, dateKey },
      },
      create: {
        schoolId,
        classId,
        sectionId,
        scopeKey,
        dateKey,
        date,
        takenByUserId: req.user?.userId ?? null,
        remarks:
          typeof body.remarks === "string" ? body.remarks.trim() : null,
      },
      update: {
        takenByUserId: req.user?.userId ?? null,
        remarks:
          typeof body.remarks === "string" ? body.remarks.trim() : null,
      },
    });

    // Replace entries for this sheet
    await tx.studentAttendanceEntry.deleteMany({ where: { sheetId: saved.id } });
    await tx.studentAttendanceEntry.createMany({
      data: entries.map(
        (e: {
          studentId: string;
          status: AttendanceStatus;
          remarks: string | null;
        }) => ({
          sheetId: saved.id,
          studentId: e.studentId,
          status: e.status,
          remarks: e.remarks,
        })
      ),
    });

    return tx.studentAttendanceSheet.findUniqueOrThrow({
      where: { id: saved.id },
      include: {
        entries: true,
        class: { select: { id: true, className: true } },
        section: { select: { id: true, sectionName: true } },
      },
    });
  });

  return ApiResponse.success(res, {
    message: "Attendance saved successfully",
    data: {
      ...sheet,
      alreadyTaken: true,
      dateKey,
    },
  });
};

/** GET /attendance/students/records */
export const listStudentAttendanceRecords = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const classId =
    typeof req.query.classId === "string" && req.query.classId
      ? req.query.classId
      : null;
  const from =
    typeof req.query.from === "string" && req.query.from
      ? parseDateKey(req.query.from).dateKey
      : null;
  const to =
    typeof req.query.to === "string" && req.query.to
      ? parseDateKey(req.query.to).dateKey
      : null;

  const sheets = await getPrisma().studentAttendanceSheet.findMany({
    where: {
      schoolId,
      ...(classId ? { classId } : {}),
      ...(from || to
        ? {
            dateKey: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      class: { select: { id: true, className: true } },
      section: { select: { id: true, sectionName: true } },
      entries: { select: { status: true } },
    },
    orderBy: [{ dateKey: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const data = sheets.map((sheet) => {
    const present = sheet.entries.filter((e) => e.status === "PRESENT").length;
    const leave = sheet.entries.filter((e) => e.status === "LEAVE").length;
    const absent = sheet.entries.filter((e) => e.status === "ABSENT").length;
    return {
      id: sheet.id,
      dateKey: sheet.dateKey,
      class: sheet.class,
      section: sheet.section,
      total: sheet.entries.length,
      present,
      leave,
      absent,
      updatedAt: sheet.updatedAt,
    };
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data,
  });
};

/** GET /attendance/students/report */
export const getStudentAttendanceReport = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const classId =
    typeof req.query.classId === "string" && req.query.classId
      ? req.query.classId
      : null;
  const from =
    typeof req.query.from === "string" && req.query.from
      ? parseDateKey(req.query.from).dateKey
      : null;
  const to =
    typeof req.query.to === "string" && req.query.to
      ? parseDateKey(req.query.to).dateKey
      : null;

  if (!from || !to) {
    throw new AppError("from and to dates are required (YYYY-MM-DD)", HttpStatus.BAD_REQUEST);
  }

  const entries = await getPrisma().studentAttendanceEntry.findMany({
    where: {
      sheet: {
        schoolId,
        dateKey: { gte: from, lte: to },
        ...(classId ? { classId } : {}),
      },
    },
    select: {
      status: true,
      studentId: true,
      student: {
        select: { id: true, name: true, registrationNo: true },
      },
      sheet: {
        select: {
          dateKey: true,
          class: { select: { className: true } },
        },
      },
    },
  });

  type Agg = {
    student: { id: string; name: string; registrationNo: string };
    present: number;
    leave: number;
    absent: number;
    total: number;
  };

  const map = new Map<string, Agg>();
  for (const entry of entries) {
    let row = map.get(entry.studentId);
    if (!row) {
      row = {
        student: entry.student,
        present: 0,
        leave: 0,
        absent: 0,
        total: 0,
      };
      map.set(entry.studentId, row);
    }
    row.total += 1;
    if (entry.status === "PRESENT") row.present += 1;
    if (entry.status === "LEAVE") row.leave += 1;
    if (entry.status === "ABSENT") row.absent += 1;
  }

  const students = [...map.values()]
    .map((r) => ({
      ...r,
      percentage:
        r.total > 0 ? Math.round((r.present / r.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      from,
      to,
      classId,
      studentCount: students.length,
      students,
    },
  });
};
