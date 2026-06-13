import { Router } from "express";
import AuthRouter from "./Auth/auth.routes.js";
const router = Router();

router.use("/auth", AuthRouter);

export default router;