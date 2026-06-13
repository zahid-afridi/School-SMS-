import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { HttpStatus } from "../constants/httpStatus.js";
import { ApiMessages } from "../constants/messages.js";
import { AppError } from "../utils/AppError.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      ...(err.errors?.length ? { errors: err.errors } : {}),
    });
  }

  console.error(err);

  return res.status(HttpStatus.INTERNAL_SERVER).json({
    success: false,
    statusCode: HttpStatus.INTERNAL_SERVER,
    message: ApiMessages.INTERNAL_ERROR,
    ...(env.nodeEnv === "development" && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
}
