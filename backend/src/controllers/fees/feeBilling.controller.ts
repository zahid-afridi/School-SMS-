import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { validateEnum, validateRequired } from "../../utils/validate.js";

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "ONLINE",
  "OTHER",
] as const;

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

function parsePositiveAmount(value: unknown, field = "amount"): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(`Invalid ${field}`, HttpStatus.BAD_REQUEST);
  }
  return roundMoney(amount);
}

function parseMonth(value: unknown): number {
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError("billingMonth must be 1–12", HttpStatus.BAD_REQUEST);
  }
  return month;
}

function parseYear(value: unknown): number {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError("Invalid billingYear", HttpStatus.BAD_REQUEST);
  }
  return year;
}

function defaultAcademicYear(billingMonth: number, billingYear: number): string {
  // Apr–Mar style common in PK schools; if month >= 4 → year/(year+1) else (year-1)/year
  if (billingMonth >= 4) {
    return `${billingYear}-${billingYear + 1}`;
  }
  return `${billingYear - 1}-${billingYear}`;
}

function invoiceStatus(total: number, paid: number) {
  if (paid <= 0) return "UNPAID" as const;
  if (paid + 0.001 >= total) return "PAID" as const;
  return "PARTIAL" as const;
}

async function nextInvoiceNo(
  schoolId: string,
  billingYear: number,
  billingMonth: number
) {
  const prefix = `INV-${billingYear}${String(billingMonth).padStart(2, "0")}-`;
  const last = await getPrisma().feeInvoice.findFirst({
    where: { schoolId, invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: "desc" },
    select: { invoiceNo: true },
  });
  const seq = last ? Number(last.invoiceNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function nextReceiptNo(schoolId: string, paidAt: Date) {
  const y = paidAt.getFullYear();
  const m = String(paidAt.getMonth() + 1).padStart(2, "0");
  const d = String(paidAt.getDate()).padStart(2, "0");
  const prefix = `RCP-${y}${m}${d}-`;
  const last = await getPrisma().feePayment.findFirst({
    where: { schoolId, receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: "desc" },
    select: { receiptNo: true },
  });
  const seq = last ? Number(last.receiptNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

type ChargeLine = {
  feeParticularId: string | null;
  key: string;
  label: string;
  amount: number;
  sortOrder: number;
  isDiscount: boolean;
};

async function ensureDefaultParticulars(schoolId: string) {
  const count = await getPrisma().feeParticular.count({ where: { schoolId } });
  if (count > 0) return;
  // Seed via structure defaults if missing — lightweight create
  const defaults = [
    { key: "MONTHLY_TUITION", label: "MONTHLY TUITION FEE", sortOrder: 1, valueType: "AUTO" as const },
    { key: "ADMISSION_FEE", label: "ADMISSION FEE", sortOrder: 2, valueType: "EDITABLE" as const },
    { key: "REGISTRATION_FEE", label: "REGISTRATION FEE", sortOrder: 3, valueType: "EDITABLE" as const },
    { key: "ART_MATERIAL", label: "ART MATERIAL", sortOrder: 4, valueType: "EDITABLE" as const },
    { key: "TRANSPORT", label: "TRANSPORT", sortOrder: 5, valueType: "EDITABLE" as const },
    { key: "BOOKS", label: "BOOKS", sortOrder: 6, valueType: "EDITABLE" as const },
    { key: "UNIFORM", label: "UNIFORM", sortOrder: 7, valueType: "EDITABLE" as const },
    { key: "FINE", label: "FINE", sortOrder: 8, valueType: "EDITABLE" as const },
    { key: "OTHERS", label: "OTHERS", sortOrder: 9, valueType: "EDITABLE" as const },
    { key: "PREVIOUS_BALANCE", label: "PREVIOUS BALANCE", sortOrder: 10, valueType: "AUTO" as const },
    { key: "DISCOUNT", label: "DISCOUNT IN FEE", sortOrder: 11, valueType: "AUTO" as const },
  ];
  await getPrisma().feeParticular.createMany({
    data: defaults.map((d) => ({ ...d, schoolId, isSystem: true })),
  });
}

async function resolveStudentCharges(
  schoolId: string,
  studentId: string,
  options?: { includePreviousBalance?: boolean; excludeInvoiceId?: string }
): Promise<{
  enrollment: {
    id: string;
    academicYear: string;
    feeDiscount: number;
    classId: string;
    className: string;
    montlyFee: number;
    sectionName: string | null;
  };
  student: {
    id: string;
    name: string;
    registrationNo: string;
    advanceBalance: number;
  };
  lines: ChargeLine[];
  previousBalance: number;
}> {
  await ensureDefaultParticulars(schoolId);

  const student = await getPrisma().student.findFirst({
    where: { id: studentId, schoolId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      registrationNo: true,
      advanceBalance: true,
      enrollments: {
        where: { isCurrent: true },
        take: 1,
        select: {
          id: true,
          academicYear: true,
          feeDiscount: true,
          classId: true,
          class: { select: { id: true, className: true, montlyFee: true } },
          section: { select: { sectionName: true } },
        },
      },
    },
  });

  if (!student || !student.enrollments[0]) {
    throw new AppError(
      "Active enrollment not found for student",
      HttpStatus.BAD_REQUEST
    );
  }

  const enrollment = student.enrollments[0];
  const classId = enrollment.classId;
  const montlyFee = enrollment.class.montlyFee;
  const feeDiscountPercent = enrollment.feeDiscount ?? 0;

  const particulars = await getPrisma().feeParticular.findMany({
    where: { schoolId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const [allStructure, classStructure, studentStructure] = await Promise.all([
    getPrisma().feeStructure.findUnique({
      where: { schoolId_scopeKey: { schoolId, scopeKey: "ALL" } },
      include: { items: true },
    }),
    getPrisma().feeStructure.findUnique({
      where: { schoolId_scopeKey: { schoolId, scopeKey: `CLASS:${classId}` } },
      include: { items: true },
    }),
    getPrisma().feeStructure.findUnique({
      where: {
        schoolId_scopeKey: { schoolId, scopeKey: `STUDENT:${studentId}` },
      },
      include: { items: true },
    }),
  ]);

  const amountMap = new Map<string, number>();
  for (const item of allStructure?.items ?? []) {
    amountMap.set(item.feeParticularId, item.amount);
  }
  for (const item of classStructure?.items ?? []) {
    amountMap.set(item.feeParticularId, item.amount);
  }
  for (const item of studentStructure?.items ?? []) {
    amountMap.set(item.feeParticularId, item.amount);
  }

  let previousBalance = 0;
  if (options?.includePreviousBalance !== false) {
    const overdue = await getPrisma().feeInvoice.aggregate({
      where: {
        schoolId,
        studentId,
        status: { in: ["UNPAID", "PARTIAL"] },
        ...(options?.excludeInvoiceId
          ? { NOT: { id: options.excludeInvoiceId } }
          : {}),
      },
      _sum: { balanceAmount: true },
    });
    previousBalance = roundMoney(overdue._sum.balanceAmount ?? 0);
  }

  const lines: ChargeLine[] = [];
  let tuitionAmount = 0;

  for (const particular of particulars) {
    if (particular.key === "DISCOUNT") continue;

    let amount = amountMap.get(particular.id) ?? 0;

    if (particular.key === "MONTHLY_TUITION") {
      amount = montlyFee;
      tuitionAmount = amount;
    } else if (particular.key === "PREVIOUS_BALANCE") {
      amount = previousBalance;
    }

    amount = roundMoney(amount);
    if (amount <= 0 && particular.key !== "MONTHLY_TUITION") continue;

    lines.push({
      feeParticularId: particular.id,
      key: particular.key,
      label: particular.label,
      amount,
      sortOrder: particular.sortOrder,
      isDiscount: false,
    });
  }

  const discountAmount = roundMoney((tuitionAmount * feeDiscountPercent) / 100);
  if (discountAmount > 0) {
    const discountParticular = particulars.find((p) => p.key === "DISCOUNT");
    lines.push({
      feeParticularId: discountParticular?.id ?? null,
      key: "DISCOUNT",
      label: `DISCOUNT (${feeDiscountPercent}%)`,
      amount: discountAmount,
      sortOrder: discountParticular?.sortOrder ?? 99,
      isDiscount: true,
    });
  }

  return {
    enrollment: {
      id: enrollment.id,
      academicYear: enrollment.academicYear,
      feeDiscount: feeDiscountPercent,
      classId: enrollment.class.id,
      className: enrollment.class.className,
      montlyFee,
      sectionName: enrollment.section?.sectionName ?? null,
    },
    student: {
      id: student.id,
      name: student.name,
      registrationNo: student.registrationNo,
      advanceBalance: student.advanceBalance ?? 0,
    },
    lines,
    previousBalance,
  };
}

function totalsFromLines(lines: ChargeLine[]) {
  const charges = lines.filter((l) => !l.isDiscount);
  const discounts = lines.filter((l) => l.isDiscount);
  const subtotal = roundMoney(charges.reduce((s, l) => s + l.amount, 0));
  const discountAmount = roundMoney(discounts.reduce((s, l) => s + l.amount, 0));
  const fineAmount = roundMoney(
    charges
      .filter((l) => l.key === "FINE")
      .reduce((s, l) => s + l.amount, 0)
  );
  const totalAmount = roundMoney(Math.max(0, subtotal - discountAmount));
  return { subtotal, discountAmount, fineAmount, totalAmount };
}

const invoiceInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
  student: {
    select: {
      id: true,
      name: true,
      registrationNo: true,
      photoUrl: true,
      contactPhone: true,
      parents: {
        where: { isPrimaryGuardian: true },
        take: 1,
        include: { parent: true },
      },
    },
  },
  enrollment: {
    select: {
      id: true,
      academicYear: true,
      rollNo: true,
      class: { select: { id: true, className: true, montlyFee: true } },
      section: { select: { id: true, sectionName: true } },
    },
  },
} as const;

function formatChallanData(params: {
  invoice: any;
  school: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
  priorBalance: number;
}) {
  const { invoice, school, priorBalance } = params;
  const primaryParent = invoice.student?.parents?.[0]?.parent ?? null;
  const netPayable = roundMoney(invoice.balanceAmount + priorBalance);
  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    academicYear: invoice.academicYear,
    billingMonth: invoice.billingMonth,
    billingYear: invoice.billingYear,
    monthLabel: `${MONTH_NAMES[invoice.billingMonth - 1]} ${invoice.billingYear}`,
    status: invoice.status,
    dueDate: invoice.dueDate,
    generatedAt: invoice.generatedAt,
    subtotal: invoice.subtotal,
    discountAmount: invoice.discountAmount,
    fineAmount: invoice.fineAmount,
    fineWaived: invoice.fineWaived,
    fineWaivedAmount: invoice.fineWaivedAmount,
    fineWaivedReason: invoice.fineWaivedReason,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balanceAmount: invoice.balanceAmount,
    previousArrears: priorBalance,
    netPayable,
    remarks: invoice.remarks,
    school: {
      id: school.id,
      name: school.name,
      address: school.address,
      phone: school.phone,
      email: school.email,
      logoUrl: school.logoUrl,
    },
    student: {
      id: invoice.student.id,
      name: invoice.student.name,
      registrationNo: invoice.student.registrationNo,
      photoUrl: invoice.student.photoUrl,
      contactPhone:
        invoice.student.contactPhone || primaryParent?.mobileNo || null,
      fatherName: primaryParent?.name || null,
    },
    enrollment: {
      className: invoice.enrollment?.class?.className ?? "—",
      sectionName: invoice.enrollment?.section?.sectionName ?? "",
      rollNo: invoice.enrollment?.rollNo ?? "—",
      academicYear: invoice.enrollment?.academicYear ?? invoice.academicYear,
    },
    items: invoice.items ?? [],
    allocations: invoice.allocations ?? [],
  };
}

const ONE_TIME_FEE_KEYS = new Set(["ADMISSION_FEE", "REGISTRATION_FEE"]);

function buildPeriodList(body: Record<string, unknown>): Array<{
  billingMonth: number;
  billingYear: number;
  academicYear: string;
}> {
  const mode = String(body.mode || "MONTH").toUpperCase();

  if (mode === "CALENDAR_YEAR") {
    const year = parseYear(body.billingYear ?? body.year);
    return Array.from({ length: 12 }, (_, i) => {
      const billingMonth = i + 1;
      return {
        billingMonth,
        billingYear: year,
        academicYear: defaultAcademicYear(billingMonth, year),
      };
    });
  }

  if (mode === "ACADEMIC_YEAR") {
    // Apr (startYear) → Mar (startYear+1)
    const startYear = parseYear(body.billingYear ?? body.startYear ?? body.year);
    const periods: Array<{
      billingMonth: number;
      billingYear: number;
      academicYear: string;
    }> = [];
    const academicYear = `${startYear}-${startYear + 1}`;
    for (let m = 4; m <= 12; m++) {
      periods.push({ billingMonth: m, billingYear: startYear, academicYear });
    }
    for (let m = 1; m <= 3; m++) {
      periods.push({
        billingMonth: m,
        billingYear: startYear + 1,
        academicYear,
      });
    }
    return periods;
  }

  if (mode === "RANGE") {
    const fromMonth = parseMonth(body.fromMonth ?? body.billingMonth);
    const fromYear = parseYear(body.fromYear ?? body.billingYear);
    const toMonth = parseMonth(body.toMonth ?? body.billingMonth);
    const toYear = parseYear(body.toYear ?? body.billingYear);
    const periods: Array<{
      billingMonth: number;
      billingYear: number;
      academicYear: string;
    }> = [];
    let y = fromYear;
    let m = fromMonth;
    let guard = 0;
    while (y < toYear || (y === toYear && m <= toMonth)) {
      periods.push({
        billingMonth: m,
        billingYear: y,
        academicYear: defaultAcademicYear(m, y),
      });
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      guard += 1;
      if (guard > 36) {
        throw new AppError(
          "Date range too large (max 36 months)",
          HttpStatus.BAD_REQUEST
        );
      }
    }
    if (periods.length === 0) {
      throw new AppError("Invalid month/year range", HttpStatus.BAD_REQUEST);
    }
    return periods;
  }

  // MONTH (default)
  const billingMonth = parseMonth(body.billingMonth);
  const billingYear = parseYear(body.billingYear);
  const academicYear =
    typeof body.academicYear === "string" && body.academicYear.trim()
      ? body.academicYear.trim()
      : defaultAcademicYear(billingMonth, billingYear);
  return [{ billingMonth, billingYear, academicYear }];
}

async function alreadyChargedOneTimeKeys(schoolId: string, studentId: string) {
  const items = await getPrisma().feeInvoiceItem.findMany({
    where: {
      key: { in: [...ONE_TIME_FEE_KEYS] },
      invoice: { schoolId, studentId, status: { not: "CANCELLED" } },
    },
    select: { key: true },
  });
  return new Set(items.map((i) => i.key).filter(Boolean) as string[]);
}

/**
 * Automatically creates fee invoice(s) for a student upon enrollment or when initial bills are missing.
 * Generates the admission month invoice (with one-time fees like Admission Fee + Tuition)
 * plus any future months in the current period that were already generated for other students in the class/school.
 */
export async function autoGenerateInvoicesForNewStudent(params: {
  schoolId: string;
  studentId: string;
  enrollmentId: string;
  classId: string;
  admissionDate?: Date | string | null;
  academicYear?: string | null;
}): Promise<number> {
  const { schoolId, studentId, enrollmentId, classId, admissionDate, academicYear } = params;
  try {
    const adm = admissionDate ? new Date(admissionDate) : new Date();
    const admMonth = Number.isNaN(adm.getTime()) ? new Date().getMonth() + 1 : adm.getMonth() + 1;
    const admYear = Number.isNaN(adm.getTime()) ? new Date().getFullYear() : adm.getFullYear();

    // Look for all billing periods that have ALREADY been generated for other students in this class
    // on or after the student's admission date
    const classInvoices = await getPrisma().feeInvoice.findMany({
      where: {
        schoolId,
        enrollment: { classId },
        status: { not: "CANCELLED" },
        OR: [
          { billingYear: { gt: admYear } },
          { billingYear: admYear, billingMonth: { gte: admMonth } },
        ],
      },
      select: {
        billingMonth: true,
        billingYear: true,
        academicYear: true,
      },
      distinct: ["billingMonth", "billingYear"],
      orderBy: [{ billingYear: "asc" }, { billingMonth: "asc" }],
    });

    let periodsToGenerate = [...classInvoices];
    if (periodsToGenerate.length === 0) {
      const schoolInvoices = await getPrisma().feeInvoice.findMany({
        where: {
          schoolId,
          status: { not: "CANCELLED" },
          OR: [
            { billingYear: { gt: admYear } },
            { billingYear: admYear, billingMonth: { gte: admMonth } },
          ],
        },
        select: {
          billingMonth: true,
          billingYear: true,
          academicYear: true,
        },
        distinct: ["billingMonth", "billingYear"],
        orderBy: [{ billingYear: "asc" }, { billingMonth: "asc" }],
      });
      periodsToGenerate = [...schoolInvoices];
    }

    // Always ensure the admission month itself is included
    const hasAdmissionMonth = periodsToGenerate.some(
      (p) => p.billingMonth === admMonth && p.billingYear === admYear
    );

    if (!hasAdmissionMonth) {
      periodsToGenerate.unshift({
        billingMonth: admMonth,
        billingYear: admYear,
        academicYear: academicYear || defaultAcademicYear(admMonth, admYear),
      });
    }

    // Sort periods chronologically
    periodsToGenerate.sort((a, b) => {
      if (a.billingYear !== b.billingYear) return a.billingYear - b.billingYear;
      return a.billingMonth - b.billingMonth;
    });

    let createdCount = 0;
    const chargedOneTime = await alreadyChargedOneTimeKeys(schoolId, studentId);

    for (const period of periodsToGenerate) {
      const pAcademicYear =
        period.academicYear ||
        academicYear ||
        defaultAcademicYear(period.billingMonth, period.billingYear);

      const existing = await getPrisma().feeInvoice.findFirst({
        where: {
          schoolId,
          studentId,
          billingMonth: period.billingMonth,
          billingYear: period.billingYear,
          status: { not: "CANCELLED" },
        },
        select: { id: true },
      });
      if (existing) continue;

      const resolved = await resolveStudentCharges(schoolId, studentId, {
        includePreviousBalance: false,
      });

      let lines = resolved.lines.filter((l) => l.key !== "PREVIOUS_BALANCE");
      lines = lines.filter(
        (l) =>
          !l.key ||
          !ONE_TIME_FEE_KEYS.has(l.key) ||
          !chargedOneTime.has(l.key)
      );
      lines = lines.filter(
        (l) => l.isDiscount || l.key === "MONTHLY_TUITION" || l.amount > 0
      );

      const { subtotal, discountAmount, fineAmount, totalAmount } =
        totalsFromLines(lines);

      if (totalAmount <= 0 && lines.every((l) => l.amount <= 0)) {
        continue;
      }

      const invoiceNo = await nextInvoiceNo(
        schoolId,
        period.billingYear,
        period.billingMonth
      );
      const dueDate = new Date(period.billingYear, period.billingMonth - 1, 10);

      await getPrisma().feeInvoice.create({
        data: {
          invoiceNo,
          academicYear: pAcademicYear,
          billingMonth: period.billingMonth,
          billingYear: period.billingYear,
          status: totalAmount <= 0 ? "PAID" : "UNPAID",
          dueDate,
          subtotal,
          discountAmount,
          fineAmount,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          schoolId,
          studentId,
          enrollmentId,
          items: {
            create: lines.map((line) => ({
              label: line.label,
              key: line.key,
              amount: line.amount,
              sortOrder: line.sortOrder,
              isDiscount: line.isDiscount,
              feeParticularId: line.feeParticularId,
            })),
          },
        },
      });

      createdCount += 1;
      for (const line of lines) {
        if (line.key && ONE_TIME_FEE_KEYS.has(line.key)) {
          chargedOneTime.add(line.key);
        }
      }
    }

    return createdCount;
  } catch (err) {
    console.error("autoGenerateInvoicesForNewStudent error:", err);
    return 0;
  }
}

/** POST /fees/invoices/generate */
export const generateFeeInvoices = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const body = req.body ?? {};

  const mode = String(body.mode || "MONTH").toUpperCase();
  if (mode === "MONTH") {
    validateRequired(body, ["billingMonth", "billingYear"]);
  } else if (mode === "CALENDAR_YEAR" || mode === "ACADEMIC_YEAR") {
    validateRequired(body, ["billingYear"]);
  } else if (mode === "RANGE") {
    validateRequired(body, ["fromMonth", "fromYear", "toMonth", "toYear"]);
  }

  const periods = buildPeriodList(body);
  const classId =
    typeof body.classId === "string" && body.classId ? body.classId : null;
  const sectionId =
    typeof body.sectionId === "string" && body.sectionId
      ? body.sectionId
      : null;
  const studentId =
    typeof body.studentId === "string" && body.studentId
      ? body.studentId
      : null;

  const students = await getPrisma().student.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      ...(studentId ? { id: studentId } : {}),
      enrollments: {
        some: {
          isCurrent: true,
          ...(classId ? { classId } : {}),
          ...(sectionId ? { sectionId } : {}),
        },
      },
    },
    select: { id: true, admissionDate: true },
  });

  if (students.length === 0) {
    throw new AppError(
      "No active students found for the selected class/filters. Add students with a current enrollment first.",
      HttpStatus.BAD_REQUEST
    );
  }

  let created = 0;
  let skippedExisting = 0;
  let skippedZero = 0;
  let skippedError = 0;
  const errors: string[] = [];
  const monthLabels: string[] = [];

  for (const period of periods) {
    const { billingMonth, billingYear, academicYear } = period;
    monthLabels.push(`${MONTH_NAMES[billingMonth - 1]} ${billingYear}`);
    const dueDate =
      body.dueDate && String(body.dueDate)
        ? new Date(String(body.dueDate))
        : new Date(billingYear, billingMonth - 1, 10);

    for (const s of students) {
      // Respect student admission date: do not bill periods before the student joined the school
      if (s.admissionDate) {
        const adm = new Date(s.admissionDate);
        if (!Number.isNaN(adm.getTime())) {
          const admYear = adm.getFullYear();
          const admMonth = adm.getMonth() + 1;
          if (
            billingYear < admYear ||
            (billingYear === admYear && billingMonth < admMonth)
          ) {
            skippedExisting += 1;
            continue;
          }
        }
      }

      const existing = await getPrisma().feeInvoice.findFirst({
        where: {
          schoolId,
          studentId: s.id,
          billingMonth,
          billingYear,
          status: { not: "CANCELLED" },
        },
        select: { id: true },
      });
      if (existing) {
        skippedExisting += 1;
        continue;
      }

      try {
        const resolved = await resolveStudentCharges(schoolId, s.id, {
          includePreviousBalance: false,
        });
        const chargedOneTime = await alreadyChargedOneTimeKeys(schoolId, s.id);
        let lines = resolved.lines.filter((l) => l.key !== "PREVIOUS_BALANCE");
        lines = lines.filter(
          (l) =>
            !l.key ||
            !ONE_TIME_FEE_KEYS.has(l.key) ||
            !chargedOneTime.has(l.key)
        );
        // Drop zero non-tuition charge lines for cleaner invoices
        lines = lines.filter(
          (l) => l.isDiscount || l.key === "MONTHLY_TUITION" || l.amount > 0
        );

        const { subtotal, discountAmount, fineAmount, totalAmount } =
          totalsFromLines(lines);

        if (totalAmount <= 0 && lines.every((l) => l.amount <= 0)) {
          skippedZero += 1;
          continue;
        }

        const invoiceNo = await nextInvoiceNo(
          schoolId,
          billingYear,
          billingMonth
        );
        await getPrisma().feeInvoice.create({
          data: {
            invoiceNo,
            academicYear,
            billingMonth,
            billingYear,
            status: totalAmount <= 0 ? "PAID" : "UNPAID",
            dueDate,
            subtotal,
            discountAmount,
            fineAmount,
            totalAmount,
            paidAmount: 0,
            balanceAmount: totalAmount,
            schoolId,
            studentId: s.id,
            enrollmentId: resolved.enrollment.id,
            items: {
              create: lines.map((line) => ({
                label: line.label,
                key: line.key,
                amount: line.amount,
                sortOrder: line.sortOrder,
                isDiscount: line.isDiscount,
                feeParticularId: line.feeParticularId,
              })),
            },
          },
        });
        created += 1;
      } catch (err) {
        skippedError += 1;
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (errors.length < 10) {
          errors.push(`${s.id}: ${msg}`);
        }
      }
    }
  }

  const skipped = skippedExisting + skippedZero + skippedError;
  const label =
    periods.length === 1
      ? monthLabels[0]
      : `${monthLabels[0]} → ${monthLabels[monthLabels.length - 1]} (${periods.length} months)`;

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: `Generated ${created} invoice(s) across ${periods.length} month(s), skipped ${skipped}`,
    data: {
      created,
      skipped,
      skippedExisting,
      skippedZero,
      skippedError,
      errors,
      mode,
      periodsCount: periods.length,
      monthLabel: label,
      periods: monthLabels,
      studentCount: students.length,
    },
  });
};

