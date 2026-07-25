import { Router } from "express";
import AuthRouter from "./Auth/auth.routes.js";
import SchoolRouter from "./school/school.route.js";
import UploadRouter from "./upload/upload.route.js";
import EmployeeRouter from "./employee/employe.route.js";
import ClassesRouter from "./classes/classes.route.js";
import StudentRouter from "./student/student.route.js";
import FeesRouter from "./fees/fees.route.js";
import AttendanceRouter from "./attendance/attendance.route.js";

const router = Router();

router.use("/auth", AuthRouter);
router.use("/school", SchoolRouter);
router.use("/upload", UploadRouter);
router.use("/employee", EmployeeRouter);
router.use("/classes", ClassesRouter);
router.use("/student", StudentRouter);
router.use("/fees", FeesRouter);
router.use("/attendance", AttendanceRouter);

export default router;