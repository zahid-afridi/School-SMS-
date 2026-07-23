import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { deleteFilesByUrls, uploadImage } from "../../lib/storage.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { hashPassword } from "../../utils/Password.js";
import { validateEnum, validateRequired } from "../../utils/validate.js";

const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
type Gender = (typeof GENDERS)[number];

const PARENT_TYPES = ["FATHER", "MOTHER", "GUARDIAN", "OTHER"] as const;
type ParentType = (typeof PARENT_TYPES)[number];

const PERSON_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
type PersonStatus = (typeof PERSON_STATUSES)[number];

interface ParentInput {
  name: string;
  type: ParentType;
  nationalId?: string;
  mobileNo?: string;
  whatsappNo?: string;
  email?: string;
  education?: string;
  occupation?: string;
  profession?: string;
  workplace?: string;
  income?: number | string;
  address?: string;
  isPrimaryGuardian?: boolean | string;
  isEmergencyContact?: boolean | string;
  canPickup?: boolean | string;
  notes?: string;
}

const studentDetailInclude = {
  parents: {
    include: {
      parent: true,
    },
  },
  enrollments: {
    include: {
      class: { select: { id: true, className: true, montlyFee: true } },
      section: { select: { id: true, sectionName: true } },
    },
    orderBy: { enrolledAt: "desc" as const },
  },
  user: {
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  },
};

