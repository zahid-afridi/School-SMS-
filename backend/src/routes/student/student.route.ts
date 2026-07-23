import { Router } from "express";
import {
  AddStudent,
  deleteStudent,
  getAllStudents,
  getStudentById,
  getStudentsByFamily,
  linkParents,
  promoteStudent,
  searchParents,
  unlinkParent,
  updateEnrollment,
  updateStudent,
  updateStudentStatus,
  withdrawStudent,
} from "../../controllers/student/student.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { generateUserCredentials } from "../../middleware/credentials.middleware.js";
import { parseStudentPhoto } from "../../middleware/upload.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const StudentRouter = Router();

StudentRouter.post(
  "/add",
  auth("ADMIN"),
  parseStudentPhoto,
  generateUserCredentials("student"),
  asyncHandler(AddStudent)
);

StudentRouter.get("/get-all", auth("ADMIN"), asyncHandler(getAllStudents));
StudentRouter.get("/get/:id", auth("ADMIN"), asyncHandler(getStudentById));
StudentRouter.get(
  "/family/:familyCode",
  auth("ADMIN"),
  asyncHandler(getStudentsByFamily)
);
StudentRouter.get("/parents/search", auth("ADMIN"), asyncHandler(searchParents));

StudentRouter.put(
  "/update/:id",
  auth("ADMIN"),
  parseStudentPhoto,
  asyncHandler(updateStudent)
);
StudentRouter.patch(
  "/status/:id",
  auth("ADMIN"),
  asyncHandler(updateStudentStatus)
);
StudentRouter.put(
  "/enrollment/:id",
  auth("ADMIN"),
  asyncHandler(updateEnrollment)
);
StudentRouter.post(
  "/promote/:id",
  auth("ADMIN"),
  asyncHandler(promoteStudent)
);
StudentRouter.post(
  "/withdraw/:id",
  auth("ADMIN"),
  asyncHandler(withdrawStudent)
);

StudentRouter.post(
  "/link-parents/:id",
  auth("ADMIN"),
  asyncHandler(linkParents)
);
StudentRouter.delete(
  "/unlink-parent/:id/:parentId",
  auth("ADMIN"),
  asyncHandler(unlinkParent)
);

StudentRouter.delete("/delete/:id", auth("ADMIN"), asyncHandler(deleteStudent));

export default StudentRouter;
