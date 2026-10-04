import StudentProfile from "../models/StudentProfile.js";
import ResultSubmission from "../models/ResultSubmission.js";
import ResultSheet from "../models/ResultSheet.js";

export const getStudentProfile = async (req, res) => {
  const studentProfile = await StudentProfile.findOne({ user: req.user._id }).populate("class user");

  if (!studentProfile) {
    return res.status(404).json({ message: "Student profile not found." });
  }

  return res.json({ studentProfile });
};

export const getStudentResults = async (req, res) => {
  const results = await ResultSubmission.find({ student: req.user._id })
    .populate("subject teacher class")
    .sort({ createdAt: -1 });

  return res.json({ schoolId: req.user.schoolId, results });
};

export const getStudentResultById = async (req, res) => {
  const requestedId = req.params.studentId;

  if (requestedId !== req.user.schoolId) {
    return res.status(403).json({ message: "You are not allowed to access another student's result." });
  }

  const studentProfile = await StudentProfile.findOne({ studentId: requestedId }).populate("class user");
  if (!studentProfile) {
    return res.status(404).json({ message: "Student record not found." });
  }

  const results = await ResultSubmission.find({ student: studentProfile.user._id })
    .populate("subject class teacher")
    .sort({ createdAt: -1 });

  return res.json({ studentId: requestedId, results });
};

export const getStudentResultSheet = async (req, res) => {
  const { academicSession, term } = req.query;

  const sheet = await ResultSheet.findOne({
    student: req.user._id,
    academicSession,
    term,
  }).populate("class entries.subject");

  if (!sheet) {
    return res.status(404).json({ message: "Result sheet not found for the specified session and term." });
  }

  return res.json({ sheet });
};
