import { HttpStatus, type HttpStatusCode } from "../constants/httpStatus.js";

export class AppError extends Error {
  readonly statusCode: HttpStatusCode;
  readonly errors?: string[];
  readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatus.BAD_REQUEST,
    errors?: string[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
