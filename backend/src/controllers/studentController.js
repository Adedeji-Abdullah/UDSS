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

export const getStudentLeaderboard = async (req, res) => {
  const approvedResults = await ResultSubmission.find({ status: "APPROVED" })
    .populate("student class")
    .sort({ score: -1, createdAt: -1 });

  const leaderboardMap = new Map();

  approvedResults.forEach((result) => {
    const studentId = result.student?._id ? result.student._id.toString() : result.student?.toString();
    const studentName = result.student?.name || "Student";
    const className = result.class?.name || "N/A";

    if (!studentId) return;

    if (!leaderboardMap.has(studentId)) {
      leaderboardMap.set(studentId, {
        studentId: result.studentId,
        name: studentName,
        className,
        total: 0,
        count: 0,
      });
    }

    const studentEntry = leaderboardMap.get(studentId);
    studentEntry.total += Number(result.score || 0);
    studentEntry.count += 1;
  });

  const leaderboard = Array.from(leaderboardMap.values())
    .map((entry) => ({
      ...entry,
      average: Number(((entry.total / entry.count) || 0).toFixed(2)),
    }))
    .sort((a, b) => b.average - a.average || b.total - a.total);

  const currentRank = leaderboard.findIndex((entry) => entry.studentId === req.user.schoolId);

  return res.json({
    leaderboard: leaderboard.slice(0, 10),
    currentStudent: leaderboard[currentRank] || null,
    currentRank: currentRank >= 0 ? currentRank + 1 : null,
  });
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
