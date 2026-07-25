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

/** Logged-in user profile */
export const getMe = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ApiMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user || !user.isActive) {
    throw new AppError(ApiMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: user,
  });
};

/** Update logged-in account email / username */
export const updateAccount = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ApiMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  const { email, username } = req.body ?? {};
  if (!email && !username) {
    throw new AppError(
      "Provide email and/or username to update",
      HttpStatus.BAD_REQUEST
    );
  }

  const nextEmail =
    typeof email === "string" ? email.trim().toLowerCase() : undefined;
  const nextUsername =
    typeof username === "string" ? username.trim() : undefined;

  if (nextEmail !== undefined && !nextEmail) {
    throw new AppError("Email cannot be empty", HttpStatus.BAD_REQUEST);
  }
  if (nextUsername !== undefined && !nextUsername) {
    throw new AppError("Username cannot be empty", HttpStatus.BAD_REQUEST);
  }

  if (nextEmail || nextUsername) {
    const conflict = await getPrisma().user.findFirst({
      where: {
        AND: [
          { NOT: { id: userId } },
          {
            OR: [
              ...(nextEmail ? [{ email: nextEmail }] : []),
              ...(nextUsername ? [{ username: nextUsername }] : []),
            ],
          },
        ],
      },
      select: { id: true },
    });

    if (conflict) {
      throw new AppError(ApiMessages.USER_EXISTS, HttpStatus.CONFLICT);
    }
  }

  const user = await getPrisma().user.update({
    where: { id: userId },
    data: {
      ...(nextEmail !== undefined && { email: nextEmail }),
      ...(nextUsername !== undefined && { username: nextUsername }),
    },
    select: userSelect,
  });

  return ApiResponse.success(res, {
    message: ApiMessages.PROFILE_UPDATED,
    data: user,
  });
};

/** Change logged-in user password */
export const changePassword = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ApiMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  const { currentPassword, newPassword } = req.body ?? {};
  validateRequired(req.body ?? {}, ["currentPassword", "newPassword"]);

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    throw new AppError(
      "New password must be at least 6 characters",
      HttpStatus.BAD_REQUEST
    );
  }

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, isActive: true },
  });

  if (!user?.isActive) {
    throw new AppError(ApiMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) {
    throw new AppError(
      ApiMessages.INVALID_CURRENT_PASSWORD,
      HttpStatus.UNAUTHORIZED
    );
  }

  const hashedPassword = await hashPassword(newPassword);
  await getPrisma().user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return ApiResponse.success(res, {
    message: ApiMessages.PASSWORD_CHANGED,
  });
};
