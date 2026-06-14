import { Router } from "express";
import {
  removeFile,
  removeFiles,
  uploadManyFiles,
  uploadManyImages,
  uploadSingleFile,
  uploadSingleImage,
} from "../../controllers/upload/upload.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const UploadRouter = Router();

UploadRouter.post(
  "/image",
  uploadSingleImage,
  asyncHandler(uploadSingleImage)
);

UploadRouter.post(
  "/images",
  auth("ADMIN", "TEACHER"),
  uploadManyImages,
  asyncHandler(uploadManyImages)
);

UploadRouter.post(
  "/file",
  auth("ADMIN", "TEACHER"),
  uploadSingleFile,
  asyncHandler(uploadSingleFile)
);

UploadRouter.post(
  "/files",
  auth("ADMIN", "TEACHER"),
  uploadManyFiles,
  asyncHandler(uploadManyFiles)
);

UploadRouter.delete("/file", auth("ADMIN", "TEACHER"), asyncHandler(removeFile));
UploadRouter.delete("/files", auth("ADMIN", "TEACHER"), asyncHandler(removeFiles));

export default UploadRouter;