/** GET /fees/invoices */
export const listFeeInvoices = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const {
    studentId,
    classId,
    status,
    academicYear,
    billingMonth,
    billingYear,
    search,
  } = req.query;

  const invoices = await getPrisma().feeInvoice.findMany({
    where: {
      schoolId,
      ...(typeof studentId === "string" && studentId ? { studentId } : {}),
      ...(typeof academicYear === "string" && academicYear
        ? { academicYear }
        : {}),
      ...(billingMonth ? { billingMonth: Number(billingMonth) } : {}),
      ...(billingYear ? { billingYear: Number(billingYear) } : {}),
      ...(typeof classId === "string" && classId
        ? { enrollment: { classId } }
        : {}),
      ...(typeof search === "string" && search.trim()
        ? {
            OR: [
              { invoiceNo: { contains: search.trim() } },
              { student: { name: { contains: search.trim() } } },
              { student: { registrationNo: { contains: search.trim() } } },
            ],
          }
        : {}),
      ...(typeof status === "string" && status
        ? status.toUpperCase() === "OPEN" || status.toUpperCase() === "UNPAID_PARTIAL"
          ? {
              status: { in: ["UNPAID", "PARTIAL"] as const },
              balanceAmount: { gt: 0 },
            }
          : status.toUpperCase() === "ALL"
            ? {}
            : {
                status: status.toUpperCase() as
                  | "UNPAID"
                  | "PARTIAL"
                  | "PAID"
                  | "WAIVED"
                  | "CANCELLED",
              }
        : { status: { not: "CANCELLED" } }),
    },
    include: invoiceInclude,
    orderBy: [
      { billingYear: "desc" },
      { billingMonth: "desc" },
      { createdAt: "desc" },
    ],
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: invoices.map((inv) => ({
      ...inv,
      monthLabel: `${MONTH_NAMES[inv.billingMonth - 1]} ${inv.billingYear}`,
    })),
  });
};

