import { Router } from "express";
import AuthRouter from "./Auth/auth.routes.js";
import SchoolRouter from "./school/school.route.js";
const router = Router();

router.use("/auth", AuthRouter);
router.use("/school", SchoolRouter);

export default router;