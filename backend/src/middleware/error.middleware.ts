import type { NextFunction, Request, Response } from "express";
import multer from "multer";
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
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? ApiMessages.FILE_TOO_LARGE
        : err.message;

    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      statusCode: HttpStatus.BAD_REQUEST,
      message,
    });
  }

  if (err instanceof Error && err.message.includes("Unexpected end of form")) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      statusCode: HttpStatus.BAD_REQUEST,
      message: ApiMessages.INVALID_MULTIPART,
    });
  }

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