/** GET /fees/invoices/:id */
export const getFeeInvoiceById = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };

  const invoice = await getPrisma().feeInvoice.findFirst({
    where: { id, schoolId },
    include: {
      ...invoiceInclude,
      allocations: {
        include: {
          payment: {
            select: {
              id: true,
              receiptNo: true,
              amount: true,
              method: true,
              paidAt: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new AppError("Invoice not found", HttpStatus.NOT_FOUND);
  }

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      ...invoice,
      monthLabel: `${MONTH_NAMES[invoice.billingMonth - 1]} ${invoice.billingYear}`,
    },
  });
};

/** GET /fees/invoices/:id/challan */
export const getFeeInvoiceChallan = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };

  const [invoice, school] = await Promise.all([
    getPrisma().feeInvoice.findFirst({
      where: { id, schoolId },
      include: {
        ...invoiceInclude,
        allocations: {
          include: {
            payment: {
              select: {
                id: true,
                receiptNo: true,
                amount: true,
                method: true,
                paidAt: true,
              },
            },
          },
        },
      },
    }),
    getPrisma().school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        logoUrl: true,
      },
    }),
  ]);

  if (!invoice || !school) {
    throw new AppError("Invoice not found", HttpStatus.NOT_FOUND);
  }

  // Calculate prior unpaid balance strictly before this invoice's billing period
  const priorAgg = await getPrisma().feeInvoice.aggregate({
    where: {
      schoolId,
      studentId: invoice.studentId,
      status: { in: ["UNPAID", "PARTIAL"] },
      NOT: { id: invoice.id },
      OR: [
        { billingYear: { lt: invoice.billingYear } },
        {
          billingYear: invoice.billingYear,
          billingMonth: { lt: invoice.billingMonth },
        },
      ],
    },
    _sum: { balanceAmount: true },
  });

  const previousArrears = roundMoney(priorAgg._sum.balanceAmount ?? 0);
  const challanData = formatChallanData({
    invoice,
    school,
    priorBalance: previousArrears,
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: challanData,
  });
};

