import type { Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus.js";
import { ApiMessages } from "../constants/messages.js";

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    statusCode: HttpStatus.NOT_FOUND,
    message: ApiMessages.NOT_FOUND,
  });
}
