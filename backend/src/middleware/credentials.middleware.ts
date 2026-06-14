import { randomBytes } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiMessages } from "../constants/messages.js";
import { HttpStatus } from "../constants/httpStatus.js";
import { getPrisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";

export interface GeneratedCredentials {
  username: string;
  email: string;
  password: string;
}

type CredentialType = "employee" | "student";

const USERNAME_PREFIX: Record<CredentialType, string> = {
  employee: "emp",
  student: "stu",
};

function generateRandomPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

async function generateUniqueUsername(
  schoolId: string,
  type: CredentialType
): Promise<string> {
  const prefix = USERNAME_PREFIX[type];

  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = randomBytes(3).toString("hex");
    const username = `${prefix}_${schoolId.slice(0, 8)}_${suffix}`;

    const existing = await getPrisma().user.findUnique({ where: { username } });
    if (!existing) return username;
  }

  throw new AppError("Could not generate unique username", HttpStatus.INTERNAL_SERVER);
}

async function resolveUniqueEmail(
  username: string,
  preferredEmail?: string
): Promise<string> {
  if (preferredEmail?.trim()) {
    const email = preferredEmail.trim().toLowerCase();
    const existing = await getPrisma().user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(ApiMessages.USER_EXISTS, HttpStatus.CONFLICT);
    }
    return email;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const email =
      attempt === 0
        ? `${username}@school.local`
        : `${username}_${attempt}@school.local`;

    const existing = await getPrisma().user.findUnique({ where: { email } });
    if (!existing) return email;
  }

  throw new AppError("Could not generate unique email", HttpStatus.INTERNAL_SERVER);
}

/**
 * Generates unique username + password before employee/student register.
 * Sets req.generatedCredentials and merges into req.body.
 *
 * @example
 * router.post("/register", auth("ADMIN"), generateUserCredentials("employee"), handler)
 * router.post("/register", auth("ADMIN"), generateUserCredentials("student"), handler)
 */
export function generateUserCredentials(type: CredentialType): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user?.schoolId) {
        throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
      }

      const username = await generateUniqueUsername(req.user.schoolId, type);
      const password = generateRandomPassword();
      const email = await resolveUniqueEmail(username, req.body.email);

      const credentials: GeneratedCredentials = { username, email, password };

      req.generatedCredentials = credentials;
      req.body.username = username;
      req.body.email = email;
      req.body.password = password;

      next();
    } catch (error) {
      next(error);
    }
  };
}

declare global {
  namespace Express {
    interface Request {
      generatedCredentials?: GeneratedCredentials;
    }
  }
}