/** POST /fees/invoices/bulk-challan */
export const getBulkInvoiceChallans = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const body = req.body ?? {};
  const {
    invoiceIds,
    classId,
    sectionId,
    billingMonth,
    billingYear,
    status,
    search,
  } = body;

  const school = await getPrisma().school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
    },
  });

  if (!school) {
    throw new AppError("School not found", HttpStatus.NOT_FOUND);
  }

  const ids =
    Array.isArray(invoiceIds) && invoiceIds.length > 0
      ? invoiceIds.map(String)
      : null;

  const invoices = await getPrisma().feeInvoice.findMany({
    where: {
      schoolId,
      ...(ids ? { id: { in: ids } } : {}),
      ...(typeof classId === "string" && classId
        ? { enrollment: { classId } }
        : {}),
      ...(typeof sectionId === "string" && sectionId
        ? { enrollment: { sectionId } }
        : {}),
      ...(billingMonth ? { billingMonth: Number(billingMonth) } : {}),
      ...(billingYear ? { billingYear: Number(billingYear) } : {}),
      ...(typeof search === "string" && search.trim()
        ? {
            OR: [
              { invoiceNo: { contains: search.trim() } },
              { student: { name: { contains: search.trim() } } },
              { student: { registrationNo: { contains: search.trim() } } },
            ],
          }
        : {}),
      ...(typeof status === "string" && status
        ? status.toUpperCase() === "OPEN" ||
          status.toUpperCase() === "UNPAID_PARTIAL"
          ? {
              status: { in: ["UNPAID", "PARTIAL"] as const },
              balanceAmount: { gt: 0 },
            }
          : status.toUpperCase() === "ALL"
            ? {}
            : {
                status: status.toUpperCase() as
                  | "UNPAID"
                  | "PARTIAL"
                  | "PAID"
                  | "WAIVED"
                  | "CANCELLED",
              }
        : { status: { not: "CANCELLED" } }),
    },
    include: {
      ...invoiceInclude,
      allocations: {
        include: {
          payment: {
            select: {
              id: true,
              receiptNo: true,
              amount: true,
              method: true,
              paidAt: true,
            },
          },
        },
      },
    },
    orderBy: [
      { enrollment: { class: { className: "asc" } } },
      { enrollment: { rollNo: "asc" } },
      { student: { name: "asc" } },
    ],
    take: 500,
  });

  const studentIds = [...new Set(invoices.map((i) => i.studentId))];
  const priorInvoices = await getPrisma().feeInvoice.findMany({
    where: {
      schoolId,
      studentId: { in: studentIds },
      status: { in: ["UNPAID", "PARTIAL"] },
    },
    select: {
      id: true,
      studentId: true,
      billingYear: true,
      billingMonth: true,
      balanceAmount: true,
    },
  });

  const challans = invoices.map((inv) => {
    const arrears = priorInvoices
      .filter(
        (p) =>
          p.studentId === inv.studentId &&
          p.id !== inv.id &&
          (p.billingYear < inv.billingYear ||
            (p.billingYear === inv.billingYear &&
              p.billingMonth < inv.billingMonth))
      )
      .reduce((sum, p) => sum + p.balanceAmount, 0);

    return formatChallanData({
      invoice: inv,
      school,
      priorBalance: roundMoney(arrears),
    });
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      count: challans.length,
      challans,
    },
  });
};

