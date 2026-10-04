import mongoose from "mongoose";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import Subject from "../models/Subject.js";
import TeacherProfile from "../models/TeacherProfile.js";
import StudentProfile from "../models/StudentProfile.js";
import ResultSubmission from "../models/ResultSubmission.js";
import { nextStudentId, nextTeacherId } from "./authController.js";

const normalizeIdList = (value) => {
  if (!value) return [];
  const rawList = Array.isArray(value) ? value : [value];
  return rawList
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const validateObjectIdList = (value, label) => {
  const ids = normalizeIdList(value);
  const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));

  if (invalidIds.length) {
    return {
      valid: false,
      message: `Invalid ${label} value(s): ${invalidIds.join(", ")}. Use a valid Mongo ObjectId.`,
      ids: [],
    };
  }

  return { valid: true, message: "", ids };
};

export const getPrincipalDashboard = async (req, res) => {
  const [totalStudents, totalTeachers, totalClasses, totalSubjects, pendingResults] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "teacher" }),
    Classroom.countDocuments(),
    Subject.countDocuments(),
    ResultSubmission.countDocuments({ status: "PENDING" }),
  ]);

  res.json({
    stats: {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      pendingResults,
    },
  });
};

export const createTeacher = async (req, res) => {
  const { name, email, password, subjectIds = [], classIds = [], isFormTeacher = false, formTeacherClass } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  const subjectValidation = validateObjectIdList(subjectIds, "subject");
  if (!subjectValidation.valid) {
    return res.status(400).json({ message: subjectValidation.message });
  }

  const classValidation = validateObjectIdList(classIds, "class");
  if (!classValidation.valid) {
    return res.status(400).json({ message: classValidation.message });
  }

  if (formTeacherClass && !mongoose.Types.ObjectId.isValid(String(formTeacherClass))) {
    return res.status(400).json({
      message: "Invalid form teacher class ID. Use the class ObjectId returned by the system.",
    });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ message: "A teacher with this email already exists." });
  }

  const teacherId = await nextTeacherId();
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password,
    role: "teacher",
    staffId: teacherId,
  });

  const teacherProfile = await TeacherProfile.create({
    user: user._id,
    teacherId,
    subjects: subjectValidation.ids,
    classes: classValidation.ids,
    isFormTeacher,
    formTeacherClass: formTeacherClass || null,
  });

  if (formTeacherClass) {
    await Classroom.findByIdAndUpdate(formTeacherClass, { formTeacher: teacherProfile._id });
  }

  return res.status(201).json({
    message: "Teacher created successfully.",
    user,
    teacherProfile,
  });
};

export const createStudent = async (req, res) => {
  const { name, email, password, classId, subjectIds = [] } = req.body;

  if (!name || !email || !password || !classId) {
    return res.status(400).json({ message: "Name, email, password and class are required." });
  }

  if (!mongoose.Types.ObjectId.isValid(String(classId))) {
    return res.status(400).json({
      message: "Invalid class ID. Use the Mongo ObjectId returned when you create the class, not a short numeric value like 111.",
    });
  }

  const subjectValidation = validateObjectIdList(subjectIds, "subject");
  if (!subjectValidation.valid) {
    return res.status(400).json({ message: subjectValidation.message });
  }

  const classroom = await Classroom.findById(classId);
  if (!classroom) {
    return res.status(404).json({ message: "Classroom not found." });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ message: "A student with this email already exists." });
  }

  const studentId = await nextStudentId();
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password,
    role: "student",
    schoolId: studentId,
  });

  const studentProfile = await StudentProfile.create({
    user: user._id,
    studentId,
    class: classId,
    registeredSubjects: subjectValidation.ids,
  });

  await Classroom.findByIdAndUpdate(classId, {
    $addToSet: { students: studentProfile._id },
  });

  return res.status(201).json({
    message: "Student created successfully.",
    user,
    studentProfile,
  });
};

export const createClassroom = async (req, res) => {
  const { name, subjectIds = [] } = req.body;
  const trimmedName = String(name || "").trim();

  if (!trimmedName) {
    return res.status(400).json({ message: "Classroom name is required." });
  }

  const duplicate = await Classroom.findOne({ name: trimmedName });
  if (duplicate) {
    return res.status(409).json({ message: "A classroom with this name already exists." });
  }

  const subjectValidation = validateObjectIdList(subjectIds, "subject");
  if (!subjectValidation.valid) {
    return res.status(400).json({ message: subjectValidation.message });
  }

  const classroom = await Classroom.create({ name: trimmedName, subjects: subjectValidation.ids });

  return res.status(201).json({ message: "Classroom created successfully.", classroom });
};

