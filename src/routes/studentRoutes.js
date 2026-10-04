import express from "express";
import {
  getStudentLeaderboard,
  getStudentProfile,
  getStudentResultById,
  getStudentResults,
  getStudentResultSheet,
} from "../controllers/studentController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);
router.use(authorize("student"));

router.get("/profile", getStudentProfile);
router.get("/results", getStudentResults);
router.get("/leaderboard", getStudentLeaderboard);
router.get("/results/:studentId", getStudentResultById);
router.get("/result-sheet", getStudentResultSheet);

export default router;
