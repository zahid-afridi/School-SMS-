import { Router } from "express";
import {
  getStudentAttendanceReport,
  getStudentAttendanceSheet,
  listStudentAttendanceRecords,
  saveStudentAttendanceSheet,
} from "../../controllers/attendance/attendance.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const AttendanceRouter = Router();

AttendanceRouter.get(
  "/students/sheet",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getStudentAttendanceSheet)
);
AttendanceRouter.put(
  "/students/sheet",
  auth("ADMIN", "TEACHER"),
  asyncHandler(saveStudentAttendanceSheet)
);
AttendanceRouter.get(
  "/students/records",
  auth("ADMIN", "TEACHER"),
  asyncHandler(listStudentAttendanceRecords)
);
AttendanceRouter.get(
  "/students/report",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getStudentAttendanceReport)
);

export default AttendanceRouter;
