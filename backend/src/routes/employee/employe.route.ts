import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.middleware.js";
import { generateUserCredentials } from "../../middleware/credentials.middleware.js";
import { parseEmployeePhoto } from "../../middleware/upload.middleware.js";
import { registerEmployee, getAllEmployees, getEmployeeById, updateEmployee, deleteEmployee } from "../../controllers/employee/employee.controller.js";

const EmployeeRouter = Router();

EmployeeRouter.post(
  "/register-employee",
  auth("ADMIN"),
  parseEmployeePhoto,
  generateUserCredentials("employee"),
  asyncHandler(registerEmployee)
);
EmployeeRouter.get('/get-all-employees',auth("ADMIN"), asyncHandler(getAllEmployees));
EmployeeRouter.get('/get-employee/:id',auth("ADMIN"), asyncHandler(getEmployeeById));
EmployeeRouter.put(
  "/update-employee/:id",
  auth("ADMIN"),
  parseEmployeePhoto,
  asyncHandler(updateEmployee)
);
EmployeeRouter.delete('/delete-employee/:id',auth("ADMIN"), asyncHandler(deleteEmployee));


export default EmployeeRouter;