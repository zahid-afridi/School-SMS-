import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { validateEnum, validateRequired } from "../../utils/validate.js";

const ATTENDANCE_STATUSES = ["PRESENT", "LEAVE", "ABSENT"] as const;
type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function requireSchoolId(req: Request): string {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }
  return schoolId;
}

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseYearMonth(req: Request): { year: number; month: number; from: string; to: string; days: number } {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError("year must be a valid number", HttpStatus.BAD_REQUEST);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError("month must be 1–12", HttpStatus.BAD_REQUEST);
  }
  const days = new Date(year, month, 0).getDate();
  const from = `${year}-${pad2(month)}-01`;
  const to = `${year}-${pad2(month)}-${pad2(days)}`;
  return { year, month, from, to, days };
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

function emptyAttendanceAgg() {
  return { present: 0, leave: 0, absent: 0, total: 0, percentage: 0 };
}

function finalizeAgg(agg: { present: number; leave: number; absent: number; total: number }) {
  return {
    ...agg,
    percentage: agg.total > 0 ? Math.round((agg.present / agg.total) * 1000) / 10 : 0,
  };
}

/** GET /reports/students-info */
export const getStudentsInfoReport = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const classId =
    typeof req.query.classId === "string" && req.query.classId
      ? req.query.classId
      : null;
  const status =
    typeof req.query.status === "string" && req.query.status
      ? req.query.status
      : "ACTIVE";
  const search =
    typeof req.query.search === "string" && req.query.search.trim()
      ? req.query.search.trim()
      : null;

  const students = await getPrisma().student.findMany({
    where: {
      schoolId,
      ...(status !== "ALL"
        ? { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { registrationNo: { contains: search } },
              { contactPhone: { contains: search } },
              { familyCode: { contains: search } },
            ],
          }
        : {}),
      ...(classId
        ? {
            enrollments: {
              some: { isCurrent: true, classId },
            },
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      registrationNo: true,
      name: true,
      photoUrl: true,
      admissionDate: true,
      contactPhone: true,
      email: true,
      gender: true,
      dateOfBirth: true,
      familyCode: true,
      address: true,
      city: true,
      religion: true,
      nationality: true,
      status: true,
      enrollments: {
        where: { isCurrent: true },
        take: 1,
        select: {
          academicYear: true,
          rollNo: true,
          class: { select: { id: true, className: true } },
          section: { select: { id: true, sectionName: true } },
        },
      },
      parents: {
        select: {
          isPrimaryGuardian: true,
          parent: {
            select: {
              id: true,
              name: true,
              type: true,
              mobileNo: true,
              nationalId: true,
            },
          },
        },
      },
    },
  });

  const rows = students.map((s) => {
    const enrollment = s.enrollments[0] ?? null;
    const primary =
      s.parents.find((p) => p.isPrimaryGuardian)?.parent ??
      s.parents[0]?.parent ??
      null;
    return {
      id: s.id,
      registrationNo: s.registrationNo,
      name: s.name,
      photoUrl: s.photoUrl,
      admissionDate: s.admissionDate,
      contactPhone: s.contactPhone,
      email: s.email,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      familyCode: s.familyCode,
      address: s.address,
      city: s.city,
      religion: s.religion,
      nationality: s.nationality,
      status: s.status,
      academicYear: enrollment?.academicYear ?? null,
      rollNo: enrollment?.rollNo ?? null,
      className: enrollment?.class.className ?? null,
      sectionName: enrollment?.section?.sectionName ?? null,
      classId: enrollment?.class.id ?? null,
      guardianName: primary?.name ?? null,
      guardianType: primary?.type ?? null,
      guardianPhone: primary?.mobileNo ?? null,
      guardianCnic: primary?.nationalId ?? null,
    };
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      generatedAt: new Date().toISOString(),
      filters: { classId, status, search },
      total: rows.length,
      students: rows,
    },
  });
};

