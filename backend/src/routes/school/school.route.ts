import { Router } from "express";
import {
  deleteSchool,
  getMySchool,
  getSchoolById,
  getSchools,
  updateSchool,
} from "../../controllers/school/school.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const SchoolRouter = Router();

SchoolRouter.get("/my-school", auth("ADMIN","SUPER_ADMIN"), asyncHandler(getMySchool));
SchoolRouter.get("/get-schools", auth("ADMIN", "SUPER_ADMIN"), asyncHandler(getSchools));
SchoolRouter.get("/get-school/:id", auth("ADMIN", "SUPER_ADMIN"), asyncHandler(getSchoolById));
SchoolRouter.put("/update-school/:id", auth("ADMIN", "SUPER_ADMIN"), asyncHandler(updateSchool));
SchoolRouter.delete("/delete-school/:id", auth("ADMIN", "SUPER_ADMIN"), asyncHandler(deleteSchool));

export default SchoolRouter;
