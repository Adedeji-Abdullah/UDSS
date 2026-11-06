import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    isElective: {
      type: Boolean,
      default: false,
    },
    classIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
    }],
    teacherAssignments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherProfile",
    }],
  },
  { timestamps: true }
);

export default mongoose.model("Subject", subjectSchema);
