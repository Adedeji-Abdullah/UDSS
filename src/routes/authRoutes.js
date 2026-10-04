import express from "express";
import { bootstrapPrincipal, getMe, login } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/bootstrap-principal", bootstrapPrincipal);
router.post("/login", login);
router.get("/me", protect, getMe);

export default router;