export const createSubject = async (req, res) => {
  const { name, code, isElective = false, classIds = [] } = req.body;
  const trimmedName = String(name || "").trim();
  const trimmedCode = code ? String(code).trim().toUpperCase() : "";

  if (!trimmedName) {
    return res.status(400).json({ message: "Subject name is required." });
  }

  const duplicate = await Subject.findOne({ name: trimmedName });
  if (duplicate) {
    return res.status(409).json({ message: "A subject with this name already exists." });
  }

  const classValidation = validateObjectIdList(classIds, "class");
  if (!classValidation.valid) {
    return res.status(400).json({ message: classValidation.message });
  }

  const subject = await Subject.create({
    name: trimmedName,
    code: trimmedCode || undefined,
    isElective,
    classIds: classValidation.ids,
  });

  if (classValidation.ids.length) {
    await Classroom.updateMany({ _id: { $in: classValidation.ids } }, { $addToSet: { subjects: subject._id } });
  }

  return res.status(201).json({ message: "Subject created successfully.", subject });
};

export const addSubjectsToClass = async (req, res) => {
  const { classId, subjectIds = [] } = req.body;

  if (!classId || !subjectIds.length) {
    return res.status(400).json({ message: "Class and at least one subject are required." });
  }

  if (!mongoose.Types.ObjectId.isValid(String(classId))) {
    return res.status(400).json({ message: "Invalid class ID." });
  }

  const subjectValidation = validateObjectIdList(subjectIds, "subject");
  if (!subjectValidation.valid) {
    return res.status(400).json({ message: subjectValidation.message });
  }

  const classroom = await Classroom.findById(classId);
  if (!classroom) {
    return res.status(404).json({ message: "Classroom not found." });
  }

  classroom.subjects = [...new Set([...classroom.subjects.map((id) => id.toString()), ...subjectValidation.ids])];
  await classroom.save();

  await Subject.updateMany(
    { _id: { $in: subjectValidation.ids } },
    { $addToSet: { classIds: classId } }
  );

  return res.json({ message: "Subjects assigned to class successfully.", classroom });
};

export const assignTeacherToSubject = async (req, res) => {
  const { teacherId, subjectId, classIds = [] } = req.body;

  if (!teacherId || !subjectId) {
    return res.status(400).json({ message: "Teacher and subject are required." });
  }

  if (!mongoose.Types.ObjectId.isValid(String(teacherId))) {
    return res.status(400).json({ message: "Invalid teacher ID." });
  }

  const subjectValidation = validateObjectIdList(subjectId, "subject");
  if (!subjectValidation.valid) {
    return res.status(400).json({ message: subjectValidation.message });
  }

  const classValidation = validateObjectIdList(classIds, "class");
  if (!classValidation.valid) {
    return res.status(400).json({ message: classValidation.message });
  }

  const teacherProfile = await TeacherProfile.findOne({ user: teacherId });
  if (!teacherProfile) {
    return res.status(404).json({ message: "Teacher profile not found." });
  }

  const subject = await Subject.findById(subjectValidation.ids[0]);
  if (!subject) {
    return res.status(404).json({ message: "Subject not found." });
  }

  teacherProfile.subjects = [...new Set([...teacherProfile.subjects.map((id) => id.toString()), subjectValidation.ids[0]])];
  teacherProfile.classes = [...new Set([...teacherProfile.classes.map((id) => id.toString()), ...classValidation.ids])];
  await teacherProfile.save();

  subject.teacherAssignments = [...new Set([...subject.teacherAssignments.map((id) => id.toString()), teacherProfile._id.toString()])];
  subject.classIds = [...new Set([...subject.classIds.map((id) => id.toString()), ...classValidation.ids])];
  await subject.save();

  return res.json({ message: "Teacher assigned to subject successfully.", teacherProfile, subject });
};

export const assignFormTeacher = async (req, res) => {
  const { teacherId, classId } = req.body;

  if (!teacherId || !classId) {
    return res.status(400).json({ message: "Teacher and class are required." });
  }

  if (!mongoose.Types.ObjectId.isValid(String(teacherId))) {
    return res.status(400).json({ message: "Invalid teacher ID." });
  }

  if (!mongoose.Types.ObjectId.isValid(String(classId))) {
    return res.status(400).json({ message: "Invalid class ID." });
  }

  const teacherProfile = await TeacherProfile.findOne({ user: teacherId });
  if (!teacherProfile) {
    return res.status(404).json({ message: "Teacher profile not found." });
  }

  const classroom = await Classroom.findById(classId);
  if (!classroom) {
    return res.status(404).json({ message: "Classroom not found." });
  }

  teacherProfile.isFormTeacher = true;
  teacherProfile.formTeacherClass = classroom._id;
  teacherProfile.classes = [...new Set([...teacherProfile.classes.map((id) => id.toString()), classId])];
  await teacherProfile.save();

  classroom.formTeacher = teacherProfile._id;
  await classroom.save();

  return res.json({ message: "Form teacher assigned successfully.", teacherProfile, classroom });
};