/** GET /reports/parents-info */
export const getParentsInfoReport = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const search =
    typeof req.query.search === "string" && req.query.search.trim()
      ? req.query.search.trim()
      : null;
  const type =
    typeof req.query.type === "string" && req.query.type ? req.query.type : null;

  const parents = await getPrisma().parent.findMany({
    where: {
      schoolId,
      ...(type ? { type: type as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER" } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { nationalId: { contains: search } },
              { mobileNo: { contains: search } },
              { whatsappNo: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      nationalId: true,
      mobileNo: true,
      whatsappNo: true,
      email: true,
      education: true,
      occupation: true,
      profession: true,
      workplace: true,
      income: true,
      address: true,
      students: {
        select: {
          isPrimaryGuardian: true,
          isEmergencyContact: true,
          student: {
            select: {
              id: true,
              name: true,
              registrationNo: true,
              familyCode: true,
              status: true,
              enrollments: {
                where: { isCurrent: true },
                take: 1,
                select: {
                  class: { select: { className: true } },
                  section: { select: { sectionName: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const rows = parents.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    nationalId: p.nationalId,
    mobileNo: p.mobileNo,
    whatsappNo: p.whatsappNo,
    email: p.email,
    education: p.education,
    occupation: p.occupation ?? p.profession,
    workplace: p.workplace,
    income: p.income,
    address: p.address,
    childrenCount: p.students.length,
    children: p.students.map((link) => {
      const enr = link.student.enrollments[0];
      return {
        id: link.student.id,
        name: link.student.name,
        registrationNo: link.student.registrationNo,
        familyCode: link.student.familyCode,
        status: link.student.status,
        className: enr?.class.className ?? null,
        sectionName: enr?.section?.sectionName ?? null,
        isPrimaryGuardian: link.isPrimaryGuardian,
        isEmergencyContact: link.isEmergencyContact,
      };
    }),
  }));

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      generatedAt: new Date().toISOString(),
      filters: { search, type },
      total: rows.length,
      parents: rows,
    },
  });
};

/** GET /reports/students-attendance-monthly */
export const getStudentsMonthlyAttendanceReport = async (
  req: Request,
  res: Response
) => {
  const schoolId = requireSchoolId(req);
  const { year, month, from, to, days } = parseYearMonth(req);
  const classId =
    typeof req.query.classId === "string" && req.query.classId
      ? req.query.classId
      : null;
  const sectionId =
    typeof req.query.sectionId === "string" && req.query.sectionId
      ? req.query.sectionId
      : null;

  if (!classId) {
    throw new AppError("classId is required", HttpStatus.BAD_REQUEST);
  }

  const cls = await getPrisma().class.findFirst({
    where: { id: classId, schoolId },
    select: {
      id: true,
      className: true,
      sections: { select: { id: true, sectionName: true }, orderBy: { sectionName: "asc" } },
    },
  });
  if (!cls) throw new AppError("Class not found", HttpStatus.NOT_FOUND);

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
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      registrationNo: true,
      enrollments: {
        where: {
          isCurrent: true,
          classId,
          ...(sectionId ? { sectionId } : {}),
        },
        take: 1,
        select: {
          rollNo: true,
          section: { select: { sectionName: true } },
        },
      },
    },
  });

  const entries = await getPrisma().studentAttendanceEntry.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      sheet: {
        schoolId,
        classId,
        dateKey: { gte: from, lte: to },
        ...(sectionId ? { sectionId } : {}),
      },
    },
    select: {
      status: true,
      studentId: true,
      sheet: { select: { dateKey: true } },
    },
  });

  const dayKeys = Array.from({ length: days }, (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`);

  const rows = students.map((s) => {
    const dayMap: Record<string, AttendanceStatus | null> = {};
    for (const d of dayKeys) dayMap[d] = null;
    const agg = emptyAttendanceAgg();
    for (const e of entries) {
      if (e.studentId !== s.id) continue;
      dayMap[e.sheet.dateKey] = e.status as AttendanceStatus;
      agg.total += 1;
      if (e.status === "PRESENT") agg.present += 1;
      if (e.status === "LEAVE") agg.leave += 1;
      if (e.status === "ABSENT") agg.absent += 1;
    }
    return {
      student: {
        id: s.id,
        name: s.name,
        registrationNo: s.registrationNo,
        rollNo: s.enrollments[0]?.rollNo ?? null,
        sectionName: s.enrollments[0]?.section?.sectionName ?? null,
      },
      days: dayMap,
      summary: finalizeAgg(agg),
    };
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      year,
      month,
      monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      from,
      to,
      dayKeys,
      class: {
        id: cls.id,
        className: cls.className,
        sectionId,
        sectionName:
          cls.sections.find((sec) => sec.id === sectionId)?.sectionName ?? null,
      },
      studentCount: rows.length,
      students: rows,
    },
  });
};

/** GET /reports/staff-attendance-monthly */
export const getStaffMonthlyAttendanceReport = async (
  req: Request,
  res: Response
) => {
  const schoolId = requireSchoolId(req);
  const { year, month, from, to, days } = parseYearMonth(req);

  const employees = await getPrisma().employee.findMany({
    where: { schoolId, status: "ACTIVE" },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      employeeCode: true,
      designation: true,
      phone: true,
    },
  });

  const entries = await getPrisma().staffAttendanceEntry.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      sheet: {
        schoolId,
        dateKey: { gte: from, lte: to },
      },
    },
    select: {
      status: true,
      employeeId: true,
      sheet: { select: { dateKey: true } },
    },
  });

  const dayKeys = Array.from({ length: days }, (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`);

  const rows = employees.map((emp) => {
    const dayMap: Record<string, AttendanceStatus | null> = {};
    for (const d of dayKeys) dayMap[d] = null;
    const agg = emptyAttendanceAgg();
    for (const e of entries) {
      if (e.employeeId !== emp.id) continue;
      dayMap[e.sheet.dateKey] = e.status as AttendanceStatus;
      agg.total += 1;
      if (e.status === "PRESENT") agg.present += 1;
      if (e.status === "LEAVE") agg.leave += 1;
      if (e.status === "ABSENT") agg.absent += 1;
    }
    return {
      employee: emp,
      days: dayMap,
      summary: finalizeAgg(agg),
    };
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      year,
      month,
      monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      from,
      to,
      dayKeys,
      staffCount: rows.length,
      staff: rows,
    },
  });
};

/** GET /reports/staff-attendance/sheet?date=YYYY-MM-DD */
export const getStaffAttendanceSheet = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { dateKey, date } = parseDateKey(req.query.date);

  const employees = await getPrisma().employee.findMany({
    where: { schoolId, status: "ACTIVE" },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      employeeCode: true,
      designation: true,
      phone: true,
      photoUrl: true,
    },
  });

  const sheet = await getPrisma().staffAttendanceSheet.findUnique({
    where: { schoolId_dateKey: { schoolId, dateKey } },
    include: {
      entries: {
        select: {
          id: true,
          status: true,
          remarks: true,
          employeeId: true,
        },
      },
    },
  });

  const entryByEmployee = new Map(
    (sheet?.entries ?? []).map((e) => [e.employeeId, e])
  );

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      dateKey,
      date,
      remarks: sheet?.remarks ?? null,
      sheetId: sheet?.id ?? null,
      employees: employees.map((emp) => {
        const entry = entryByEmployee.get(emp.id);
        return {
          employee: emp,
          status: (entry?.status as AttendanceStatus | undefined) ?? "PRESENT",
          remarks: entry?.remarks ?? null,
          saved: Boolean(entry),
        };
      }),
    },
  });
};

