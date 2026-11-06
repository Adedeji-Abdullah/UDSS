import express from "express";
import { getTeacherDashboard, getTeacherResults, getAssignedStudents, uploadResults } from "../controllers/teacherController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher"));

router.get("/dashboard", getTeacherDashboard);
router.get("/students", getAssignedStudents);
router.get("/results", getTeacherResults);
router.post("/results", uploadResults);

export default router;
