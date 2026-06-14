import { Router } from "express";
import AuthRouter from "./Auth/auth.routes.js";
import SchoolRouter from "./school/school.route.js";
import UploadRouter from "./upload/upload.route.js";
import EmployeeRouter from "./employee/employe.route.js";
const router = Router();

router.use("/auth", AuthRouter);
router.use("/school", SchoolRouter);
router.use("/upload", UploadRouter);
router.use("/employee", EmployeeRouter);
export default router;