/** POST /fees/invoices/:id/apply-fine */
export const applyInvoiceLateFine = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const body = req.body ?? {};
  const fine = parsePositiveAmount(body.amount ?? 100, "fine amount");
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : "Late payment fine";

  const invoice = await getPrisma().feeInvoice.findFirst({
    where: { id, schoolId },
    include: { items: true },
  });

  if (!invoice) {
    throw new AppError("Invoice not found", HttpStatus.NOT_FOUND);
  }

  if (invoice.status === "CANCELLED" || invoice.status === "PAID") {
    throw new AppError(
      "Cannot apply fine to a paid or cancelled invoice",
      HttpStatus.BAD_REQUEST
    );
  }

  if (invoice.fineAmount > 0) {
    throw new AppError(
      "Fine has already been applied to this invoice",
      HttpStatus.BAD_REQUEST
    );
  }

  if (invoice.fineWaived) {
    throw new AppError(
      "Fine on this invoice was previously waived",
      HttpStatus.BAD_REQUEST
    );
  }

  const updated = await getPrisma().$transaction(async (tx) => {
    const fineParticular = await tx.feeParticular.findFirst({
      where: { schoolId, key: "FINE" },
    });

    await tx.feeInvoiceItem.create({
      data: {
        invoiceId: invoice.id,
        label: `Late Fine (${reason})`,
        key: "FINE",
        amount: fine,
        sortOrder: 88,
        isDiscount: false,
        feeParticularId: fineParticular?.id ?? null,
      },
    });

    const newSubtotal = roundMoney(invoice.subtotal + fine);
    const newTotal = roundMoney(invoice.totalAmount + fine);
    const newBalance = roundMoney(invoice.balanceAmount + fine);
    const newStatus = invoiceStatus(newTotal, invoice.paidAmount);

    return tx.feeInvoice.update({
      where: { id: invoice.id },
      data: {
        subtotal: newSubtotal,
        fineAmount: fine,
        totalAmount: newTotal,
        balanceAmount: newBalance,
        status: newStatus,
      },
      include: invoiceInclude,
    });
  });

  return ApiResponse.success(res, {
    message: `Late fine of PKR ${fine} applied successfully`,
    data: {
      ...updated,
      monthLabel: `${MONTH_NAMES[updated.billingMonth - 1]} ${updated.billingYear}`,
    },
  });
};

/** POST /fees/invoices/apply-late-fines (bulk) */
export const applyBulkLateFines = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const body = req.body ?? {};
  const fine = parsePositiveAmount(body.amount ?? 100, "fine amount");
  const billingMonth = body.billingMonth
    ? Number(body.billingMonth)
    : undefined;
  const billingYear = body.billingYear ? Number(body.billingYear) : undefined;
  const classId =
    typeof body.classId === "string" && body.classId
      ? body.classId
      : undefined;
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : "Late payment fine";

  const now = new Date();
  const overdueInvoices = await getPrisma().feeInvoice.findMany({
    where: {
      schoolId,
      status: { in: ["UNPAID", "PARTIAL"] },
      fineAmount: 0,
      fineWaived: false,
      dueDate: { lt: now },
      ...(billingMonth ? { billingMonth } : {}),
      ...(billingYear ? { billingYear } : {}),
      ...(classId ? { enrollment: { classId } } : {}),
    },
    select: { id: true },
  });

  if (overdueInvoices.length === 0) {
    return ApiResponse.success(res, {
      message: "No eligible overdue invoices without fine found",
      data: { appliedCount: 0 },
    });
  }

  const fineParticular = await getPrisma().feeParticular.findFirst({
    where: { schoolId, key: "FINE" },
  });

  let appliedCount = 0;
  for (const inv of overdueInvoices) {
    try {
      await getPrisma().$transaction(async (tx) => {
        const fullInv = await tx.feeInvoice.findUniqueOrThrow({
          where: { id: inv.id },
        });
        if (fullInv.fineAmount > 0 || fullInv.fineWaived) return;

        await tx.feeInvoiceItem.create({
          data: {
            invoiceId: inv.id,
            label: `Late Fine (${reason})`,
            key: "FINE",
            amount: fine,
            sortOrder: 88,
            isDiscount: false,
            feeParticularId: fineParticular?.id ?? null,
          },
        });

        const newSubtotal = roundMoney(fullInv.subtotal + fine);
        const newTotal = roundMoney(fullInv.totalAmount + fine);
        const newBalance = roundMoney(fullInv.balanceAmount + fine);
        const newStatus = invoiceStatus(newTotal, fullInv.paidAmount);

        await tx.feeInvoice.update({
          where: { id: inv.id },
          data: {
            subtotal: newSubtotal,
            fineAmount: fine,
            totalAmount: newTotal,
            balanceAmount: newBalance,
            status: newStatus,
          },
        });
      });
      appliedCount += 1;
    } catch {
      // Continue next
    }
  }

  return ApiResponse.success(res, {
    message: `Late fine of PKR ${fine} applied to ${appliedCount} overdue invoice(s)`,
    data: { appliedCount },
  });
};

/** POST /fees/invoices/:id/adjust — manual discount or fee adjustment */
export const adjustInvoice = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const body = req.body ?? {};
  validateRequired(body, ["type", "amount", "reason"]);

  const type = String(body.type).toUpperCase();
  if (type !== "DISCOUNT" && type !== "CHARGE") {
    throw new AppError(
      "type must be DISCOUNT or CHARGE",
      HttpStatus.BAD_REQUEST
    );
  }
  const amount = parsePositiveAmount(body.amount);
  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim()
      : type === "DISCOUNT"
        ? "Special Waiver / Concession"
        : "Adjustment Charge";
  const reason = String(body.reason).trim();

  const invoice = await getPrisma().feeInvoice.findFirst({
    where: { id, schoolId },
  });
  if (!invoice) throw new AppError("Invoice not found", HttpStatus.NOT_FOUND);
  if (invoice.status === "CANCELLED" || invoice.status === "PAID") {
    throw new AppError(
      "Cannot adjust paid or cancelled invoice",
      HttpStatus.BAD_REQUEST
    );
  }

  const updated = await getPrisma().$transaction(async (tx) => {
    if (type === "DISCOUNT") {
      await tx.feeInvoiceItem.create({
        data: {
          invoiceId: invoice.id,
          label: `${label} (${reason})`,
          key: "MANUAL_DISCOUNT",
          amount,
          sortOrder: 95,
          isDiscount: true,
        },
      });

      const newDiscount = roundMoney(invoice.discountAmount + amount);
      const newTotal = roundMoney(Math.max(0, invoice.subtotal - newDiscount));
      const newBalance = roundMoney(Math.max(0, newTotal - invoice.paidAmount));
      const newStatus = invoiceStatus(newTotal, invoice.paidAmount);

      return tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          discountAmount: newDiscount,
          totalAmount: newTotal,
          balanceAmount: newBalance,
          status: newStatus,
        },
        include: invoiceInclude,
      });
    } else {
      await tx.feeInvoiceItem.create({
        data: {
          invoiceId: invoice.id,
          label: `${label} (${reason})`,
          key: "ADJUSTMENT",
          amount,
          sortOrder: 50,
          isDiscount: false,
        },
      });

      const newSubtotal = roundMoney(invoice.subtotal + amount);
      const newTotal = roundMoney(
        Math.max(0, newSubtotal - invoice.discountAmount)
      );
      const newBalance = roundMoney(Math.max(0, newTotal - invoice.paidAmount));
      const newStatus = invoiceStatus(newTotal, invoice.paidAmount);

      return tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          subtotal: newSubtotal,
          totalAmount: newTotal,
          balanceAmount: newBalance,
          status: newStatus,
        },
        include: invoiceInclude,
      });
    }
  });

  return ApiResponse.success(res, {
    message: "Invoice adjusted successfully",
    data: {
      ...updated,
      monthLabel: `${MONTH_NAMES[updated.billingMonth - 1]} ${updated.billingYear}`,
    },
  });
};