/** PUT /reports/staff-attendance/sheet */
export const saveStaffAttendanceSheet = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { date, remarks, entries } = req.body as {
    date?: string;
    remarks?: string;
    entries?: Array<{ employeeId: string; status: string; remarks?: string }>;
  };

  validateRequired({ date }, ["date"]);
  const { dateKey, date: dateObj } = parseDateKey(date);

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new AppError("entries are required", HttpStatus.BAD_REQUEST);
  }

  for (const entry of entries) {
    validateRequired(entry, ["employeeId", "status"]);
    validateEnum(entry.status, ATTENDANCE_STATUSES, "Invalid attendance status");
  }

  const employeeIds = entries.map((e) => e.employeeId);
  const found = await getPrisma().employee.findMany({
    where: { schoolId, id: { in: employeeIds }, status: "ACTIVE" },
    select: { id: true },
  });
  if (found.length !== new Set(employeeIds).size) {
    throw new AppError("One or more employees not found", HttpStatus.BAD_REQUEST);
  }

  const sheet = await getPrisma().$transaction(async (tx) => {
    const upserted = await tx.staffAttendanceSheet.upsert({
      where: { schoolId_dateKey: { schoolId, dateKey } },
      create: {
        schoolId,
        dateKey,
        date: dateObj,
        remarks: remarks?.trim() || null,
        takenByUserId: req.user?.userId ?? null,
      },
      update: {
        remarks: remarks?.trim() || null,
        takenByUserId: req.user?.userId ?? null,
      },
    });

    for (const entry of entries) {
      await tx.staffAttendanceEntry.upsert({
        where: {
          sheetId_employeeId: {
            sheetId: upserted.id,
            employeeId: entry.employeeId,
          },
        },
        create: {
          sheetId: upserted.id,
          employeeId: entry.employeeId,
          status: entry.status as AttendanceStatus,
          remarks: entry.remarks?.trim() || null,
        },
        update: {
          status: entry.status as AttendanceStatus,
          remarks: entry.remarks?.trim() || null,
        },
      });
    }

    return tx.staffAttendanceSheet.findUnique({
      where: { id: upserted.id },
      include: {
        entries: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
                designation: true,
              },
            },
          },
        },
      },
    });
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: sheet,
  });
};

