import { Router } from "express";
import { getDashboardStats } from "../../controllers/dashboard/dashboard.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const DashboardRouter = Router();

DashboardRouter.get(
  "/stats",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getDashboardStats)
);

export default DashboardRouter;
