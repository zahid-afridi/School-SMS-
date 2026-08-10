import { Router } from "express";
import {
  changePassword,
  getMe,
  login,
  register,
  updateAccount,
} from "../../controllers/Auth/auth.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const AuthRouter = Router();

/** Register ADMIN (default) or SUPER_ADMIN — email + password only */
AuthRouter.post("/register", asyncHandler(register));

/** Login with email or username (same value for admin) */
AuthRouter.post("/login", asyncHandler(login));

/** Logged-in account */
AuthRouter.get("/me", auth(), asyncHandler(getMe));
AuthRouter.put("/update-account", auth(), asyncHandler(updateAccount));
AuthRouter.put("/change-password", auth(), asyncHandler(changePassword));

export default AuthRouter;
