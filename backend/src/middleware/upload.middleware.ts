import path from "node:path";
import { randomUUID } from "node:crypto";
import multer, { type FileFilterCallback } from "multer";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env, isOfflineStorage } from "../config/env.js";
import { ApiMessages } from "../constants/messages.js";
import { HttpStatus } from "../constants/httpStatus.js";
import { getSchoolUploadPath } from "../lib/storage.js";
import { AppError } from "../utils/AppError.js";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const FILE_TYPES = [
  ...IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function multerOptions(allowedTypes: string[], folder: "images" | "files") {
  const storage = isOfflineStorage()
    ? multer.diskStorage({
        destination: (req, _file, cb) => {
          const schoolId = req.user?.schoolId ?? "public";
          cb(null, getSchoolUploadPath(schoolId, folder));
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
        },
      })
    : multer.memoryStorage();

  return {
    storage,
    limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new AppError(ApiMessages.INVALID_FILE_TYPE, HttpStatus.BAD_REQUEST));
      }
      cb(null, true);
    },
  };
}

const imageMulter = multer(multerOptions(IMAGE_TYPES, "images"));
const fileMulter = multer(multerOptions(FILE_TYPES, "files"));

/** Wrap multer so busboy errors reach the global error handler */
function wrapMulter(middleware: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  };
}

export const uploadSingleImage = wrapMulter(imageMulter.single("image"));
export const uploadManyImages = wrapMulter(imageMulter.array("images", 10));
export const uploadSingleFile = wrapMulter(fileMulter.single("file"));
export const uploadManyFiles = wrapMulter(fileMulter.array("files", 10));
