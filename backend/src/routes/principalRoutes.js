import express from "express";
import {
  addSubjectsToClass,
  assignFormTeacher,
  assignTeacherToSubject,
  createClassroom,
  createStudent,
  createSubject,
  createTeacher,
  getPrincipalDashboard,
} from "../controllers/principalController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal"));

router.get("/dashboard", getPrincipalDashboard);
router.post("/teachers", createTeacher);
router.post("/students", createStudent);
router.post("/classes", createClassroom);
router.post("/subjects", createSubject);
router.post("/classes/subjects", addSubjectsToClass);
router.post("/teacher-subjects", assignTeacherToSubject);
router.post("/form-teachers", assignFormTeacher);

export default router;
