import { Router } from "express";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createClass,
  createSection,
  deleteClass,
  deleteSection,
  getAllClasses,
  getAllSections,
  getClassById,
  getSectionById,
  updateClass,
  updateSection,
} from "../../controllers/classes/classes.controller.js";

const ClassesRouter = Router();

ClassesRouter.post("/create-class", auth("ADMIN"), asyncHandler(createClass));
ClassesRouter.get("/get-all-classes", auth("ADMIN"), asyncHandler(getAllClasses));
ClassesRouter.get("/get-class/:id", auth("ADMIN"), asyncHandler(getClassById));
ClassesRouter.put("/update-class/:id", auth("ADMIN"), asyncHandler(updateClass));
ClassesRouter.delete("/delete-class/:id", auth("ADMIN"), asyncHandler(deleteClass));


// Section Routes
ClassesRouter.post("/create-section", auth("ADMIN"), asyncHandler(createSection));
ClassesRouter.get("/get-all-sections", auth("ADMIN"), asyncHandler(getAllSections));
ClassesRouter.get("/get-section/:id", auth("ADMIN"), asyncHandler(getSectionById));
ClassesRouter.put("/update-section/:id", auth("ADMIN"), asyncHandler(updateSection));
ClassesRouter.delete("/delete-section/:id", auth("ADMIN"), asyncHandler(deleteSection));
export default ClassesRouter;
