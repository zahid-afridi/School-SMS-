import { Router } from "express";
import {
  addExamSchedule,
  createExam,
  createSubject,
  deleteExam,
  deleteExamSchedule,
  deleteSubject,
  getAwardList,
  getDateSheet,
  getExamById,
  getExamSchedule,
  getMarksSheet,
  getResultCard,
  getResultSheet,
  listExams,
  listSubjects,
  saveMarks,
  updateExam,
  updateExamSchedule,
  updateSubject,
} from "../../controllers/exams/exam.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const ExamRouter = Router();

ExamRouter.get("/subjects", auth("ADMIN", "TEACHER"), asyncHandler(listSubjects));
ExamRouter.post("/subjects", auth("ADMIN"), asyncHandler(createSubject));
ExamRouter.put("/subjects/:id", auth("ADMIN"), asyncHandler(updateSubject));
ExamRouter.delete("/subjects/:id", auth("ADMIN"), asyncHandler(deleteSubject));

ExamRouter.get("/", auth("ADMIN", "TEACHER"), asyncHandler(listExams));
ExamRouter.post("/", auth("ADMIN"), asyncHandler(createExam));
ExamRouter.get("/:id", auth("ADMIN", "TEACHER"), asyncHandler(getExamById));
ExamRouter.put("/:id", auth("ADMIN"), asyncHandler(updateExam));
ExamRouter.delete("/:id", auth("ADMIN"), asyncHandler(deleteExam));

ExamRouter.get(
  "/:examId/schedule",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getExamSchedule)
);
ExamRouter.post("/:examId/schedule", auth("ADMIN"), asyncHandler(addExamSchedule));
ExamRouter.put(
  "/schedule/:id",
  auth("ADMIN"),
  asyncHandler(updateExamSchedule)
);
ExamRouter.delete(
  "/schedule/:id",
  auth("ADMIN"),
  asyncHandler(deleteExamSchedule)
);

ExamRouter.get(
  "/:examId/marks-sheet",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getMarksSheet)
);
ExamRouter.put(
  "/:examId/marks",
  auth("ADMIN", "TEACHER"),
  asyncHandler(saveMarks)
);

ExamRouter.get(
  "/:examId/result-card/:studentId",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getResultCard)
);
ExamRouter.get(
  "/:examId/result-sheet",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getResultSheet)
);
ExamRouter.get(
  "/:examId/date-sheet",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getDateSheet)
);
ExamRouter.get(
  "/:examId/award-list",
  auth("ADMIN", "TEACHER"),
  asyncHandler(getAwardList)
);

export default ExamRouter;