/** POST /fees/collect */
export const collectFeePayment = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const body = req.body ?? {};
  validateRequired(body, ["studentId", "amount"]);

  const studentId = String(body.studentId);
  const amount = parsePositiveAmount(body.amount);
  const method = String(body.method || "CASH");
  validateEnum(method, PAYMENT_METHODS, "Invalid payment method");

  const student = await getPrisma().student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true, name: true, registrationNo: true, advanceBalance: true },
  });
  if (!student) {
    throw new AppError(ApiMessages.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const paidAt = body.paidAt ? new Date(String(body.paidAt)) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    throw new AppError("Invalid paidAt", HttpStatus.BAD_REQUEST);
  }

  const invoiceIds: string[] = Array.isArray(body.invoiceIds)
    ? body.invoiceIds.map(String)
    : body.invoiceId
      ? [String(body.invoiceId)]
      : [];

  let openInvoices = await getPrisma().feeInvoice.findMany({
    where: {
      schoolId,
      studentId,
      status: { in: ["UNPAID", "PARTIAL"] },
      ...(invoiceIds.length > 0 ? { id: { in: invoiceIds } } : {}),
    },
    orderBy: [{ billingYear: "asc" }, { billingMonth: "asc" }, { createdAt: "asc" }],
  });

  // If no open invoices exist, auto-generate current month / admission bill so payment settles it directly
  if (openInvoices.length === 0) {
    const studentWithEnrollment = await getPrisma().student.findFirst({
      where: { id: studentId, schoolId },
      include: { enrollments: { where: { isCurrent: true }, take: 1 } },
    });
    const currentEnrollment = studentWithEnrollment?.enrollments[0];
    if (currentEnrollment) {
      await autoGenerateInvoicesForNewStudent({
        schoolId,
        studentId,
        enrollmentId: currentEnrollment.id,
        classId: currentEnrollment.classId,
        admissionDate: studentWithEnrollment.admissionDate,
        academicYear: currentEnrollment.academicYear,
      });

      openInvoices = await getPrisma().feeInvoice.findMany({
        where: {
          schoolId,
          studentId,
          status: { in: ["UNPAID", "PARTIAL"] },
        },
        orderBy: [{ billingYear: "asc" }, { billingMonth: "asc" }, { createdAt: "asc" }],
      });
    }
  }

  const receiptNo = await nextReceiptNo(schoolId, paidAt);

  const result = await getPrisma().$transaction(async (tx) => {
    const payment = await tx.feePayment.create({
      data: {
        receiptNo,
        amount,
        method: method as (typeof PAYMENT_METHODS)[number],
        status: "COMPLETED",
        paidAt,
        reference:
          typeof body.reference === "string" ? body.reference.trim() : null,
        remarks:
          typeof body.remarks === "string" ? body.remarks.trim() : null,
        schoolId,
        studentId,
        receivedByUserId: req.user?.userId ?? null,
      },
    });

    let remaining = amount;
    const allocations: Array<{ invoiceId: string; amount: number }> = [];

    for (const inv of openInvoices) {
      if (remaining <= 0) break;
      const apply = roundMoney(Math.min(remaining, inv.balanceAmount));
      if (apply <= 0) continue;

      await tx.feePaymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: inv.id,
          amount: apply,
        },
      });

      const paidAmount = roundMoney(inv.paidAmount + apply);
      const balanceAmount = roundMoney(Math.max(0, inv.totalAmount - paidAmount));
      const status = invoiceStatus(inv.totalAmount, paidAmount);

      await tx.feeInvoice.update({
        where: { id: inv.id },
        data: { paidAmount, balanceAmount, status },
      });

      allocations.push({ invoiceId: inv.id, amount: apply });
      remaining = roundMoney(remaining - apply);
    }

    // If remaining cash > 0, credit it directly to student.advanceBalance
    let creditedToAdvance = 0;
    if (remaining > 0) {
      creditedToAdvance = roundMoney(remaining);
      await tx.student.update({
        where: { id: studentId },
        data: { advanceBalance: { increment: creditedToAdvance } },
      });
    }

    const updatedStudent = await tx.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { id: true, name: true, registrationNo: true, advanceBalance: true },
    });

    const fullPayment = await tx.feePayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: {
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNo: true,
                billingMonth: true,
                billingYear: true,
                totalAmount: true,
                paidAmount: true,
                balanceAmount: true,
                status: true,
              },
            },
          },
        },
        student: {
          select: { id: true, name: true, registrationNo: true, advanceBalance: true },
        },
      },
    });

    return {
      ...fullPayment,
      appliedToInvoices: roundMoney(amount - remaining),
      creditedToAdvance,
      newAdvanceBalance: updatedStudent.advanceBalance,
    };
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message:
      result.creditedToAdvance > 0
        ? `Payment recorded. PKR ${result.appliedToInvoices} applied to invoices, PKR ${result.creditedToAdvance} added to advance balance.`
        : "Payment recorded successfully",
    data: result,
  });
};

/** GET /fees/student/:studentId/ledger */
export const getStudentFeeLedger = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { studentId } = req.params as { studentId: string };

  const student = await getPrisma().student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      name: true,
      registrationNo: true,
      photoUrl: true,
      contactPhone: true,
      advanceBalance: true,
      enrollments: {
        where: { isCurrent: true },
        take: 1,
        select: {
          academicYear: true,
          feeDiscount: true,
          rollNo: true,
          class: { select: { id: true, className: true, montlyFee: true } },
          section: { select: { sectionName: true } },
        },
      },
    },
  });

  if (!student) {
    throw new AppError(ApiMessages.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const [invoices, payments] = await Promise.all([
    getPrisma().feeInvoice.findMany({
      where: { schoolId, studentId, status: { not: "CANCELLED" } },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ billingYear: "asc" }, { billingMonth: "asc" }],
    }),
    getPrisma().feePayment.findMany({
      where: { schoolId, studentId },
      include: {
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
      orderBy: { paidAt: "asc" },
    }),
  ]);

  const totalBilled = roundMoney(
    invoices.reduce((s, i) => s + i.totalAmount, 0)
  );
  const completedPayments = payments.filter((p) => p.status !== "VOIDED");
  const totalPaid = roundMoney(
    completedPayments.reduce((s, p) => s + p.amount, 0)
  );
  const totalBalance = roundMoney(
    invoices
      .filter((i) => i.status === "UNPAID" || i.status === "PARTIAL")
      .reduce((s, i) => s + i.balanceAmount, 0)
  );

  const months = invoices.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    billingMonth: inv.billingMonth,
    billingYear: inv.billingYear,
    monthLabel: `${MONTH_NAMES[inv.billingMonth - 1]} ${inv.billingYear}`,
    academicYear: inv.academicYear,
    status: inv.status,
    totalAmount: inv.totalAmount,
    paidAmount: inv.paidAmount,
    balanceAmount: inv.balanceAmount,
    dueDate: inv.dueDate,
    items: inv.items,
    isPaid: inv.status === "PAID" || inv.balanceAmount <= 0,
  }));

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      student: {
        ...student,
        enrollment: student.enrollments[0] ?? null,
      },
      summary: {
        totalBilled,
        totalPaid,
        totalBalance,
        advanceBalance: student.advanceBalance ?? 0,
        netPayable: roundMoney(Math.max(0, totalBalance - (student.advanceBalance ?? 0))),
        unpaidMonths: months.filter((m) => !m.isPaid).length,
        paidMonths: months.filter((m) => m.isPaid).length,
      },
      months,
      payments,
    },
  });
};

/** GET /fees/defaulters */
export const getFeeDefaulters = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const classId =
    typeof req.query.classId === "string" && req.query.classId
      ? req.query.classId
      : null;
  const academicYear =
    typeof req.query.academicYear === "string" && req.query.academicYear
      ? req.query.academicYear
      : null;

  const invoices = await getPrisma().feeInvoice.findMany({
    where: {
      schoolId,
      status: { in: ["UNPAID", "PARTIAL"] },
      balanceAmount: { gt: 0 },
      ...(academicYear ? { academicYear } : {}),
      ...(classId ? { enrollment: { classId } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          registrationNo: true,
          contactPhone: true,
          photoUrl: true,
        },
      },
      enrollment: {
        select: {
          rollNo: true,
          class: { select: { id: true, className: true } },
          section: { select: { sectionName: true } },
        },
      },
    },
    orderBy: [{ billingYear: "asc" }, { billingMonth: "asc" }],
  });

  type Bucket = {
    student: (typeof invoices)[0]["student"];
    className: string | null;
    sectionName: string | null;
    rollNo: string | null;
    totalBalance: number;
    unpaidMonths: number;
    oldestDue: string | null;
    invoices: Array<{
      id: string;
      invoiceNo: string;
      monthLabel: string;
      balanceAmount: number;
      status: string;
      dueDate: Date | null;
    }>;
  };

  const map = new Map<string, Bucket>();

  for (const inv of invoices) {
    const key = inv.studentId;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        student: inv.student,
        className: inv.enrollment?.class.className ?? null,
        sectionName: inv.enrollment?.section?.sectionName ?? null,
        rollNo: inv.enrollment?.rollNo ?? null,
        totalBalance: 0,
        unpaidMonths: 0,
        oldestDue: null,
        invoices: [],
      };
      map.set(key, bucket);
    }
    bucket.totalBalance = roundMoney(bucket.totalBalance + inv.balanceAmount);
    bucket.unpaidMonths += 1;
    const label = `${MONTH_NAMES[inv.billingMonth - 1]} ${inv.billingYear}`;
    if (!bucket.oldestDue) bucket.oldestDue = label;
    bucket.invoices.push({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      monthLabel: label,
      balanceAmount: inv.balanceAmount,
      status: inv.status,
      dueDate: inv.dueDate,
    });
  }

  const defaulters = [...map.values()].sort(
    (a, b) => b.totalBalance - a.totalBalance
  );

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      count: defaulters.length,
      totalOutstanding: roundMoney(
        defaulters.reduce((s, d) => s + d.totalBalance, 0)
      ),
      defaulters,
    },
  });
};

