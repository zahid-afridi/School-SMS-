import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { validateEnum, validateRequired } from "../../utils/validate.js";

const FEE_SCOPES = ["ALL_STUDENTS", "CLASS", "STUDENT"] as const;
type FeeScope = (typeof FEE_SCOPES)[number];

const DEFAULT_PARTICULARS: Array<{
  key: string;
  label: string;
  sortOrder: number;
  valueType: "EDITABLE" | "AUTO" | "FIXED";
}> = [
  { key: "MONTHLY_TUITION", label: "MONTHLY TUITION FEE", sortOrder: 1, valueType: "AUTO" },
  { key: "ADMISSION_FEE", label: "ADMISSION FEE", sortOrder: 2, valueType: "EDITABLE" },
  { key: "REGISTRATION_FEE", label: "REGISTRATION FEE", sortOrder: 3, valueType: "EDITABLE" },
  { key: "ART_MATERIAL", label: "ART MATERIAL", sortOrder: 4, valueType: "EDITABLE" },
  { key: "TRANSPORT", label: "TRANSPORT", sortOrder: 5, valueType: "EDITABLE" },
  { key: "BOOKS", label: "BOOKS", sortOrder: 6, valueType: "EDITABLE" },
  { key: "UNIFORM", label: "UNIFORM", sortOrder: 7, valueType: "EDITABLE" },
  { key: "FINE", label: "FINE", sortOrder: 8, valueType: "EDITABLE" },
  { key: "OTHERS", label: "OTHERS", sortOrder: 9, valueType: "EDITABLE" },
  { key: "PREVIOUS_BALANCE", label: "PREVIOUS BALANCE", sortOrder: 10, valueType: "AUTO" },
  { key: "DISCOUNT", label: "DISCOUNT IN FEE", sortOrder: 11, valueType: "AUTO" },
];

function requireSchoolId(req: Request): string {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }
  return schoolId;
}

function buildScopeKey(scope: FeeScope, classId?: string | null, studentId?: string | null) {
  if (scope === "ALL_STUDENTS") return "ALL";
  if (scope === "CLASS") {
    if (!classId) throw new AppError("classId is required for CLASS scope", HttpStatus.BAD_REQUEST);
    return `CLASS:${classId}`;
  }
  if (!studentId) {
    throw new AppError("studentId is required for STUDENT scope", HttpStatus.BAD_REQUEST);
  }
  return `STUDENT:${studentId}`;
}

async function ensureDefaultParticulars(schoolId: string) {
  const count = await getPrisma().feeParticular.count({ where: { schoolId } });
  if (count > 0) return;

  await getPrisma().feeParticular.createMany({
    data: DEFAULT_PARTICULARS.map((item) => ({
      ...item,
      schoolId,
      isSystem: true,
    })),
  });
}

