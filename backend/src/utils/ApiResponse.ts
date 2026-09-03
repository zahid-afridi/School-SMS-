import type { Response } from "express";
import { HttpStatus, type HttpStatusCode } from "../constants/httpStatus.js";

interface SuccessOptions<T> {
  message?: string;
  data?: T;
  statusCode?: HttpStatusCode;
}

export class ApiResponse {
  static success<T>(res: Response, options: SuccessOptions<T> = {}) {
    const { message = "Success", data = null, statusCode = HttpStatus.OK } = options;

    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
    });
  }
}
