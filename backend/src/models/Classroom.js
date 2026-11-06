import mongoose from "mongoose";

const classroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    formTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherProfile",
      default: null,
    },
    subjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    }],
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
    }],
  },
  { timestamps: true }
);

export default mongoose.model("Classroom", classroomSchema);
