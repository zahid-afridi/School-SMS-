import { Router } from "express";
import { login, register } from "../../controllers/Auth/auth.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const AuthRouter = Router();

/** Register ADMIN (default) or SUPER_ADMIN — email + password only */
AuthRouter.post("/register", asyncHandler(register));

/** Login with email or username (same value for admin) */
AuthRouter.post("/login", asyncHandler(login));

export default AuthRouter;
