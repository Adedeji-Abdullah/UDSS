import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import principalRoutes from "./src/routes/principalRoutes.js";
import teacherRoutes from "./src/routes/teacherRoutes.js";
import formTeacherRoutes from "./src/routes/formTeacherRoutes.js";
import studentRoutes from "./src/routes/studentRoutes.js";

const indexFilePath = fileURLToPath(new URL("./index.html", import.meta.url));

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static("./"));

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "School portal API is running." });
});

app.get("/", (req, res) => {
  res.sendFile(indexFilePath);
});

app.use("/api/auth", authRoutes);
app.use("/api/principal", principalRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/form-teacher", formTeacherRoutes);
app.use("/api/student", studentRoutes);

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(indexFilePath);
});

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
