import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    studentId: {
      type: String,
      required: true,
      unique: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    registeredSubjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    }],
  },
  { timestamps: true }
);

export default mongoose.model("StudentProfile", studentProfileSchema);
