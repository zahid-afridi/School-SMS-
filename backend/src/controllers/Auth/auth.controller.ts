import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { signToken } from "../../utils/jwt.js";
import { hashPassword, verifyPassword } from "../../utils/Password.js";
import { validateEnum, validateRequired } from "../../utils/validate.js";

const REGISTER_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
type RegisterRole = (typeof REGISTER_ROLES)[number];

const userSelect = {
  id: true,
  email: true,
  username: true,
  role: true,
  schoolId: true,
  isActive: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: {
      id: true,
      employeeCode: true,
      designation: true,
    },
  },
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

/** Register ADMIN or SUPER_ADMIN with email + password only. ADMIN gets a default school to update later. */
export const register = async (req: Request, res: Response) => {
  const { email, password, role = "ADMIN" } = req.body;

  validateRequired(req.body, ["email", "password"]);
  validateEnum(role, REGISTER_ROLES, ApiMessages.INVALID_ROLE);

  const existingUser = await getPrisma().user.findFirst({
    where: { OR: [{ email }, { username: email }] },
  });

  if (existingUser) {
    throw new AppError(ApiMessages.USER_EXISTS, HttpStatus.CONFLICT);
  }

  const hashedPassword = await hashPassword(password);

  const result = await getPrisma().$transaction(async (tx) => {
    if (role === "SUPER_ADMIN") {
      const user = await tx.user.create({
        data: {
          email,
          username: email,
          password: hashedPassword,
          role: "SUPER_ADMIN",
        },
        select: userSelect,
      });

      return { user, school: null };
    }

    const school = await tx.school.create({
      data: { name: "My School" },
    });

    const employee = await tx.employee.create({
      data: {
        employeeCode: `EMP-${Date.now()}`,
        designation: "PRINCIPAL",
        schoolId: school.id,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        username: email,
        password: hashedPassword,
        role: "ADMIN",
        schoolId: school.id,
        employeeId: employee.id,
      },
      select: userSelect,
    });

    return { user, school };
  });

  const token = signToken({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    schoolId: result.user.schoolId,
  });

  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.USER_REGISTERED,
    data: {
      user: result.user,
      school: result.school,
      token,
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  validateRequired(req.body, ["email", "password"]);

  const user = await getPrisma().user.findFirst({
    where: {
      OR: [{ email }, { username: email }],
    },
    include: {
      employee: {
        select: {
          id: true,
          designation: true,
          photoUrl: true,
        },
      },
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
