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
  student: { id: string; name: string; registrationNo: string };
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
        },
      },
    },
    select: { id: true },
  });

  let created = 0;
  let skipped = 0;
  const monthLabels: string[] = [];

  for (const period of periods) {
    const { billingMonth, billingYear, academicYear } = period;
    monthLabels.push(`${MONTH_NAMES[billingMonth - 1]} ${billingYear}`);
    const dueDate =
      body.dueDate && String(body.dueDate)
        ? new Date(String(body.dueDate))
        : new Date(billingYear, billingMonth - 1, 10);

    for (const s of students) {
      const existing = await getPrisma().feeInvoice.findUnique({
        where: {
          studentId_academicYear_billingMonth_billingYear: {
            studentId: s.id,
            academicYear,
            billingMonth,
            billingYear,
          },
        },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
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
          skipped += 1;
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
      } catch {
        skipped += 1;
      }
    }
  }

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
      mode,
      periodsCount: periods.length,
      monthLabel: label,
      periods: monthLabels,
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
        ? {
            status: status as
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
    select: { id: true },
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

  const openInvoices = await getPrisma().feeInvoice.findMany({
    where: {
      schoolId,
      studentId,
      status: { in: ["UNPAID", "PARTIAL"] },
      ...(invoiceIds.length > 0 ? { id: { in: invoiceIds } } : {}),
    },
    orderBy: [{ billingYear: "asc" }, { billingMonth: "asc" }, { createdAt: "asc" }],
  });

  if (openInvoices.length === 0) {
    throw new AppError(
      "No unpaid invoices found for this student",
      HttpStatus.BAD_REQUEST
    );
  }

  const totalDue = roundMoney(
    openInvoices.reduce((s, inv) => s + inv.balanceAmount, 0)
  );
  if (amount > totalDue + 0.01) {
    throw new AppError(
      `Payment exceeds outstanding balance (PKR ${totalDue})`,
      HttpStatus.BAD_REQUEST
    );
  }

  const receiptNo = await nextReceiptNo(schoolId, paidAt);

  const result = await getPrisma().$transaction(async (tx) => {
    const payment = await tx.feePayment.create({
      data: {
        receiptNo,
        amount,
        method: method as (typeof PAYMENT_METHODS)[number],
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
          select: { id: true, name: true, registrationNo: true },
        },
      },
    });

    return fullPayment;
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: "Payment recorded successfully",
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
  const totalPaid = roundMoney(payments.reduce((s, p) => s + p.amount, 0));
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

  const [billedAgg, paidAgg, unpaidAgg, monthInvoices, todayPayments, defaulterGroups] =
    await Promise.all([
      getPrisma().feeInvoice.aggregate({
        where: { schoolId, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      getPrisma().feePayment.aggregate({
        where: { schoolId },
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
    ]);

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      totalBilled: roundMoney(billedAgg._sum.totalAmount ?? 0),
      totalCollected: roundMoney(paidAgg._sum.amount ?? 0),
      totalOutstanding: roundMoney(unpaidAgg._sum.balanceAmount ?? 0),
      unpaidInvoiceCount: unpaidAgg._count,
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
  for (const p of payments) {
    byMethod[p.method] = roundMoney((byMethod[p.method] ?? 0) + p.amount);
  }

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      from,
      to: end,
      totalCollected: roundMoney(payments.reduce((s, p) => s + p.amount, 0)),
      paymentCount: payments.length,
      byMethod,
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
    },
  });
};
