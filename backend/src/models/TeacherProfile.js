import mongoose from "mongoose";

const teacherProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    teacherId: {
      type: String,
      required: true,
      unique: true,
    },
    subjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    }],
    classes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
    }],
    isFormTeacher: {
      type: Boolean,
      default: false,
    },
    formTeacherClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TeacherProfile", teacherProfileSchema);
