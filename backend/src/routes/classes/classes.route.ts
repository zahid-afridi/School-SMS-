import { Router } from "express";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createClass,
  deleteClass,
  getAllClasses,
  getClassById,
  updateClass,
} from "../../controllers/classes/classes.controller.js";

const ClassesRouter = Router();

ClassesRouter.post("/create-class", auth("ADMIN"), asyncHandler(createClass));
ClassesRouter.get("/get-all-classes", auth("ADMIN"), asyncHandler(getAllClasses));
ClassesRouter.get("/get-class/:id", auth("ADMIN"), asyncHandler(getClassById));
ClassesRouter.put("/update-class/:id", auth("ADMIN"), asyncHandler(updateClass));
ClassesRouter.delete("/delete-class/:id", auth("ADMIN"), asyncHandler(deleteClass));

export default ClassesRouter;
