import { ApiMessages } from "../constants/messages.js";
import { HttpStatus } from "../constants/httpStatus.js";
import { AppError } from "./AppError.js";

export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): void {
  const errors = fields
    .filter((field) => {
      const value = body[field];
      if (value === undefined || value === null) return true;
      if (typeof value === "string" && value.trim() === "") return true;
      return false;
    })
    .map((field) => `${field} is required`);

  if (errors.length > 0) {
    throw new AppError(ApiMessages.ALL_FIELDS_REQUIRED, HttpStatus.BAD_REQUEST, errors);
  }
}

export function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  message: string
): asserts value is T {
  if (!allowed.includes(value as T)) {
    throw new AppError(message, HttpStatus.BAD_REQUEST);
  }
}
