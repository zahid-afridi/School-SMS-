import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import {
  deleteFile,
  deleteMultipleFiles,
  uploadFile,
  uploadImage,
  uploadMultipleFiles,
  uploadMultipleImages,
} from "../../lib/storage.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { validateRequired } from "../../utils/validate.js";

function getSchoolId(req: Request): string {
  return req.user?.schoolId ?? "public";
}

function getSingleFile(req: Request): Express.Multer.File {
  if (!req.file) {
    throw new AppError(ApiMessages.NO_FILE_UPLOADED, HttpStatus.BAD_REQUEST);
  }
  return req.file;
}

function getMultipleFiles(req: Request): Express.Multer.File[] {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) {
    throw new AppError(ApiMessages.NO_FILE_UPLOADED, HttpStatus.BAD_REQUEST);
  }
  return files;
}

export const uploadSingleImage = async (req: Request, res: Response) => {
  const saved = await uploadImage(getSingleFile(req), getSchoolId(req));
  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.UPLOAD_SUCCESS,
    data: saved,
  });
};

export const uploadManyImages = async (req: Request, res: Response) => {
  const saved = await uploadMultipleImages(getMultipleFiles(req), getSchoolId(req));
  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.UPLOAD_SUCCESS,
    data: saved,
  });
};

export const uploadSingleFile = async (req: Request, res: Response) => {
  const saved = await uploadFile(getSingleFile(req), getSchoolId(req));
  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.UPLOAD_SUCCESS,
    data: saved,
  });
};

export const uploadManyFiles = async (req: Request, res: Response) => {
  const saved = await uploadMultipleFiles(getMultipleFiles(req), getSchoolId(req));
  return ApiResponse.success(res, {
    statusCode: HttpStatus.CREATED,
    message: ApiMessages.UPLOAD_SUCCESS,
    data: saved,
  });
};

export const removeFile = async (req: Request, res: Response) => {
  const { storageKey } = req.body;
  validateRequired(req.body, ["storageKey"]);
  await deleteFile(storageKey);

  return ApiResponse.success(res, { message: ApiMessages.DELETE_SUCCESS });
};

export const removeFiles = async (req: Request, res: Response) => {
  const { storageKeys } = req.body;
  if (!Array.isArray(storageKeys) || storageKeys.length === 0) {
    throw new AppError(ApiMessages.ALL_FIELDS_REQUIRED, HttpStatus.BAD_REQUEST);
  }
  await deleteMultipleFiles(storageKeys);

  return ApiResponse.success(res, { message: ApiMessages.DELETE_SUCCESS });
};
