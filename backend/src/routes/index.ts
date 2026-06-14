import { Router } from "express";
import AuthRouter from "./Auth/auth.routes.js";
import SchoolRouter from "./school/school.route.js";
import UploadRouter from "./upload/upload.route.js";
import EmployeeRouter from "./employee/employe.route.js";
import ClassesRouter from "./classes/classes.route.js";
const router = Router();

router.use("/auth", AuthRouter);
router.use("/school", SchoolRouter);
router.use("/upload", UploadRouter);
router.use("/employee", EmployeeRouter);
router.use("/classes", ClassesRouter);
export default router;