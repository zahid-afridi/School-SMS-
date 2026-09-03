import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiMessages } from "../constants/messages.js";
import { HttpStatus } from "../constants/httpStatus.js";
import { getPrisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";

/**
 * Protect a route with JWT + role check.
 * @example router.put("/school", auth("ADMIN"), updateSchool)
 * @example router.post("/teachers", auth("ADMIN"), registerTeacher)
 */
export function auth(...roles: string[]): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        throw new AppError(ApiMessages.TOKEN_REQUIRED, HttpStatus.UNAUTHORIZED);
      }

      const token = header.split(" ")[1];
      const payload = verifyToken(token);

      const user = await getPrisma().user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, role: true, schoolId: true, isActive: true },
      });

      if (!user?.isActive) {
        throw new AppError(ApiMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
      }

      if (roles.length > 0 && !roles.includes(user.role)) {
        throw new AppError(ApiMessages.FORBIDDEN, HttpStatus.FORBIDDEN);
      }

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      };

      next();
    } catch (error) {
      if (error instanceof AppError) return next(error);
      next(new AppError(ApiMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED));
    }
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        schoolId: string | null;
      };
    }
  }
}