/** GET /fees/dashboard */
export const getFeesDashboard = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [
    billedAgg,
    paidAgg,
    unpaidAgg,
    overdueAgg,
    paidInvoiceCount,
    partialInvoiceCount,
    monthInvoices,
    todayPayments,
    defaulterGroups,
    recentPayments,
  ] = await Promise.all([
    getPrisma().feeInvoice.aggregate({
      where: { schoolId, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
    }),
    getPrisma().feePayment.aggregate({
      where: { schoolId, status: { not: "VOIDED" } },
      _sum: { amount: true },
    }),
    getPrisma().feeInvoice.aggregate({
      where: {
        schoolId,
        status: { in: ["UNPAID", "PARTIAL"] },
      },
      _sum: { balanceAmount: true },
      _count: true,
    }),
    getPrisma().feeInvoice.aggregate({
      where: {
        schoolId,
        status: { in: ["UNPAID", "PARTIAL"] },
        balanceAmount: { gt: 0 },
        dueDate: { lt: now },
      },
      _sum: { balanceAmount: true },
      _count: true,
    }),
    getPrisma().feeInvoice.count({
      where: { schoolId, status: "PAID" },
    }),
    getPrisma().feeInvoice.count({
      where: { schoolId, status: "PARTIAL" },
    }),
    getPrisma().feeInvoice.aggregate({
      where: {
        schoolId,
        billingMonth: month,
        billingYear: year,
        status: { not: "CANCELLED" },
      },
      _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
      _count: true,
    }),
    getPrisma().feePayment.aggregate({
      where: {
        schoolId,
        status: { not: "VOIDED" },
        paidAt: {
          gte: new Date(year, month - 1, now.getDate()),
          lt: new Date(year, month - 1, now.getDate() + 1),
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
    getPrisma().feeInvoice.groupBy({
      by: ["studentId"],
      where: {
        schoolId,
        status: { in: ["UNPAID", "PARTIAL"] },
        balanceAmount: { gt: 0 },
      },
    }),
    getPrisma().feePayment.findMany({
      where: { schoolId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            registrationNo: true,
            enrollments: {
              where: { isCurrent: true },
              take: 1,
              select: { class: { select: { className: true } } },
            },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 8,
    }),
  ]);

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      totalBilled: roundMoney(billedAgg._sum.totalAmount ?? 0),
      totalCollected: roundMoney(paidAgg._sum.amount ?? 0),
      totalOutstanding: roundMoney(unpaidAgg._sum.balanceAmount ?? 0),
      unpaidInvoiceCount: unpaidAgg._count,
      paidInvoiceCount,
      partialInvoiceCount,
      overdueInvoices: {
        count: overdueAgg._count,
        amount: roundMoney(overdueAgg._sum.balanceAmount ?? 0),
      },
      defaulterCount: defaulterGroups.length,
      thisMonth: {
        label: `${MONTH_NAMES[month - 1]} ${year}`,
        billed: roundMoney(monthInvoices._sum.totalAmount ?? 0),
        collected: roundMoney(monthInvoices._sum.paidAmount ?? 0),
        outstanding: roundMoney(monthInvoices._sum.balanceAmount ?? 0),
        invoiceCount: monthInvoices._count,
      },
      today: {
        collected: roundMoney(todayPayments._sum.amount ?? 0),
        paymentCount: todayPayments._count,
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        studentId: p.studentId,
        receiptNo: p.receiptNo,
        amount: p.amount,
        method: p.method,
        status: p.status,
        paidAt: p.paidAt,
        studentName: p.student?.name ?? "—",
        registrationNo: p.student?.registrationNo ?? "—",
        className: p.student?.enrollments?.[0]?.class?.className ?? "—",
      })),
    },
  });
};

/** GET /fees/reports/collection */
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

  const classId =
    typeof req.query.classId === "string" && req.query.classId
      ? req.query.classId
      : null;

  const payments = await getPrisma().feePayment.findMany({
    where: {
      schoolId,
      paidAt: { gte: from, lte: end },
      ...(classId
        ? {
            student: {
              enrollments: {
                some: { classId, isCurrent: true },
              },
            },
          }
        : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          registrationNo: true,
          enrollments: {
            where: { isCurrent: true },
            take: 1,
            select: { class: { select: { className: true } } },
          },
        },
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

  const activePayments = payments.filter((p) => p.status !== "VOIDED");
  const byMethod: Record<string, number> = {};
  for (const p of activePayments) {
    byMethod[p.method] = roundMoney((byMethod[p.method] ?? 0) + p.amount);
  }

  // Class-wise fee status
  const classes = await getPrisma().class.findMany({
    where: { schoolId },
    select: { id: true, className: true },
    orderBy: { className: "asc" },
  });

  const classSummary = await Promise.all(
    classes.map(async (c) => {
      const classInvoices = await getPrisma().feeInvoice.aggregate({
        where: {
          schoolId,
          enrollment: { classId: c.id },
          status: { not: "CANCELLED" },
        },
        _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
        _count: true,
      });

      return {
        classId: c.id,
        className: c.className,
        invoiceCount: classInvoices._count,
        totalBilled: roundMoney(classInvoices._sum.totalAmount ?? 0),
        totalCollected: roundMoney(classInvoices._sum.paidAmount ?? 0),
        totalOutstanding: roundMoney(classInvoices._sum.balanceAmount ?? 0),
      };
    })
  );

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      from,
      to: end,
      totalCollected: roundMoney(
        activePayments.reduce((s, p) => s + p.amount, 0)
      ),
      paymentCount: activePayments.length,
      byMethod,
      classSummary,
      payments,
    },
  });
};

/** GET /fees/preview/:studentId — preview charge for collect UI */
export const previewStudentFee = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { studentId } = req.params as { studentId: string };

  const resolved = await resolveStudentCharges(schoolId, studentId, {
    includePreviousBalance: true,
  });
  const { subtotal, discountAmount, totalAmount } = totalsFromLines(
    resolved.lines
  );

  // If student has never had any fee invoice generated, auto-create their admission bill
  const totalInvoicesCount = await getPrisma().feeInvoice.count({
    where: { schoolId, studentId, status: { not: "CANCELLED" } },
  });
  if (totalInvoicesCount === 0 && resolved.enrollment) {
    const studentData = await getPrisma().student.findUnique({
      where: { id: studentId },
      select: { admissionDate: true },
    });
    await autoGenerateInvoicesForNewStudent({
      schoolId,
      studentId,
      enrollmentId: resolved.enrollment.id,
      classId: resolved.enrollment.classId,
      admissionDate: studentData?.admissionDate,
      academicYear: resolved.enrollment.academicYear,
    });
  }

  const openInvoices = await getPrisma().feeInvoice.findMany({
    where: {
      schoolId,
      studentId,
      status: { in: ["UNPAID", "PARTIAL"] },
    },
    orderBy: [{ billingYear: "asc" }, { billingMonth: "asc" }],
    select: {
      id: true,
      invoiceNo: true,
      billingMonth: true,
      billingYear: true,
      academicYear: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      status: true,
      dueDate: true,
    },
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      ...resolved,
      structureTotals: { subtotal, discountAmount, totalAmount },
      openInvoices: openInvoices.map((inv) => ({
        ...inv,
        monthLabel: `${MONTH_NAMES[inv.billingMonth - 1]} ${inv.billingYear}`,
      })),
      outstandingBalance: roundMoney(
        openInvoices.reduce((s, i) => s + i.balanceAmount, 0)
      ),
      advanceBalance: resolved.student.advanceBalance ?? 0,
    },
  });
};