function parseDate(value: unknown, field: string): Date {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${field}`, HttpStatus.BAD_REQUEST);
  }
  return date;
}

function parseOptionalDate(value: unknown, field = "date"): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseDate(value, field);
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseBoolean(value);
}

function parseParents(value: unknown): ParentInput[] {
  if (value === undefined || value === null || value === "") return [];

  let parents: unknown = value;
  if (typeof value === "string") {
    try {
      parents = JSON.parse(value);
    } catch {
      throw new AppError("Invalid parents JSON", HttpStatus.BAD_REQUEST);
    }
  }

  if (!Array.isArray(parents)) {
    throw new AppError("Parents must be an array", HttpStatus.BAD_REQUEST);
  }

  return parents as ParentInput[];
}

function parseParentIds(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];

  let parentIds: unknown = value;
  if (typeof value === "string") {
    try {
      parentIds = JSON.parse(value);
    } catch {
      throw new AppError("Invalid parentIds JSON", HttpStatus.BAD_REQUEST);
    }
  }

  if (
    !Array.isArray(parentIds) ||
    parentIds.some((id) => typeof id !== "string" || id.trim() === "")
  ) {
    throw new AppError("parentIds must be an array of IDs", HttpStatus.BAD_REQUEST);
  }

  return [...new Set(parentIds as string[])];
}

function parseNonNegativeNumber(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new AppError(`Invalid ${field}`, HttpStatus.BAD_REQUEST);
  }
  return number;
}

function parseFeeDiscount(value: unknown): number {
  const parsed = parseNonNegativeNumber(value ?? 0, "feeDiscount");
  if (parsed > 100) {
    throw new AppError("feeDiscount cannot exceed 100", HttpStatus.BAD_REQUEST);
  }
  return parsed;
}

function requireSchoolId(req: Request): string {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }
  return schoolId;
}

async function findStudentInSchool(id: string, schoolId: string) {
  const student = await getPrisma().student.findFirst({
    where: { id, schoolId },
    include: studentDetailInclude,
  });

  if (!student) {
    throw new AppError(ApiMessages.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return student;
}

async function assertClassInSchool(classId: string, schoolId: string) {
  const selectedClass = await getPrisma().class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true },
  });
  if (!selectedClass) {
    throw new AppError("Class not found in this school", HttpStatus.NOT_FOUND);
  }
}

async function assertSectionInClass(sectionId: string, classId: string) {
  const selectedSection = await getPrisma().section.findFirst({
    where: { id: sectionId, classId },
    select: { id: true },
  });
  if (!selectedSection) {
    throw new AppError("Section not found in selected class", HttpStatus.NOT_FOUND);
  }
}

function validateParentInputs(parents: ParentInput[]) {
  for (const parent of parents) {
    validateRequired(parent as unknown as Record<string, unknown>, ["name", "type"]);
    validateEnum(parent.type, PARENT_TYPES, "Invalid parent type");
    if (parent.income !== undefined && parent.income !== "") {
      parseNonNegativeNumber(parent.income, "parent income");
    }
  }
}

function parentCreateData(parentInput: ParentInput, schoolId: string) {
  return {
    name: parentInput.name,
    type: parentInput.type,
    nationalId: parentInput.nationalId ?? null,
    mobileNo: parentInput.mobileNo ?? null,
    whatsappNo: parentInput.whatsappNo ?? null,
    email: parentInput.email ?? null,
    education: parentInput.education ?? null,
    occupation: parentInput.occupation ?? null,
    profession: parentInput.profession ?? null,
    workplace: parentInput.workplace ?? null,
    income:
      parentInput.income === undefined || parentInput.income === ""
        ? null
        : Number(parentInput.income),
    address: parentInput.address ?? null,
    schoolId,
  };
}

function parentLinkData(parentInput: ParentInput) {
  return {
    isPrimaryGuardian: parseBoolean(parentInput.isPrimaryGuardian),
    isEmergencyContact: parseBoolean(parentInput.isEmergencyContact),
    canPickup:
      parentInput.canPickup === undefined || parentInput.canPickup === ""
        ? true
        : parseBoolean(parentInput.canPickup),
    notes: parentInput.notes ?? null,
  };
}

function studentProfileData(body: Record<string, unknown>) {
  const {
    registrationNo,
    name,
    admissionDate,
    contactPhone,
    email,
    dateOfBirth,
    birthFormId,
    gender,
    caste,
    identificationMark,
    bloodGroup,
    disease,
    previousSchool,
    previousClass,
    previousRollNo,
    additionalNote,
    isOrphan,
    isOsc,
    religion,
    nationality,
    motherTongue,
    familyCode,
    address,
    city,
    province,
    postalCode,
    emergencyPhone,
  } = body;

  if (gender) {
    validateEnum(gender as string, GENDERS, "Invalid gender");
  }

  return {
    registrationNo: registrationNo as string,
    name: name as string,
    admissionDate: parseDate(admissionDate, "admissionDate"),
    contactPhone: (contactPhone as string | undefined) ?? null,
    email: (email as string | undefined) ?? null,
    dateOfBirth: parseOptionalDate(dateOfBirth, "dateOfBirth") ?? null,
    birthFormId: (birthFormId as string | undefined) ?? null,
    gender: gender ? (gender as Gender) : null,
    caste: (caste as string | undefined) ?? null,
    identificationMark: (identificationMark as string | undefined) ?? null,
    bloodGroup: (bloodGroup as string | undefined) ?? null,
    disease: (disease as string | undefined) ?? null,
    previousSchool: (previousSchool as string | undefined) ?? null,
    previousClass: (previousClass as string | undefined) ?? null,
    previousRollNo: (previousRollNo as string | undefined) ?? null,
    additionalNote: (additionalNote as string | undefined) ?? null,
    isOrphan: parseBoolean(isOrphan),
    isOsc: parseBoolean(isOsc),
    religion: (religion as string | undefined) ?? null,
    nationality: (nationality as string | undefined) ?? null,
    motherTongue: (motherTongue as string | undefined) ?? null,
    familyCode: (familyCode as string | undefined) ?? null,
    address: (address as string | undefined) ?? null,
    city: (city as string | undefined) ?? null,
    province: (province as string | undefined) ?? null,
    postalCode: (postalCode as string | undefined) ?? null,
    emergencyPhone: (emergencyPhone as string | undefined) ?? null,
  };
}

export const AddStudent = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);

  const credentials = req.generatedCredentials;
  if (!credentials) {
    throw new AppError(ApiMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER);
  }

  const {
    classId,
    sectionId,
    academicYear,
    rollNo,
    feeDiscount = 0,
  } = req.body;

  validateRequired(req.body, [
    "registrationNo",
    "name",
    "admissionDate",
    "classId",
    "academicYear",
  ]);

  const profile = studentProfileData(req.body);
  const parsedFeeDiscount = parseFeeDiscount(feeDiscount);

  const useExistingParents = parseBoolean(req.body.existing);
  const parents = parseParents(req.body.parents);
  const parentIds = parseParentIds(req.body.parentIds);

  if (useExistingParents && parentIds.length === 0) {
    throw new AppError(
      "At least one parentId is required when existing is true",
      HttpStatus.BAD_REQUEST
    );
  }

  if (!useExistingParents && parents.length === 0) {
    throw new AppError(
      "At least one parent is required when existing is false",
      HttpStatus.BAD_REQUEST
    );
  }

  if (useExistingParents && parents.length > 0) {
    throw new AppError(
      "Send parentIds instead of parents when existing is true",
      HttpStatus.BAD_REQUEST
    );
  }

  if (!useExistingParents && parentIds.length > 0) {
    throw new AppError(
      "Send parents instead of parentIds when existing is false",
      HttpStatus.BAD_REQUEST
    );
  }

  validateParentInputs(parents);

  const existingParents = useExistingParents
    ? await getPrisma().parent.findMany({
        where: { id: { in: parentIds }, schoolId },
      })
    : [];

  if (useExistingParents && existingParents.length !== parentIds.length) {
    throw new AppError(
      "One or more parents were not found in this school",
      HttpStatus.NOT_FOUND
    );
  }

  await assertClassInSchool(classId, schoolId);
  if (sectionId) {
    await assertSectionInClass(sectionId, classId);
  }

  const duplicate = await getPrisma().student.findUnique({
    where: {
      schoolId_registrationNo: { schoolId, registrationNo: profile.registrationNo },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new AppError("Registration number already exists", HttpStatus.CONFLICT);
  }

  let photoUrl: string | undefined;
  if (req.file) {
    const saved = await uploadImage(req.file, schoolId);
    photoUrl = saved.url;
  }

  const hashedPassword = await hashPassword(credentials.password);
  const primaryParentId =
    typeof req.body.primaryParentId === "string" ? req.body.primaryParentId : null;

  const result = await getPrisma().$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        ...profile,
        photoUrl: photoUrl ?? null,
        schoolId,
      },
    });

    const enrollment = await tx.studentEnrollment.create({
      data: {
        studentId: student.id,
        classId,
        sectionId: sectionId || null,
        academicYear,
        rollNo: rollNo ?? null,
        feeDiscount: parsedFeeDiscount,
      },
    });

    const linkedParents = [...existingParents];

    for (const existingParent of existingParents) {
      await tx.studentParent.create({
        data: {
          studentId: student.id,
          parentId: existingParent.id,
          isPrimaryGuardian: primaryParentId
            ? existingParent.id === primaryParentId
            : false,
        },
      });
    }

    for (const parentInput of useExistingParents ? [] : parents) {
      const parent = await tx.parent.create({
        data: parentCreateData(parentInput, schoolId),
      });

      await tx.studentParent.create({
        data: {
          studentId: student.id,
          parentId: parent.id,
          ...parentLinkData(parentInput),
        },
      });
      linkedParents.push(parent);
    }

    const user = await tx.user.create({
      data: {
        email: credentials.email,
        username: credentials.username,
        password: hashedPassword,
        role: "STUDENT",
        schoolId,
        studentId: student.id,
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

    return { student, enrollment, parents: linkedParents, user };
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.STUDENT_REGISTERED,
    data: {
      ...result,
      credentials: {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
      },
    },
  });
};

export const getAllStudents = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);

  const {
    search,
    status,
    gender,
    classId,
    sectionId,
    academicYear,
    familyCode,
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  if (status) {
    validateEnum(String(status), PERSON_STATUSES, "Invalid status");
  }
  if (gender) {
    validateEnum(String(gender), GENDERS, "Invalid gender");
  }

  const where = {
    schoolId,
    ...(status ? { status: status as PersonStatus } : {}),
    ...(gender ? { gender: gender as Gender } : {}),
    ...(familyCode ? { familyCode: String(familyCode) } : {}),
    ...(typeof search === "string" && search.trim()
      ? {
          OR: [
            { name: { contains: search.trim() } },
            { registrationNo: { contains: search.trim() } },
            { contactPhone: { contains: search.trim() } },
            { familyCode: { contains: search.trim() } },
          ],
        }
      : {}),
    ...(classId || sectionId || academicYear
      ? {
          enrollments: {
            some: {
              isCurrent: true,
              ...(classId ? { classId: String(classId) } : {}),
              ...(sectionId ? { sectionId: String(sectionId) } : {}),
              ...(academicYear ? { academicYear: String(academicYear) } : {}),
            },
          },
        }
      : {}),
  };

  const [students, total] = await Promise.all([
    getPrisma().student.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        registrationNo: true,
        name: true,
        photoUrl: true,
        admissionDate: true,
        contactPhone: true,
        gender: true,
        familyCode: true,
        status: true,
        createdAt: true,
        enrollments: {
          where: { isCurrent: true },
          take: 1,
          select: {
            id: true,
            academicYear: true,
            rollNo: true,
            feeDiscount: true,
            status: true,
            class: { select: { id: true, className: true } },
            section: { select: { id: true, sectionName: true } },
          },
        },
        parents: {
          where: { isPrimaryGuardian: true },
          take: 1,
          select: {
            parent: {
              select: { id: true, name: true, type: true, mobileNo: true },
            },
          },
        },
      },
    }),
    getPrisma().student.count({ where }),
  ]);

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: {
      students,
      pagination: (() => {
        const totalPages = Math.ceil(total / limitNum) || 1;
        return {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          nextPage: pageNum < totalPages,
          previousPage: pageNum > 1,
        };
      })(),
    },
  });
};

export const getStudentById = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const student = await findStudentInSchool(id, schoolId);

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: student,
  });
};

export const updateStudent = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const existing = await findStudentInSchool(id, schoolId);
  const body = req.body ?? {};

  validateRequired(body, ["registrationNo", "name", "admissionDate"]);
  const profile = studentProfileData(body);
  profile.registrationNo = String(profile.registrationNo).trim();
  profile.name = String(profile.name).trim();

  // Allow keeping the same registrationNo; only block if another student has it
  const duplicate = await getPrisma().student.findFirst({
    where: {
      schoolId,
      registrationNo: profile.registrationNo,
      NOT: { id },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new AppError("Registration number already exists", HttpStatus.CONFLICT);
  }

  let photoUrl: string | null | undefined;
  let oldPhotoToDelete: string | null = null;

  if (req.file) {
    const saved = await uploadImage(req.file, schoolId);
    photoUrl = saved.url;
    if (existing.photoUrl && existing.photoUrl !== saved.url) {
      oldPhotoToDelete = existing.photoUrl;
    }
  } else if (parseBoolean(body.removePhoto)) {
    photoUrl = null;
    if (existing.photoUrl) {
      oldPhotoToDelete = existing.photoUrl;
    }
  }

  const updated = await getPrisma().student.update({
    where: { id },
    data: {
      ...profile,
      ...(photoUrl !== undefined && { photoUrl }),
    },
    include: studentDetailInclude,
  });

  if (oldPhotoToDelete) {
    await deleteFilesByUrls([oldPhotoToDelete]);
  }

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.STUDENT_UPDATED,
    data: updated,
  });
};

export const updateStudentStatus = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  await findStudentInSchool(id, schoolId);

  const { status } = req.body;
  validateRequired(req.body, ["status"]);
  validateEnum(status, PERSON_STATUSES, "Invalid status");

  const updated = await getPrisma().$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id },
      data: { status: status as PersonStatus },
      include: studentDetailInclude,
    });

    if (student.user) {
      await tx.user.update({
        where: { id: student.user.id },
        data: { isActive: status === "ACTIVE" },
      });
    }

    return student;
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.STUDENT_UPDATED,
    data: updated,
  });
};

export const deleteStudent = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  const existing = await findStudentInSchool(id, schoolId);

  if (existing.photoUrl) {
    await deleteFilesByUrls([existing.photoUrl]);
  }

  await getPrisma().$transaction(async (tx) => {
    if (existing.user) {
      await tx.user.delete({ where: { id: existing.user.id } });
    }
    await tx.student.delete({ where: { id } });
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.STUDENT_DELETED,
  });
};

export const updateEnrollment = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  await findStudentInSchool(id, schoolId);

  const {
    enrollmentId,
    sectionId,
    rollNo,
    feeDiscount,
    remarks,
  } = req.body;

  validateRequired(req.body, ["enrollmentId"]);

  const enrollment = await getPrisma().studentEnrollment.findFirst({
    where: { id: enrollmentId, studentId: id },
  });
  if (!enrollment) {
    throw new AppError("Enrollment not found", HttpStatus.NOT_FOUND);
  }

  if (sectionId) {
    await assertSectionInClass(sectionId, enrollment.classId);
  }

  const updated = await getPrisma().studentEnrollment.update({
    where: { id: enrollmentId },
    data: {
      ...(sectionId !== undefined && { sectionId: sectionId || null }),
      ...(rollNo !== undefined && { rollNo: rollNo || null }),
      ...(feeDiscount !== undefined && { feeDiscount: parseFeeDiscount(feeDiscount) }),
      ...(remarks !== undefined && { remarks: remarks || null }),
    },
    include: {
      class: { select: { id: true, className: true, montlyFee: true } },
      section: { select: { id: true, sectionName: true } },
    },
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.ENROLLMENT_UPDATED,
    data: updated,
  });
};

export const promoteStudent = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  await findStudentInSchool(id, schoolId);

  const {
    classId,
    sectionId,
    academicYear,
    rollNo,
    feeDiscount = 0,
    remarks,
  } = req.body;

  validateRequired(req.body, ["classId", "academicYear"]);
  await assertClassInSchool(classId, schoolId);
  if (sectionId) {
    await assertSectionInClass(sectionId, classId);
  }

  const current = await getPrisma().studentEnrollment.findFirst({
    where: { studentId: id, isCurrent: true },
  });
  if (!current) {
    throw new AppError("No current enrollment found", HttpStatus.BAD_REQUEST);
  }

  const duplicate = await getPrisma().studentEnrollment.findUnique({
    where: {
      studentId_academicYear_classId: {
        studentId: id,
        academicYear,
        classId,
      },
    },
  });
  if (duplicate) {
    throw new AppError(
      "Student already enrolled in this class for the academic year",
      HttpStatus.CONFLICT
    );
  }

  const result = await getPrisma().$transaction(async (tx) => {
    await tx.studentEnrollment.update({
      where: { id: current.id },
      data: {
        isCurrent: false,
        status: "PROMOTED",
        promotedAt: new Date(),
      },
    });

    const enrollment = await tx.studentEnrollment.create({
      data: {
        studentId: id,
        classId,
        sectionId: sectionId || null,
        academicYear,
        rollNo: rollNo ?? null,
        feeDiscount: parseFeeDiscount(feeDiscount),
        remarks: remarks ?? null,
        promotedFromId: current.id,
        isCurrent: true,
        status: "ENROLLED",
      },
      include: {
        class: { select: { id: true, className: true, montlyFee: true } },
        section: { select: { id: true, sectionName: true } },
      },
    });

    return enrollment;
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.STUDENT_PROMOTED,
    data: result,
  });
};

export const withdrawStudent = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  await findStudentInSchool(id, schoolId);

  const { leavingReason, remarks } = req.body ?? {};
  const leavingDate = parseOptionalDate(req.body?.leavingDate, "leavingDate") ?? new Date();

  const current = await getPrisma().studentEnrollment.findFirst({
    where: { studentId: id, isCurrent: true },
  });
  if (!current) {
    throw new AppError("No current enrollment found", HttpStatus.BAD_REQUEST);
  }

  const result = await getPrisma().$transaction(async (tx) => {
    const enrollment = await tx.studentEnrollment.update({
      where: { id: current.id },
      data: {
        status: "WITHDRAWN",
        isCurrent: false,
        withdrawnAt: leavingDate,
        withdrawnReason: leavingReason ?? null,
        remarks: remarks ?? current.remarks,
      },
    });

    const student = await tx.student.update({
      where: { id },
      data: {
        status: "INACTIVE",
        leavingDate,
        leavingReason: leavingReason ?? null,
      },
      include: studentDetailInclude,
    });

    if (student.user) {
      await tx.user.update({
        where: { id: student.user.id },
        data: { isActive: false },
      });
    }

    return { student, enrollment };
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.STUDENT_WITHDRAWN,
    data: result,
  });
};

export const linkParents = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id } = req.params as { id: string };
  await findStudentInSchool(id, schoolId);

  const useExisting = parseBoolean(req.body.existing ?? true);
  const parents = parseParents(req.body.parents);
  const parentIds = parseParentIds(req.body.parentIds);

  if (useExisting) {
    if (parentIds.length === 0) {
      throw new AppError("parentIds are required", HttpStatus.BAD_REQUEST);
    }

    const found = await getPrisma().parent.findMany({
      where: { id: { in: parentIds }, schoolId },
    });
    if (found.length !== parentIds.length) {
      throw new AppError(
        "One or more parents were not found in this school",
        HttpStatus.NOT_FOUND
      );
    }

    const primaryParentId =
      typeof req.body.primaryParentId === "string" ? req.body.primaryParentId : null;

    await getPrisma().$transaction(async (tx) => {
      for (const parent of found) {
        await tx.studentParent.upsert({
          where: {
            studentId_parentId: { studentId: id, parentId: parent.id },
          },
          create: {
            studentId: id,
            parentId: parent.id,
            isPrimaryGuardian: primaryParentId
              ? parent.id === primaryParentId
              : false,
          },
          update: {
            ...(primaryParentId !== null && {
              isPrimaryGuardian: parent.id === primaryParentId,
            }),
          },
        });
      }
    });
  } else {
    if (parents.length === 0) {
      throw new AppError("parents are required", HttpStatus.BAD_REQUEST);
    }
    validateParentInputs(parents);

    await getPrisma().$transaction(async (tx) => {
      for (const parentInput of parents) {
        const parent = await tx.parent.create({
          data: parentCreateData(parentInput, schoolId),
        });
        await tx.studentParent.create({
          data: {
            studentId: id,
            parentId: parent.id,
            ...parentLinkData(parentInput),
          },
        });
      }
    });
  }

  const student = await findStudentInSchool(id, schoolId);

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.PARENT_LINKED,
    data: student,
  });
};

export const unlinkParent = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { id, parentId } = req.params as { id: string; parentId: string };
  await findStudentInSchool(id, schoolId);

  const link = await getPrisma().studentParent.findUnique({
    where: { studentId_parentId: { studentId: id, parentId } },
  });
  if (!link) {
    throw new AppError("Parent is not linked to this student", HttpStatus.NOT_FOUND);
  }

  const remaining = await getPrisma().studentParent.count({
    where: { studentId: id },
  });
  if (remaining <= 1) {
    throw new AppError(
      "Student must have at least one parent/guardian",
      HttpStatus.BAD_REQUEST
    );
  }

  await getPrisma().studentParent.delete({
    where: { studentId_parentId: { studentId: id, parentId } },
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.PARENT_UNLINKED,
  });
};

export const searchParents = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { search, nationalId, mobileNo, limit = "20" } = req.query;
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));

  const parents = await getPrisma().parent.findMany({
    where: {
      schoolId,
      ...(nationalId ? { nationalId: String(nationalId) } : {}),
      ...(mobileNo ? { mobileNo: String(mobileNo) } : {}),
      ...(typeof search === "string" && search.trim()
        ? {
            OR: [
              { name: { contains: search.trim() } },
              { nationalId: { contains: search.trim() } },
              { mobileNo: { contains: search.trim() } },
            ],
          }
        : {}),
    },
    take: limitNum,
    orderBy: { name: "asc" },
    include: {
      students: {
        select: {
          isPrimaryGuardian: true,
          student: {
            select: {
              id: true,
              name: true,
              registrationNo: true,
              familyCode: true,
            },
          },
        },
      },
    },
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: parents,
  });
};

export const getStudentsByFamily = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const { familyCode } = req.params as { familyCode: string };

  if (!familyCode?.trim()) {
    throw new AppError("familyCode is required", HttpStatus.BAD_REQUEST);
  }

  const students = await getPrisma().student.findMany({
    where: { schoolId, familyCode },
    orderBy: { name: "asc" },
    include: {
      enrollments: {
        where: { isCurrent: true },
        take: 1,
        include: {
          class: { select: { id: true, className: true } },
          section: { select: { id: true, sectionName: true } },
        },
      },
      parents: {
        include: { parent: true },
      },
    },
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.OK,
    message: ApiMessages.SUCCESS,
    data: students,
  });
};
