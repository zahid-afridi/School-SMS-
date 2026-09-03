import { Router } from "express";
import {
  getAccountsReport,
  getFeeCollectionReport,
  getParentsInfoReport,
  getStaffAttendanceSheet,
  getStaffMonthlyAttendanceReport,
  getStudentProgressReport,
  getStudentsInfoReport,
  getStudentsMonthlyAttendanceReport,
  saveStaffAttendanceSheet,
} from "../../controllers/reports/reports.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const ReportsRouter = Router();

ReportsRouter.get(
  "/students-info",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getStudentsInfoReport)
);
ReportsRouter.get(
  "/parents-info",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getParentsInfoReport)
);
ReportsRouter.get(
  "/students-attendance-monthly",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getStudentsMonthlyAttendanceReport)
);
ReportsRouter.get(
  "/staff-attendance-monthly",
  auth("ADMIN"),
  asyncHandler(getStaffMonthlyAttendanceReport)
);
ReportsRouter.get(
  "/staff-attendance/sheet",
  auth("ADMIN"),
  asyncHandler(getStaffAttendanceSheet)
);
ReportsRouter.put(
  "/staff-attendance/sheet",
  auth("ADMIN"),
  asyncHandler(saveStaffAttendanceSheet)
);
ReportsRouter.get(
  "/fee-collection",
  auth("ADMIN"),
  asyncHandler(getFeeCollectionReport)
);
ReportsRouter.get(
  "/accounts",
  auth("ADMIN"),
  asyncHandler(getAccountsReport)
);
ReportsRouter.get(
  "/student-progress/:studentId",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getStudentProgressReport)
);

export default ReportsRouter;
