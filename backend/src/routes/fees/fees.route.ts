import { Router } from "express";
import {
  getFeeParticulars,
  getFeeStructure,
  saveFeeStructure,
} from "../../controllers/fees/fees.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const FeesRouter = Router();

FeesRouter.get(
  "/particulars",
  auth("ADMIN"),
  asyncHandler(getFeeParticulars)
);

FeesRouter.get(
  "/structure",
  auth("ADMIN"),
  asyncHandler(getFeeStructure)
);

FeesRouter.put(
  "/structure",
  auth("ADMIN"),
  asyncHandler(saveFeeStructure)
);

export default FeesRouter;
