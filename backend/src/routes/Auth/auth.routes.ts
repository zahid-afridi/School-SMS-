import { Router } from "express";
import { login, registerSchool } from "../../controllers/Auth/auth.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const AuthRouter = Router();

/** SaaS: school owner signs up (school + admin account) */
AuthRouter.post("/register-school", asyncHandler(registerSchool));

/** Login for all roles */
AuthRouter.post("/login", asyncHandler(login));

export default AuthRouter;