/** GET /reports/fee-collection */
export const getFeeCollectionReport = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const from = req.query.from
    ? new Date(String(req.query.from))
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError("Invalid date range", HttpStatus.BAD_REQUEST);
  }

  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  const payments = await getPrisma().feePayment.findMany({
    where: {
      schoolId,
      paidAt: { gte: from, lte: end },
    },
    include: {
      student: {
        select: { id: true, name: true, registrationNo: true },
      },
      allocations: {
        include: {
          invoice: {
            select: {
              invoiceNo: true,
              billingMonth: true,
              billingYear: true,
            },
          },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  const byMethod: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  for (const p of payments) {
    byMethod[p.method] = roundMoney((byMethod[p.method] ?? 0) + p.amount);
    const day = p.paidAt.toISOString().slice(0, 10);
    byDay[day] = roundMoney((byDay[day] ?? 0) + p.amount);
  }

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      from,
      to: end,
      totalCollected: roundMoney(payments.reduce((s, p) => s + p.amount, 0)),
      paymentCount: payments.length,
      byMethod,
      byDay,
      payments,
    },
  });
};

/** GET /reports/accounts */
export const getAccountsReport = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const year = Number(req.query.year) || new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError("year must be a valid number", HttpStatus.BAD_REQUEST);
  }

  const invoices = await getPrisma().feeInvoice.findMany({
    where: {
      schoolId,
      billingYear: year,
      status: { not: "CANCELLED" },
    },
    select: {
      billingMonth: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      status: true,
    },
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const rows = invoices.filter((inv) => inv.billingMonth === month);
    const billed = roundMoney(rows.reduce((s, r) => s + r.totalAmount, 0));
    const collected = roundMoney(rows.reduce((s, r) => s + r.paidAmount, 0));
    const outstanding = roundMoney(rows.reduce((s, r) => s + r.balanceAmount, 0));
    return {
      month,
      label: MONTH_NAMES[i],
      invoiceCount: rows.length,
      billed,
      collected,
      outstanding,
      unpaidCount: rows.filter((r) => r.status === "UNPAID" || r.status === "PARTIAL").length,
    };
  });

  const payments = await getPrisma().feePayment.findMany({
    where: {
      schoolId,
      paidAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
    select: { amount: true, method: true },
  });

  const byMethod: Record<string, number> = {};
  for (const p of payments) {
    byMethod[p.method] = roundMoney((byMethod[p.method] ?? 0) + p.amount);
  }

  const totals = {
    billed: roundMoney(months.reduce((s, m) => s + m.billed, 0)),
    collected: roundMoney(months.reduce((s, m) => s + m.collected, 0)),
    outstanding: roundMoney(months.reduce((s, m) => s + m.outstanding, 0)),
    invoiceCount: months.reduce((s, m) => s + m.invoiceCount, 0),
    cashCollected: roundMoney(payments.reduce((s, p) => s + p.amount, 0)),
  };

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      year,
      months,
      byMethod,
      totals,
      generatedAt: new Date().toISOString(),
    },
  });
};

