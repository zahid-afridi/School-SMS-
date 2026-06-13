import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { signToken } from "../../utils/jwt.js";
import { hashPassword, verifyPassword } from "../../utils/Password.js";
import { validateRequired } from "../../utils/validate.js";

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  schoolId: true,
  isActive: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  school: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
    },
  },
} as const;

/**
 * SaaS onboarding: creates a new school + first ADMIN user (school owner).
 * Teachers and students are NOT created here — school admin adds them later.
 */
export const registerSchool = async (req: Request, res: Response) => {
  const {
    schoolName,
    schoolEmail,
    schoolPhone,
    schoolAddress,
    schoolWebsite,
    firstName,
    lastName,
    email,
    password,
  } = req.body;

  validateRequired(req.body, [
    "schoolName",
    "firstName",
    "lastName",
    "email",
    "password",
  ]);

  const existingUser = await getPrisma().user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(ApiMessages.USER_EXISTS, HttpStatus.CONFLICT);
  }

  if (schoolEmail) {
    const existingSchool = await getPrisma().school.findUnique({
      where: { email: schoolEmail },
    });
    if (existingSchool) {
      throw new AppError(ApiMessages.SCHOOL_EXISTS, HttpStatus.CONFLICT);
    }
  }

  const hashedPassword = await hashPassword(password);

  const result = await getPrisma().$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        name: schoolName,
        email: schoolEmail ?? null,
        phone: schoolPhone ?? null,
        address: schoolAddress ?? null,
        website: schoolWebsite ?? null,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "ADMIN",
        schoolId: school.id,
      },
      select: userSelect,
    });

    return { school, user };
  });

  const token = signToken({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    schoolId: result.user.schoolId,
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.SCHOOL_REGISTERED,
    data: {
      school: result.school,
      user: result.user,
      token,
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  validateRequired(req.body, ["email", "password"]);

  const user = await getPrisma().user.findUnique({
    where: { email },
    include: {
      school: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(ApiMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
  }

  if (!user.isActive) {
    throw new AppError(ApiMessages.ACCOUNT_INACTIVE, HttpStatus.FORBIDDEN);
  }

  if (user.school && !user.school.isActive) {
    throw new AppError(ApiMessages.SCHOOL_INACTIVE, HttpStatus.FORBIDDEN);
  }

  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(ApiMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
  });

  const { password: _, ...safeUser } = user;

  return ApiResponse.success(res, {
    message: ApiMessages.LOGIN_SUCCESS,
    data: {
      user: safeUser,
      token,
    },
  });
};
