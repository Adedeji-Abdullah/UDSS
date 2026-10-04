import express from "express";
import { generateClassResultSheets, getFormTeacherDashboard, reviewResult } from "../controllers/formTeacherController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher"));

router.get("/dashboard", getFormTeacherDashboard);
router.post("/results/:resultId/review", reviewResult);
router.post("/generate-result-sheets", generateClassResultSheets);

export default router;