/** GET /reports/student-progress/:studentId */
export const getStudentProgressReport = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { studentId } = req.params as { studentId: string };

  const student = await getPrisma().student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      name: true,
      registrationNo: true,
      photoUrl: true,
      admissionDate: true,
      contactPhone: true,
      gender: true,
      dateOfBirth: true,
      familyCode: true,
      status: true,
      address: true,
      enrollments: {
        where: { isCurrent: true },
        take: 1,
        select: {
          academicYear: true,
          rollNo: true,
          feeDiscount: true,
          class: { select: { id: true, className: true } },
          section: { select: { id: true, sectionName: true } },
        },
      },
      parents: {
        select: {
          isPrimaryGuardian: true,
          parent: {
            select: { name: true, type: true, mobileNo: true },
          },
        },
      },
    },
  });

  if (!student) throw new AppError("Student not found", HttpStatus.NOT_FOUND);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const from = `${year}-${pad2(month)}-01`;
  const to = `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`;

  const [attendanceEntries, invoices, payments, examMarks] = await Promise.all([
    getPrisma().studentAttendanceEntry.findMany({
      where: {
        studentId,
        sheet: { schoolId, dateKey: { gte: from, lte: to } },
      },
      select: { status: true },
    }),
    getPrisma().feeInvoice.findMany({
      where: { schoolId, studentId, status: { not: "CANCELLED" } },
      orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
      take: 12,
      select: {
        id: true,
        invoiceNo: true,
        billingMonth: true,
        billingYear: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        dueDate: true,
      },
    }),
    getPrisma().feePayment.findMany({
      where: { schoolId, studentId },
      orderBy: { paidAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        method: true,
        paidAt: true,
        receiptNo: true,
      },
    }),
    getPrisma().examMark.findMany({
      where: { studentId, exam: { schoolId } },
      include: {
        exam: { select: { id: true, name: true, startDate: true, academicYear: true } },
        examSubject: {
          select: {
            maxMarks: true,
            passMarks: true,
            subject: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { exam: { startDate: "desc" } },
    }),
  ]);

  const attendance = emptyAttendanceAgg();
  for (const e of attendanceEntries) {
    attendance.total += 1;
    if (e.status === "PRESENT") attendance.present += 1;
    if (e.status === "LEAVE") attendance.leave += 1;
    if (e.status === "ABSENT") attendance.absent += 1;
  }

  type ExamAgg = {
    exam: { id: string; name: string; startDate: Date; academicYear: string | null };
    subjects: Array<{
      name: string;
      code: string | null;
      obtained: number | null;
      total: number;
      passing: number;
      isAbsent: boolean;
    }>;
    obtained: number;
    total: number;
    percentage: number;
  };

  const examMap = new Map<string, ExamAgg>();
  for (const mark of examMarks) {
    let row = examMap.get(mark.examId);
    if (!row) {
      row = {
        exam: mark.exam,
        subjects: [],
        obtained: 0,
        total: 0,
        percentage: 0,
      };
      examMap.set(mark.examId, row);
    }
    const obtained = mark.obtainedMarks ?? 0;
    const total = mark.examSubject.maxMarks;
    row.subjects.push({
      name: mark.examSubject.subject.name,
      code: mark.examSubject.subject.code,
      obtained: mark.isAbsent ? null : mark.obtainedMarks,
      total,
      passing: mark.examSubject.passMarks,
      isAbsent: mark.isAbsent,
    });
    if (!mark.isAbsent && mark.obtainedMarks != null) {
      row.obtained += obtained;
      row.total += total;
    }
  }

  const exams = [...examMap.values()].map((e) => ({
    ...e,
    percentage: e.total > 0 ? Math.round((e.obtained / e.total) * 1000) / 10 : 0,
  }));

  const outstanding = roundMoney(
    invoices
      .filter((i) => i.status === "UNPAID" || i.status === "PARTIAL")
      .reduce((s, i) => s + i.balanceAmount, 0)
  );

  const primary =
    student.parents.find((p) => p.isPrimaryGuardian)?.parent ??
    student.parents[0]?.parent ??
    null;

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      generatedAt: new Date().toISOString(),
      student: {
        ...student,
        enrollment: student.enrollments[0] ?? null,
        guardian: primary,
      },
      attendance: {
        monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
        from,
        to,
        ...finalizeAgg(attendance),
      },
      fees: {
        outstanding,
        recentInvoices: invoices.map((inv) => ({
          ...inv,
          monthLabel: `${MONTH_NAMES[inv.billingMonth - 1]} ${inv.billingYear}`,
        })),
        recentPayments: payments,
      },
      exams,
    },
  });
};
