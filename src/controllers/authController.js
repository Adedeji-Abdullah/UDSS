import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "school-secret",
    { expiresIn: "7d" }
  );
};

const nextStudentId = async () => {
  const lastStudent = await User.find({ role: "student" }).sort({ createdAt: -1 }).limit(1);
  const current = Number(lastStudent[0]?.schoolId?.replace(/\D/g, "") || 0);
  return `QID${String(current + 1).padStart(3, "0")}`;
};

const nextTeacherId = async () => {
  const lastTeacher = await User.find({ role: "teacher" }).sort({ createdAt: -1 }).limit(1);
  const current = Number(lastTeacher[0]?.staffId?.replace(/\D/g, "") || 0);
  return `TID${String(current + 1).padStart(3, "0")}`;
};

export const bootstrapPrincipal = async (req, res) => {
  const { name, email, password } = req.body;
  const bootstrapSecret = req.headers["x-bootstrap-secret"] || "";

  if (bootstrapSecret !== (process.env.BOOTSTRAP_SECRET || "udss-bootstrap")) {
    return res.status(403).json({ message: "Bootstrap secret is invalid." });
  }

  const existingPrincipal = await User.findOne({ role: "principal" });
  if (existingPrincipal) {
    return res.status(409).json({ message: "A principal account already exists." });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  const principal = await User.create({
    name,
    email,
    password,
    role: "principal",
  });

  return res.status(201).json({
    message: "Principal bootstrap successful.",
    token: generateToken(principal),
    user: {
      _id: principal._id,
      name: principal.name,
      email: principal.email,
      role: principal.role,
    },
  });
};

export const login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Identifier and password are required." });
  }

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { schoolId: identifier.toUpperCase() }, { staffId: identifier.toUpperCase() }],
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  return res.json({
    token: generateToken(user),
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId || null,
      staffId: user.staffId || null,
    },
  });
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export { nextStudentId, nextTeacherId };