async function getParticulars(schoolId: string) {
  await ensureDefaultParticulars(schoolId);
  return getPrisma().feeParticular.findMany({
    where: { schoolId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

function parseAmount(value: unknown): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError("Invalid fee amount", HttpStatus.BAD_REQUEST);
  }
  return amount;
}

export const getFeeStructure = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const scope = String(req.query.scope || "ALL_STUDENTS") as FeeScope;
  validateEnum(scope, FEE_SCOPES, "Invalid fee scope");

  const classId =
    typeof req.query.classId === "string" && req.query.classId
      ? req.query.classId
      : null;
  const studentId =
    typeof req.query.studentId === "string" && req.query.studentId
      ? req.query.studentId
      : null;

  const particulars = await getParticulars(schoolId);
  const scopeKey = buildScopeKey(scope, classId, studentId);

  let selectedClass: {
    id: string;
    className: string;
    montlyFee: number;
  } | null = null;
  let selectedStudent: {
    id: string;
    name: string;
    registrationNo: string;
    classId?: string | null;
    montlyFee?: number | null;
    feeDiscount?: number | null;
  } | null = null;

  if (scope === "CLASS") {
    selectedClass = await getPrisma().class.findFirst({
      where: { id: classId!, schoolId },
      select: { id: true, className: true, montlyFee: true },
    });
    if (!selectedClass) {
      throw new AppError("Class not found", HttpStatus.NOT_FOUND);
    }
  }

  if (scope === "STUDENT") {
    const student = await getPrisma().student.findFirst({
      where: { id: studentId!, schoolId },
      select: {
        id: true,
        name: true,
        registrationNo: true,
        enrollments: {
          where: { isCurrent: true },
          take: 1,
          select: {
            feeDiscount: true,
            class: { select: { id: true, montlyFee: true, className: true } },
          },
        },
      },
    });
    if (!student) {
      throw new AppError(ApiMessages.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const enrollment = student.enrollments[0];
    selectedStudent = {
      id: student.id,
      name: student.name,
      registrationNo: student.registrationNo,
      classId: enrollment?.class?.id ?? null,
      montlyFee: enrollment?.class?.montlyFee ?? null,
      feeDiscount: enrollment?.feeDiscount ?? 0,
    };
    if (enrollment?.class) {
      selectedClass = {
        id: enrollment.class.id,
        className: enrollment.class.className,
        montlyFee: enrollment.class.montlyFee,
      };
    }
  }

  // Merge amounts: ALL → CLASS → STUDENT
  const allStructure = await getPrisma().feeStructure.findUnique({
    where: { schoolId_scopeKey: { schoolId, scopeKey: "ALL" } },
    include: { items: true },
  });

  let classStructure = null;
  const classScopeKey =
    scope === "CLASS"
      ? scopeKey
      : selectedClass
        ? `CLASS:${selectedClass.id}`
        : null;
  if (classScopeKey) {
    classStructure = await getPrisma().feeStructure.findUnique({
      where: { schoolId_scopeKey: { schoolId, scopeKey: classScopeKey } },
      include: { items: true },
    });
  }

  let studentStructure = null;
  if (scope === "STUDENT") {
    studentStructure = await getPrisma().feeStructure.findUnique({
      where: { schoolId_scopeKey: { schoolId, scopeKey } },
      include: { items: true },
    });
  }

  const amountMap = new Map<string, number>();
  for (const item of allStructure?.items ?? []) {
    amountMap.set(item.feeParticularId, item.amount);
  }
  if (scope === "CLASS" || scope === "STUDENT") {
    for (const item of classStructure?.items ?? []) {
      amountMap.set(item.feeParticularId, item.amount);
    }
  }
  if (scope === "STUDENT") {
    for (const item of studentStructure?.items ?? []) {
      amountMap.set(item.feeParticularId, item.amount);
    }
  }

  const items = particulars.map((particular) => {
    const savedAmount = amountMap.get(particular.id) ?? 0;
    let amount = savedAmount;
    let displayValue: string | number = savedAmount;
    let isEditable = particular.valueType === "EDITABLE";

    if (particular.key === "MONTHLY_TUITION") {
      if (scope === "ALL_STUDENTS") {
        isEditable = false;
        displayValue = "From class monthly fee";
        amount = 0;
      } else {
        isEditable = false;
        amount = selectedClass?.montlyFee ?? 0;
        displayValue = amount;
      }
    } else if (particular.key === "PREVIOUS_BALANCE") {
      isEditable = false;
      displayValue =
        scope === "ALL_STUDENTS"
          ? "Auto from unpaid invoices"
          : "Auto from unpaid invoices";
      amount = 0;
    } else if (particular.key === "DISCOUNT") {
      isEditable = false;
      if (scope === "STUDENT") {
        amount = selectedStudent?.feeDiscount ?? 0;
        displayValue = `${amount}% of tuition`;
      } else if (scope === "ALL_STUDENTS") {
        displayValue = "From student enrollment %";
        amount = 0;
      } else {
        displayValue = "From student enrollment %";
        amount = 0;
      }
    }

    return {
      particularId: particular.id,
      key: particular.key,
      label: particular.label,
      valueType: particular.valueType,
      sortOrder: particular.sortOrder,
      amount,
      displayValue,
      isEditable,
    };
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      scope,
      scopeKey,
      classId: selectedClass?.id ?? classId,
      studentId: selectedStudent?.id ?? studentId,
      class: selectedClass,
      student: selectedStudent
        ? {
            id: selectedStudent.id,
            name: selectedStudent.name,
            registrationNo: selectedStudent.registrationNo,
          }
        : null,
      items,
    },
  });
};

export const saveFeeStructure = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { scope, classId, studentId, items } = req.body ?? {};

  validateRequired(req.body ?? {}, ["scope", "items"]);
  validateEnum(scope, FEE_SCOPES, "Invalid fee scope");

  if (!Array.isArray(items)) {
    throw new AppError("items must be an array", HttpStatus.BAD_REQUEST);
  }

  const particulars = await getParticulars(schoolId);
  const particularById = new Map(particulars.map((p) => [p.id, p]));
  const scopeKey = buildScopeKey(
    scope as FeeScope,
    classId ?? null,
    studentId ?? null
  );

  if (scope === "CLASS") {
    const exists = await getPrisma().class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });
    if (!exists) throw new AppError("Class not found", HttpStatus.NOT_FOUND);
  }

  if (scope === "STUDENT") {
    const exists = await getPrisma().student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });
    if (!exists) {
      throw new AppError(ApiMessages.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }

  const editableItems = items
    .map((item: { particularId?: string; amount?: unknown }) => {
      const particular = particularById.get(String(item.particularId ?? ""));
      if (!particular || particular.valueType !== "EDITABLE") return null;
      return {
        feeParticularId: particular.id,
        amount: parseAmount(item.amount),
      };
    })
    .filter(Boolean) as Array<{ feeParticularId: string; amount: number }>;

  const structure = await getPrisma().$transaction(async (tx) => {
    const saved = await tx.feeStructure.upsert({
      where: { schoolId_scopeKey: { schoolId, scopeKey } },
      create: {
        schoolId,
        scope: scope as FeeScope,
        scopeKey,
        classId: scope === "CLASS" ? classId : null,
        studentId: scope === "STUDENT" ? studentId : null,
      },
      update: {
        classId: scope === "CLASS" ? classId : null,
        studentId: scope === "STUDENT" ? studentId : null,
      },
    });

    for (const item of editableItems) {
      await tx.feeStructureItem.upsert({
        where: {
          feeStructureId_feeParticularId: {
            feeStructureId: saved.id,
            feeParticularId: item.feeParticularId,
          },
        },
        create: {
          feeStructureId: saved.id,
          feeParticularId: item.feeParticularId,
          amount: item.amount,
        },
        update: { amount: item.amount },
      });
    }

    return saved;
  });

  void structure;
  req.query.scope = scope;
  if (classId) req.query.classId = String(classId);
  else delete req.query.classId;
  if (studentId) req.query.studentId = String(studentId);
  else delete req.query.studentId;

  return getFeeStructure(req, res);
};

export const getFeeParticulars = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const particulars = await getParticulars(schoolId);
  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: particulars,
  });
};
