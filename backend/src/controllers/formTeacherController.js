import TeacherProfile from "../models/TeacherProfile.js";
import ResultSubmission from "../models/ResultSubmission.js";
import StudentProfile from "../models/StudentProfile.js";
import ResultSheet from "../models/ResultSheet.js";

export const getFormTeacherDashboard = async (req, res) => {
  const teacherProfile = await TeacherProfile.findOne({ user: req.user._id }).populate("formTeacherClass");

  if (!teacherProfile || !teacherProfile.formTeacherClass) {
    return res.status(403).json({ message: "You are not assigned as a form teacher for any class." });
  }

  const results = await ResultSubmission.find({ class: teacherProfile.formTeacherClass._id })
    .populate("student subject teacher formTeacher class");

  const students = await StudentProfile.find({ class: teacherProfile.formTeacherClass._id }).populate("user");

  return res.json({
    class: teacherProfile.formTeacherClass,
    students,
    results,
  });
};

export const reviewResult = async (req, res) => {
  const { status, comments } = req.body;
  const { resultId } = req.params;

  if (!status || !["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "Status must be either APPROVED or REJECTED." });
  }

  const teacherProfile = await TeacherProfile.findOne({ user: req.user._id });
  if (!teacherProfile) {
    return res.status(404).json({ message: "Teacher profile not found." });
  }

  const result = await ResultSubmission.findById(resultId).populate("class");
  if (!result) {
    return res.status(404).json({ message: "Result not found." });
  }

  const classId = result.class._id.toString();
  const assignedClassId = teacherProfile.formTeacherClass?.toString();

  if (!assignedClassId || classId !== assignedClassId) {
    return res.status(403).json({ message: "You are not authorized to review this class result." });
  }

  result.status = status;
  result.formTeacher = teacherProfile._id;
  result.comments = comments || "";
  result.reviewedAt = new Date();
  await result.save();

  return res.json({ message: `Result marked as ${status}.`, result });
};

export const generateClassResultSheets = async (req, res) => {
  const { classId, academicSession, term } = req.body;

  const teacherProfile = await TeacherProfile.findOne({ user: req.user._id });
  if (!teacherProfile || !teacherProfile.formTeacherClass || teacherProfile.formTeacherClass.toString() !== classId) {
    return res.status(403).json({ message: "You are not authorized to generate result sheets for this class." });
  }

  const students = await StudentProfile.find({ class: classId }).populate("user");
  const createdSheets = [];

  for (const studentProfile of students) {
    const approvedResults = await ResultSubmission.find({
      student: studentProfile.user._id,
      class: classId,
      academicSession,
      term,
      status: "APPROVED",
    }).populate("subject");

    const entries = approvedResults.map((result) => ({
      subject: result.subject._id,
      score: result.score,
    }));

    const sheet = await ResultSheet.findOneAndUpdate(
      { student: studentProfile.user._id, class: classId, academicSession, term },
      {
        student: studentProfile.user._id,
        class: classId,
        academicSession,
        term,
        entries,
        generatedBy: teacherProfile._id,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    createdSheets.push(sheet);
  }

  return res.status(201).json({ message: "Result sheets generated successfully.", sheets: createdSheets });
};
