import mongoose from "mongoose";

const resultSheetSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    academicSession: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      required: true,
    },
    entries: [
      {
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          required: true,
        },
        score: {
          type: Number,
          required: true,
        },
      },
    ],
    isFinal: {
      type: Boolean,
      default: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherProfile",
      default: null,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

resultSheetSchema.index({ student: 1, class: 1, academicSession: 1, term: 1 }, { unique: true });

export default mongoose.model("ResultSheet", resultSheetSchema);
