import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { deleteFilesByUrls, uploadImage } from "../../lib/storage.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { hashPassword } from "../../utils/Password.js";
import { validateEnum, validateRequired } from "../../utils/validate.js";

const EMPLOYEE_DESIGNATIONS = [
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "MANAGEMENT",
  "MANAGEMENT_STAFF",
  "TEACHER",
  "ACCOUNTANT",
  "LIBRARIAN",
  "SUPPORT_STAFF",
  "OTHER",
] as const;

type EmployeeDesignation = (typeof EMPLOYEE_DESIGNATIONS)[number];

const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
type Gender = (typeof GENDERS)[number];

function designationToUserRole(designation: EmployeeDesignation) {
  if (designation === "TEACHER") return "TEACHER" as const;
  if (["PRINCIPAL", "VICE_PRINCIPAL", "MANAGEMENT"].includes(designation)) {
    return "ADMIN" as const;
  }
  return "STAFF" as const;
}

function parseDate(value: unknown, field: string): Date {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${field}`, HttpStatus.BAD_REQUEST);
  }
  return date;
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseDate(value, "date");
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

async function findEmployeeInSchool(id: string, schoolId: string) {
  const employee = await getPrisma().employee.findFirst({
    where: { id, schoolId },
    include: { user: { select: { id: true, role: true } } },
  });

  if (!employee) {
    throw new AppError(ApiMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return employee;
}

async function generateEmployeeCode(schoolId: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await getPrisma().employee.count({ where: { schoolId } });
    const code = `EMP-${String(count + 1 + attempt).padStart(4, "0")}`;
    const existing = await getPrisma().employee.findUnique({
      where: { schoolId_employeeCode: { schoolId, employeeCode: code } },
    });
    if (!existing) return code;
  }
  throw new AppError("Could not generate employee code", HttpStatus.INTERNAL_SERVER);
}

export const registerEmployee = async (req: Request, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }

  const credentials = req.generatedCredentials;
  if (!credentials) {
    throw new AppError(ApiMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER);
  }

  const {
    name,
    designation,
    joiningDate,
    salary,
    phone,
    fatherOrHusbandName,
    gender,
    experience,
    nationalId,
    religion,
    education,
    bloodGroup,
    dateOfBirth,
    address,
  } = req.body;

  validateRequired(req.body, ["name", "designation", "joiningDate", "salary"]);
  validateEnum(designation, EMPLOYEE_DESIGNATIONS, ApiMessages.INVALID_ROLE);

  if (gender) {
    validateEnum(gender, GENDERS, "Invalid gender");
  }

  const parsedSalary = Number(salary);
  if (Number.isNaN(parsedSalary) || parsedSalary < 0) {
    throw new AppError("Invalid salary", HttpStatus.BAD_REQUEST);
  }

  let photoUrl: string | undefined;
  if (req.file) {
    const saved = await uploadImage(req.file, schoolId);
    photoUrl = saved.url;
  }

  const hashedPassword = await hashPassword(credentials.password);
  const employeeCode = await generateEmployeeCode(schoolId);
  const userRole = designationToUserRole(designation as EmployeeDesignation);

  const result = await getPrisma().$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        employeeCode,
        name,
        designation: designation as EmployeeDesignation,
        joiningDate: parseDate(joiningDate, "joiningDate"),
        salary: parsedSalary,
        phone: phone ?? null,
        photoUrl: photoUrl ?? null,
        fatherOrHusbandName: fatherOrHusbandName ?? null,
        gender: gender ? (gender as Gender) : null,
        experience: experience ?? null,
        nationalId: nationalId ?? null,
        religion: religion ?? null,
        education: education ?? null,
        bloodGroup: bloodGroup ?? null,
        dateOfBirth: parseOptionalDate(dateOfBirth) ?? null,
        address: address ?? null,
        schoolId,
      },
    });

    const user = await tx.user.create({
      data: {
        email: credentials.email,
        username: credentials.username,
        password: hashedPassword,
        role: userRole,
        schoolId,
        employeeId: employee.id,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        schoolId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return { employee, user };
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.EMPLOYEE_REGISTERED,
    data: {
      employee: result.employee,
      user: result.user,
      credentials: {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
      },
    },
  });
};

export const getAllEmployees = async (req: Request, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }

  const { designation, search } = req.query;
  if (designation) {
    validateEnum(String(designation), EMPLOYEE_DESIGNATIONS, "Invalid designation");
  }

  const employees = await getPrisma().employee.findMany({
    where: {
      schoolId,
      ...(designation
        ? { designation: designation as EmployeeDesignation }
        : {}),
      ...(typeof search === "string" && search.trim()
        ? {
            OR: [
              { name: { contains: search.trim() } },
              { employeeCode: { contains: search.trim() } },
              { phone: { contains: search.trim() } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      designation: true,
      joiningDate: true,
      salary: true,
      phone: true,
      photoUrl: true,
      gender: true,
      experience: true,
      education: true,
      status: true,
      createdAt: true,
    },
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: employees,
  });
};

export const getEmployeeById = async (req: Request, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }

  const { id } = req.params as { id: string };
  const employee = await findEmployeeInSchool(id, schoolId);

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: employee,
  });
};

export const updateEmployee = async (req: Request, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }

  const { id } = req.params as { id: string };
  const existing = await findEmployeeInSchool(id, schoolId);
  const body = req.body ?? {};

  const {
    name,
    designation,
    joiningDate,
    salary,
    phone,
    fatherOrHusbandName,
    gender,
    experience,
    nationalId,
    religion,
    education,
    bloodGroup,
    dateOfBirth,
    address,
    removePhoto,
  } = body;

  validateRequired(body, ["name", "designation", "joiningDate", "salary"]);
  validateEnum(designation, EMPLOYEE_DESIGNATIONS, ApiMessages.INVALID_ROLE);

  if (gender) {
    validateEnum(gender, GENDERS, "Invalid gender");
  }

  const parsedSalary = Number(salary);
  if (Number.isNaN(parsedSalary) || parsedSalary < 0) {
    throw new AppError("Invalid salary", HttpStatus.BAD_REQUEST);
  }

  let photoUrl: string | null | undefined;
  let oldPhotoToDelete: string | null = null;

  if (req.file) {
    const saved = await uploadImage(req.file, schoolId);
    photoUrl = saved.url;
    if (existing.photoUrl && existing.photoUrl !== saved.url) {
      oldPhotoToDelete = existing.photoUrl;
    }
  } else if (parseBoolean(removePhoto)) {
    photoUrl = null;
    if (existing.photoUrl) {
      oldPhotoToDelete = existing.photoUrl;
    }
  }

  const userRole = designationToUserRole(designation as EmployeeDesignation);

  const updatedEmployee = await getPrisma().$transaction(async (tx) => {
    const employee = await tx.employee.update({
      where: { id },
      data: {
        name,
        designation: designation as EmployeeDesignation,
        joiningDate: parseDate(joiningDate, "joiningDate"),
        salary: parsedSalary,
        phone: phone ?? null,
        ...(photoUrl !== undefined && { photoUrl }),
        fatherOrHusbandName: fatherOrHusbandName ?? null,
        gender: gender ? (gender as Gender) : null,
        experience: experience ?? null,
        nationalId: nationalId ?? null,
        religion: religion ?? null,
        education: education ?? null,
        bloodGroup: bloodGroup ?? null,
        dateOfBirth: parseOptionalDate(dateOfBirth) ?? null,
        address: address ?? null,
      },
    });

    if (existing.user && existing.user.role !== userRole) {
      await tx.user.update({
        where: { id: existing.user.id },
        data: { role: userRole },
      });
    }

    return employee;
  });

  if (oldPhotoToDelete) {
    await deleteFilesByUrls([oldPhotoToDelete]);
  }

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.UPDATED,
    data: updatedEmployee,
  });
};

export const deleteEmployee = async (req: Request, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }

  const { id } = req.params as { id: string };
  const existing = await findEmployeeInSchool(id, schoolId);

  if (existing.photoUrl) {
    await deleteFilesByUrls([existing.photoUrl]);
  }

  await getPrisma().$transaction(async (tx) => {
    if (existing.user) {
      await tx.user.delete({ where: { id: existing.user.id } });
    }
    await tx.employee.delete({ where: { id } });
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.DELETED,
  });
};