/** POST /fees/invoices/:id/cancel — cancel unpaid invoice with no payments */
export const cancelFeeInvoice = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };

  const invoice = await getPrisma().feeInvoice.findFirst({
    where: { id, schoolId },
    include: { allocations: { select: { id: true } } },
  });

  if (!invoice) {
    throw new AppError("Invoice not found", HttpStatus.NOT_FOUND);
  }

  if (invoice.status === "CANCELLED") {
    throw new AppError("Invoice is already cancelled", HttpStatus.BAD_REQUEST);
  }

  if (invoice.paidAmount > 0 || invoice.allocations.length > 0) {
    throw new AppError(
      "Cannot cancel an invoice that has payments. Refund/adjust payments first.",
      HttpStatus.BAD_REQUEST
    );
  }

  if (invoice.status !== "UNPAID") {
    throw new AppError(
      "Only unpaid invoices with zero payments can be cancelled",
      HttpStatus.BAD_REQUEST
    );
  }

  const updated = await getPrisma().feeInvoice.update({
    where: { id },
    data: {
      status: "CANCELLED",
      balanceAmount: 0,
      remarks:
        typeof req.body?.remarks === "string" && req.body.remarks.trim()
          ? req.body.remarks.trim()
          : invoice.remarks,
    },
    include: invoiceInclude,
  });

  return ApiResponse.success(res, {
    message: "Invoice cancelled",
    data: {
      ...updated,
      monthLabel: `${MONTH_NAMES[updated.billingMonth - 1]} ${updated.billingYear}`,
    },
  });
};

/** POST /fees/payments/:id/void — void a payment and restore invoice balances */
export const voidFeePayment = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const body = req.body ?? {};
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Voided by admin";

  const payment = await getPrisma().feePayment.findFirst({
    where: { id, schoolId },
    include: {
      allocations: {
        include: {
          invoice: true,
        },
      },
      student: true,
    },
  });

  if (!payment) {
    throw new AppError("Payment not found", HttpStatus.NOT_FOUND);
  }

  if (payment.status === "VOIDED") {
    throw new AppError("Payment is already voided", HttpStatus.BAD_REQUEST);
  }

  await getPrisma().$transaction(async (tx) => {
    let totalAllocated = 0;
    for (const alloc of payment.allocations) {
      totalAllocated += alloc.amount;
      const inv = alloc.invoice;
      const newPaid = roundMoney(Math.max(0, inv.paidAmount - alloc.amount));
      const newBal = roundMoney(Math.max(0, inv.totalAmount - newPaid));
      const newStatus = invoiceStatus(inv.totalAmount, newPaid);

      await tx.feeInvoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: newPaid,
          balanceAmount: newBal,
          status: newStatus,
        },
      });
    }

    // If payment amount exceeded totalAllocated, excess was credited to student.advanceBalance!
    const excessCredit = roundMoney(Math.max(0, payment.amount - totalAllocated));
    if (excessCredit > 0 && payment.studentId) {
      const student = await tx.student.findUnique({
        where: { id: payment.studentId },
        select: { advanceBalance: true },
      });
      if (student) {
        const updatedAdvance = roundMoney(Math.max(0, (student.advanceBalance ?? 0) - excessCredit));
        await tx.student.update({
          where: { id: payment.studentId },
          data: { advanceBalance: updatedAdvance },
        });
      }
    }

    await tx.feePayment.update({
      where: { id: payment.id },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        voidedByUserId: req.user?.userId ?? null,
        voidReason: reason,
      },
    });
  });

  return ApiResponse.success(res, {
    message: "Payment voided and invoice balances restored successfully",
  });
};

/** POST /fees/invoices/:id/waive-fine — waive fine on invoice */
export const waiveInvoiceFine = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const body = req.body ?? {};
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Fine waived by administrator";

  const invoice = await getPrisma().feeInvoice.findFirst({
    where: { id, schoolId },
  });

  if (!invoice) {
    throw new AppError("Invoice not found", HttpStatus.NOT_FOUND);
  }

  if (invoice.fineAmount <= 0) {
    throw new AppError("Invoice has no fine to waive", HttpStatus.BAD_REQUEST);
  }

  if (invoice.fineWaived) {
    throw new AppError("Fine has already been waived on this invoice", HttpStatus.BAD_REQUEST);
  }

  const fineToWaive = invoice.fineAmount;
  const newTotal = roundMoney(Math.max(0, invoice.totalAmount - fineToWaive));
  const newBalance = roundMoney(Math.max(0, newTotal - invoice.paidAmount));
  const newStatus = invoiceStatus(newTotal, invoice.paidAmount);

  await getPrisma().$transaction(async (tx) => {
    // Delete fine line item
    await tx.feeInvoiceItem.deleteMany({
      where: { invoiceId: invoice.id, key: "FINE" },
    });

    await tx.feeInvoice.update({
      where: { id: invoice.id },
      data: {
        fineAmount: 0,
        fineWaived: true,
        fineWaivedAmount: fineToWaive,
        fineWaivedReason: reason,
        fineWaivedAt: new Date(),
        fineWaivedByUserId: req.user?.userId ?? null,
        totalAmount: newTotal,
        balanceAmount: newBalance,
        status: newStatus,
      },
    });
  });

  return ApiResponse.success(res, {
    message: `Fine of PKR ${fineToWaive} waived successfully`,
  });
};

/** GET /fees/payments/:id/receipt — get full receipt/challan data for printing */
export const getFeePaymentReceipt = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };

  const payment = await getPrisma().feePayment.findFirst({
    where: { schoolId, OR: [{ id }, { receiptNo: id }] },
    include: {
      allocations: {
        include: {
          invoice: {
            include: {
              items: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
      student: {
        include: {
          enrollments: {
            where: { isCurrent: true },
            take: 1,
            include: { class: true, section: true },
          },
          parents: {
            where: { isPrimaryGuardian: true },
            take: 1,
            include: { parent: true },
          },
        },
      },
      school: true,
    },
  });

  if (!payment) {
    throw new AppError("Payment receipt not found", HttpStatus.NOT_FOUND);
  }

  const openInvoices = await getPrisma().feeInvoice.aggregate({
    where: {
      schoolId,
      studentId: payment.studentId,
      status: { in: ["UNPAID", "PARTIAL"] },
    },
    _sum: { balanceAmount: true },
  });

  const enrollment = payment.student.enrollments[0] ?? null;
  const primaryParent = payment.student.parents[0]?.parent ?? null;

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      receiptNo: payment.receiptNo,
      paidAt: payment.paidAt,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      remarks: payment.remarks,
      voidedAt: payment.voidedAt,
      voidReason: payment.voidReason,
      school: {
        id: payment.school.id,
        name: payment.school.name,
        address: payment.school.address,
        phone: payment.school.phone,
        email: payment.school.email,
        logoUrl: payment.school.logoUrl,
      },
      student: {
        id: payment.student.id,
        name: payment.student.name,
        registrationNo: payment.student.registrationNo,
        className: enrollment?.class.className ?? "—",
        sectionName: enrollment?.section?.sectionName ?? "",
        rollNo: enrollment?.rollNo ?? "—",
        fatherName: primaryParent?.name ?? "",
        contactPhone: payment.student.contactPhone ?? primaryParent?.mobileNo ?? "",
        advanceBalance: payment.student.advanceBalance ?? 0,
        remainingDue: roundMoney(openInvoices._sum.balanceAmount ?? 0),
      },
      allocations: payment.allocations.map((a) => ({
        invoiceNo: a.invoice.invoiceNo,
        monthLabel: `${MONTH_NAMES[a.invoice.billingMonth - 1]} ${a.invoice.billingYear}`,
        allocatedAmount: a.amount,
        invoiceTotal: a.invoice.totalAmount,
        invoiceBalance: a.invoice.balanceAmount,
        items: a.invoice.items,
      })),
    },
  });
};
