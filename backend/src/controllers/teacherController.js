import Classroom from "../models/Classroom.js";
import TeacherProfile from "../models/TeacherProfile.js";
import StudentProfile from "../models/StudentProfile.js";
import ResultSubmission from "../models/ResultSubmission.js";

export const getTeacherDashboard = async (req, res) => {
  const profile = await TeacherProfile.findOne({ user: req.user._id }).populate("subjects classes formTeacherClass");

  if (!profile) {
    return res.status(404).json({ message: "Teacher profile not found." });
  }

  const classIds = profile.classes.map((item) => item._id);
  const studentCount = await StudentProfile.countDocuments({ class: { $in: classIds } });
  const pendingResults = await ResultSubmission.countDocuments({ teacher: profile._id, status: "PENDING" });
  const approvedResults = await ResultSubmission.countDocuments({ teacher: profile._id, status: "APPROVED" });

  return res.json({
    profile,
    summary: {
      studentCount,
      pendingResults,
      approvedResults,
    },
  });
};

export const getAssignedStudents = async (req, res) => {
  const profile = await TeacherProfile.findOne({ user: req.user._id }).populate("classes");
  if (!profile) {
    return res.status(404).json({ message: "Teacher profile not found." });
  }

  const students = await StudentProfile.find({ class: { $in: profile.classes.map((item) => item._id) } }).populate("user class");
  return res.json({ students });
};

export const uploadResults = async (req, res) => {
  const { classId, subjectId, academicSession, term, entries } = req.body;

  if (!classId || !subjectId || !academicSession || !term || !Array.isArray(entries) || !entries.length) {
    return res.status(400).json({ message: "Class, subject, session, term and entries are required." });
  }

  const teacherProfile = await TeacherProfile.findOne({ user: req.user._id }).populate("subjects classes");
  if (!teacherProfile) {
    return res.status(404).json({ message: "Teacher profile not found." });
  }

  const isAssignedToSubject = teacherProfile.subjects.some((subject) => subject._id.toString() === subjectId);
  const isAssignedToClass = teacherProfile.classes.some((classItem) => classItem._id.toString() === classId);

  if (!isAssignedToSubject || !isAssignedToClass) {
    return res.status(403).json({ message: "You are not assigned to this subject and class." });
  }

  const classroom = await Classroom.findById(classId);
  if (!classroom || !classroom.subjects.map((id) => id.toString()).includes(subjectId)) {
    return res.status(403).json({ message: "This subject is not offered in the selected class." });
  }

  const createdResults = [];

  for (const entry of entries) {
    const studentProfile = await StudentProfile.findOne({ studentId: entry.studentId }).populate("class user");
    if (!studentProfile) {
      return res.status(404).json({ message: `Student with ID ${entry.studentId} was not found.` });
    }

    if (studentProfile.class._id.toString() !== classId) {
      return res.status(400).json({ message: `Student ${entry.studentId} is not enrolled in the selected class.` });
    }

    const result = await ResultSubmission.create({
      student: studentProfile.user._id,
      studentId: studentProfile.studentId,
      class: classId,
      subject: subjectId,
      teacher: teacherProfile._id,
      score: Number(entry.score),
      academicSession,
      term,
      status: "PENDING",
    });

    createdResults.push(result);
  }

  return res.status(201).json({ message: "Results uploaded successfully.", results: createdResults });
};

export const getTeacherResults = async (req, res) => {
  const teacherProfile = await TeacherProfile.findOne({ user: req.user._id });
  if (!teacherProfile) {
    return res.status(404).json({ message: "Teacher profile not found." });
  }

  const results = await ResultSubmission.find({ teacher: teacherProfile._id })
    .populate("student subject class formTeacher")
    .sort({ createdAt: -1 });

  return res.json({ results });
};
