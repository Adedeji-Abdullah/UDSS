const express = require("express"),
  mongoose = require("mongoose"),
  bcrypt = require("bcryptjs"),
  jwt = require("jsonwebtoken"),
  helmet = require("helmet"),
  rateLimit = require("express-rate-limit"),
  path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use("/images", express.static(path.join(__dirname, "assets", "images")));
app.use("/vendor", express.static(path.join(__dirname, "assets", "vendor")));
app.use("/api/auth", rateLimit({ windowMs: 900000, limit: 60 }));
let databaseConnection;
async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }
  if (!databaseConnection) {
    databaseConnection = mongoose
      .connect(process.env.MONGODB_URI)
      .catch((e) => {
        databaseConnection = undefined;
        throw e;
      });
  }
  await databaseConnection;
}
if (process.env.VERCEL) {
  app.use("/api", (q, r, n) => {
    connectDatabase().then(
      () => n(),
      (e) => n(e),
    );
  });
}

mongoose.connection.on("connected", () =>
  console.log("MONGODB EVENT: connected"),
);
mongoose.connection.on("disconnected", () =>
  console.error("MONGODB EVENT: disconnected"),
);
mongoose.connection.on("error", (e) =>
  console.error("MONGODB EVENT: error:", e.message),
);
mongoose.connection.on("reconnected", () =>
  console.log("MONGODB EVENT: reconnected"),
);

const S = mongoose.Schema;
const User = mongoose.model(
  "User",
  new S(
    {
      name: { type: String, required: true, trim: true },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        sparse: true,
        unique: true,
      },
      phone: { type: String, trim: true, default: "" },
      passwordHash: { type: String, required: true, select: false },
      role: {
        type: String,
        enum: ["principal", "teacher", "student", "parent"],
        required: true,
      },
      schoolId: { type: String, sparse: true, unique: true },
      classId: { type: S.Types.ObjectId, ref: "Classroom", default: null },
      staffId: { type: String, sparse: true, unique: true },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);
const ParentLink = mongoose.model(
  "ParentLink",
  new S(
    {
      parent: { type: S.Types.ObjectId, ref: "User", required: true },
      student: { type: S.Types.ObjectId, ref: "User", required: true },
      relationship: {
        type: String,
        enum: ["mother", "father", "guardian"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      reviewedBy: { type: S.Types.ObjectId, ref: "User", default: null },
      reviewedAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);

ParentLink.schema.index({ parent: 1, student: 1 }, { unique: true });

const Classroom = mongoose.model(
  "Classroom",
  new S(
    {
      name: { type: String, required: true, unique: true },
      formTeacher: { type: S.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true },
  ),
);
const Subject = mongoose.model(
  "Subject",
  new S(
    {
      name: { type: String, required: true },
      code: { type: String, required: true, uppercase: true },
      classId: { type: S.Types.ObjectId, ref: "Classroom", required: true },
      teacherIds: [{ type: S.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true },
  ),
);
const Result = mongoose.model(
  "Result",
  new S(
    {
      student: { type: S.Types.ObjectId, ref: "User", required: true },
      studentId: String,
      classId: { type: S.Types.ObjectId, ref: "Classroom", required: true },
      subjectId: { type: S.Types.ObjectId, ref: "Subject", required: true },
      teacher: { type: S.Types.ObjectId, ref: "User", required: true },
      academicSession: { type: String, required: true },
      term: {
        type: String,
        enum: ["First", "Second", "Third"],
        required: true,
      },
      score: { type: Number, min: 0, max: 100, required: true },
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING",
      },
      formTeacher: { type: S.Types.ObjectId, ref: "User", default: null },
      comments: { type: String, maxlength: 500, default: "" },
      reviewedAt: Date,
    },
    { timestamps: true },
  ),
);
Result.schema.index(
  { student: 1, subjectId: 1, academicSession: 1, term: 1 },
  { unique: true },
);

const ContinuousAssessment = mongoose.model(
  "ContinuousAssessment",
  new S(
    {
      student: { type: S.Types.ObjectId, ref: "User", required: true },
      studentId: { type: String, required: true },
      classId: { type: S.Types.ObjectId, ref: "Classroom", required: true },
      subjectId: { type: S.Types.ObjectId, ref: "Subject", required: true },
      teacher: { type: S.Types.ObjectId, ref: "User", required: true },
      academicSession: { type: String, required: true, trim: true },
      term: {
        type: String,
        enum: ["First", "Second", "Third"],
        required: true,
      },
      marks: {
        test1: { type: Number, default: null, min: 0 },
        test2: { type: Number, default: null, min: 0 },
        ca1: { type: Number, default: null, min: 0 },
        ca2: { type: Number, default: null, min: 0 },
        assignment: { type: Number, default: null, min: 0 },
      },
      maximums: {
        test1: { type: Number, default: 10, min: 0.1 },
        test2: { type: Number, default: 10, min: 0.1 },
        ca1: { type: Number, default: 10, min: 0.1 },
        ca2: { type: Number, default: 10, min: 0.1 },
        assignment: { type: Number, default: 10, min: 0.1 },
      },
    },
    { timestamps: true },
  ),
);
ContinuousAssessment.schema.index(
  { student: 1, subjectId: 1, academicSession: 1, term: 1 },
  { unique: true },
);

// Student attendance records
const Attendance = mongoose.model(
  "Attendance",
  new S(
    {
      student: { type: S.Types.ObjectId, ref: "User", required: true },
      studentId: { type: String, required: true },
      classId: { type: S.Types.ObjectId, ref: "Classroom", required: true },
      markedBy: { type: S.Types.ObjectId, ref: "User", required: true },
      eventName: { type: String, required: true, trim: true },
      eventType: {
        type: String,
        enum: ["examination", "school-event"],
        required: true,
      },
      date: { type: Date, required: true },
      status: { type: String, enum: ["present", "absent"], required: true },
    },
    { timestamps: true },
  ),
);

Attendance.schema.index(
  { student: 1, eventName: 1, date: 1 },
  { unique: true },
);

const Message = mongoose.model(
  "Message",
  new S(
    {
      sender: { type: S.Types.ObjectId, ref: "User", required: true },
      recipient: { type: S.Types.ObjectId, ref: "User", required: true },
      body: { type: String, required: true, trim: true, maxlength: 2000 },
      readAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);
Message.schema.index({ sender: 1, recipient: 1, createdAt: -1 });

// Parent passkey credentials (kept separate from existing User records)
const PasskeyCredential = mongoose.model(
  "PasskeyCredential",
  new S(
    {
      user: {
        type: S.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      credentialId: { type: String, required: true, unique: true },
      publicKey: { type: Buffer, required: true },
      counter: { type: Number, default: 0 },
      transports: { type: [String], default: [] },
      deviceType: { type: String, default: "" },
      backedUp: { type: Boolean, default: false },
    },
    { timestamps: true },
  ),
);

// Short-lived, one-use WebAuthn challenges
const PasskeyChallenge = mongoose.model(
  "PasskeyChallenge",
  new S(
    {
      user: { type: S.Types.ObjectId, ref: "User", required: true },
      challenge: { type: String, required: true },
      purpose: {
        type: String,
        enum: ["register", "authenticate"],
        required: true,
      },
      expiresAt: { type: Date, required: true },
    },
    { timestamps: true },
  ),
);

PasskeyChallenge.schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const onlineUsers = new Map();
const messagingRoles = ["principal", "teacher", "parent"];

const safe = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email || "",
  role: u.role,
  schoolId: u.schoolId || "",
  staffId: u.staffId || "",
});
const token = (u) =>
  jwt.sign({ sub: String(u._id), role: u.role }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
function protect(req, res, next) {
  const t = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!t) return res.status(401).json({ error: "Please sign in." });
  try {
    req.auth = jwt.verify(t, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Sign in again." });
  }
}
const roles =
  (...rs) =>
  (req, res, next) =>
    req.auth && rs.includes(req.auth.role)
      ? next()
      : res.status(403).json({ error: "You do not have permission." });

app.get(
  "/api/teacher/assessment-roster",
  protect,
  roles("teacher"),
  async (q, r, next) => {
    try {
      const subjectId = String(q.query.subjectId || "").trim();

      if (!subjectId) {
        return r.status(400).json({ error: "Choose a subject." });
      }

      const subject = await Subject.findOne({
        _id: subjectId,
        teacherIds: q.auth.sub,
      }).populate("classId", "name");

      if (!subject) {
        return r
          .status(403)
          .json({ error: "This subject is not assigned to you." });
      }

      const students = await User.find({
        role: "student",
        active: true,
        classId: subject.classId._id,
      })
        .select("name schoolId classId")
        .sort({ name: 1 });

      r.json({
        subject: {
          id: subject._id,
          name: subject.name,
          code: subject.code,
          classId: subject.classId._id,
          className: subject.classId.name,
        },
        students,
      });
    } catch (e) {
      next(e);
    }
  },
);

app.get(
  "/api/teacher/assessments",
  protect,
  roles("teacher"),
  async (q, r, next) => {
    try {
      const filter = {
        teacher: q.auth.sub,
        subjectId: q.query.subjectId,
        academicSession: String(q.query.academicSession || "").trim(),
        term: q.query.term,
      };
      if (
        !filter.subjectId ||
        !filter.academicSession ||
        !["First", "Second", "Third"].includes(filter.term)
      ) {
        return r
          .status(400)
          .json({ error: "Choose a subject, session and term." });
      }
      const subject = await Subject.findOne({
        _id: filter.subjectId,
        teacherIds: q.auth.sub,
      });
      if (!subject)
        return r
          .status(403)
          .json({ error: "This subject is not assigned to you." });
      const assessments = await ContinuousAssessment.find({
        subjectId: subject._id,
        academicSession: filter.academicSession,
        term: filter.term,
      })
        .populate("student", "name schoolId")
        .populate("subjectId", "name code")
        .populate("classId", "name")
        .sort({ studentId: 1 });
      r.json({ assessments });
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/api/teacher/assessments",
  protect,
  roles("teacher"),
  async (q, r, next) => {
    try {
      const { studentId, subjectId, academicSession, term } = q.body;
      const keys = ["test1", "test2", "ca1", "ca2", "assignment"];
      const marks = q.body.marks || {};
      const maximums = q.body.maximums || {};
      const session = String(academicSession || "").trim();

      if (
        !String(studentId || "").trim() ||
        !session ||
        !["First", "Second", "Third"].includes(term)
      ) {
        return r
          .status(400)
          .json({ error: "Enter the student UID, session and term." });
      }

      const [student, subject] = await Promise.all([
        User.findOne({
          role: "student",
          schoolId: String(studentId).trim(),
          active: true,
        }),
        Subject.findOne({ _id: subjectId, teacherIds: q.auth.sub }).populate(
          "classId",
        ),
      ]);
      if (!student || !subject)
        return r
          .status(400)
          .json({ error: "Student or assigned subject not found." });

      if (
        String(student.classId || "") !==
        String(subject.classId?._id || subject.classId || "")
      )
        return r
          .status(400)
          .json({
            error:
              "This student does not belong to the selected subject's class. Check the student's class assignment.",
          });

      const cleanMarks = {},
        cleanMaximums = {};
      for (const k of keys) {
        const max =
          maximums[k] === undefined || maximums[k] === ""
            ? 10
            : Number(maximums[k]);
        if (!Number.isFinite(max) || max <= 0 || max > 100)
          return r
            .status(400)
            .json({
              error: "Each maximum score must be above 0 and at most 100.",
            });
        cleanMaximums[k] = max;

        const raw = marks[k];
        if (raw === undefined || raw === null || raw === "") {
          cleanMarks[k] = null;
        } else {
          const mark = Number(raw);
          if (!Number.isFinite(mark) || mark < 0 || mark > max)
            return r
              .status(400)
              .json({
                error: `${k} must be between 0 and its maximum score (${max}).`,
              });
          cleanMarks[k] = mark;
        }
      }

      const record = await ContinuousAssessment.findOneAndUpdate(
        {
          student: student._id,
          subjectId: subject._id,
          academicSession: session,
          term,
        },
        {
          $set: {
            studentId: student.schoolId,
            classId: subject.classId._id,
            teacher: q.auth.sub,
            marks: cleanMarks,
            maximums: cleanMaximums,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
      r.json({ message: "Continuous assessment saved.", assessment: record });
    } catch (e) {
      next(e);
    }
  },
);

app.get(
  "/api/principal/assessments",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const filter = {};
      if (q.query.academicSession)
        filter.academicSession = String(q.query.academicSession).trim();
      if (q.query.term && ["First", "Second", "Third"].includes(q.query.term))
        filter.term = q.query.term;

      const assessments = await ContinuousAssessment.find(filter)
        .populate("student", "name schoolId")
        .populate("subjectId", "name code")
        .populate("classId", "name")
        .populate("teacher", "name staffId")
        .sort({ academicSession: -1, term: 1, studentId: 1 });
      r.json({ count: assessments.length, assessments });
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/api/principal/assign-student-class",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const { schoolId, classId } = q.body;
      if (!schoolId || !classId)
        return r
          .status(400)
          .json({ error: "Student UID and class are required." });
      const [student, classroom] = await Promise.all([
        User.findOne({ role: "student", schoolId: String(schoolId).trim() }),
        Classroom.findById(classId),
      ]);
      if (!student)
        return r.status(404).json({ error: "Student UID not found." });
      if (!classroom) return r.status(404).json({ error: "Class not found." });
      student.classId = classroom._id;
      await student.save();
      r.json({
        message: "Student class assigned successfully.",
        student: {
          name: student.name,
          schoolId: student.schoolId,
          classId: classroom._id,
          className: classroom.name,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);
app.get("/api/health", (q, r) =>
  r.json({
    ok: true,
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);
app.post("/api/auth/bootstrap-principal", async (q, r, next) => {
  try {
    if (await User.exists({ role: "principal" }))
      return r
        .status(403)
        .json({ error: "Principal setup is already complete." });
    const { name, email, password, setupKey } = q.body;
    if (!process.env.BOOTSTRAP_KEY || setupKey !== process.env.BOOTSTRAP_KEY)
      return r
        .status(403)
        .json({ error: "Setup key is incorrect or not configured." });
    if (!name || !email || !password || password.length < 12)
      return r
        .status(400)
        .json({
          error: "Name, email and password of 12+ characters required.",
        });
    const u = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "principal",
    });
    r.status(201).json({ token: token(u), user: safe(u) });
  } catch (e) {
    next(e);
  }
});
app.post("/api/auth/login", async (q, r, next) => {
  try {
    const { identifier, password, role } = q.body;
    if (
      !identifier ||
      !password ||
      !["principal", "teacher", "student", "parent"].includes(role)
    )
      return r.status(400).json({ error: "Enter login details and role." });
    const key =
      role === "principal" || role === "parent"
        ? { email: String(identifier).toLowerCase().trim() }
        : role === "teacher"
          ? {
              $or: [
                { staffId: String(identifier).trim() },
                { email: String(identifier).toLowerCase().trim() },
              ],
            }
          : { schoolId: String(identifier).trim() };
    const u = await User.findOne({ ...key, role, active: true }).select(
      "+passwordHash",
    );
    if (!u || !(await bcrypt.compare(password, u.passwordHash)))
      return r.status(401).json({ error: "Invalid login details." });
    r.json({ token: token(u), user: safe(u) });
  } catch (e) {
    next(e);
  }
});

app.post("/api/auth/register-parent", async (q, r, next) => {
  try {
    const { name, email, phone, password } = q.body || {};

    if (!name || !password || password.length < 12 || (!email && !phone)) {
      return r.status(400).json({
        error:
          "Name, email or phone, and password of 12+ characters are required.",
      });
    }

    const normalizedEmail = email
      ? String(email).trim().toLowerCase()
      : undefined;
    const normalizedPhone = phone ? String(phone).trim() : "";

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return r.status(400).json({ error: "Enter a valid email address." });
    }

    const duplicateQuery = [];
    if (normalizedEmail) duplicateQuery.push({ email: normalizedEmail });
    if (normalizedPhone) duplicateQuery.push({ phone: normalizedPhone });

    if (duplicateQuery.length && (await User.exists({ $or: duplicateQuery }))) {
      return r.status(409).json({
        error:
          "An account with those contact details already exists. Please sign in or contact the school.",
      });
    }

    const parent = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash: await bcrypt.hash(password, 12),
      role: "parent",
    });

    return r.status(201).json({
      message: "Parent account created successfully. You can now sign in.",
      user: safe(parent),
    });
  } catch (e) {
    if (e.code === 11000) {
      return r.status(409).json({
        error:
          "An account with those contact details already exists. Please sign in.",
      });
    }
    next(e);
  }
});

// ================= PARENT PASSKEY AUTHENTICATION =================
const PASSKEY_RP_ID = "localhost";
const PASSKEY_ORIGIN = "http://localhost:3000";

async function savePasskeyChallenge(userId, purpose, challenge) {
  await PasskeyChallenge.deleteMany({ user: userId, purpose });
  await PasskeyChallenge.create({
    user: userId,
    purpose,
    challenge,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
}

app.post(
  "/api/auth/passkey/register-options",
  protect,
  roles("parent"),
  async (q, r, next) => {
    try {
      const user = await User.findOne({
        _id: q.auth.sub,
        role: "parent",
        active: true,
      });
      if (!user || !user.email) {
        return r
          .status(400)
          .json({
            error:
              "A parent email address is required for passkey registration.",
          });
      }

      const existing = await PasskeyCredential.find({ user: user._id });
      const options = await generateRegistrationOptions({
        rpName: "UDSS School Portal",
        rpID: PASSKEY_RP_ID,
        userID: Buffer.from(String(user._id)),
        userName: user.email,
        userDisplayName: user.name,
        attestationType: "none",
        excludeCredentials: existing.map((c) => ({
          id: c.credentialId,
          transports: c.transports,
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required",
        },
      });

      await savePasskeyChallenge(user._id, "register", options.challenge);
      r.json({ options });
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/api/auth/passkey/register-verify",
  protect,
  roles("parent"),
  async (q, r, next) => {
    try {
      const user = await User.findOne({
        _id: q.auth.sub,
        role: "parent",
        active: true,
      });
      if (!user)
        return r.status(404).json({ error: "Parent account not found." });

      const pending = await PasskeyChallenge.findOne({
        user: user._id,
        purpose: "register",
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!pending)
        return r
          .status(400)
          .json({ error: "Passkey request expired. Try again." });

      const verification = await verifyRegistrationResponse({
        response: q.body,
        expectedChallenge: pending.challenge,
        expectedOrigin: PASSKEY_ORIGIN,
        expectedRPID: PASSKEY_RP_ID,
        requireUserVerification: true,
      });

      await pending.deleteOne();

      if (!verification.verified || !verification.registrationInfo) {
        return r.status(400).json({ error: "Passkey verification failed." });
      }

      const credential = verification.registrationInfo.credential;
      await PasskeyCredential.create({
        user: user._id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports || [],
        deviceType: verification.registrationInfo.credentialDeviceType,
        backedUp: verification.registrationInfo.credentialBackedUp,
      });

      r.json({ verified: true, message: "Passkey registered successfully." });
    } catch (e) {
      if (e.code === 11000)
        return r
          .status(409)
          .json({ error: "This passkey is already registered." });
      next(e);
    }
  },
);

app.post("/api/auth/passkey/login-options", async (q, r, next) => {
  try {
    const email = String(q.body?.email || "")
      .trim()
      .toLowerCase();
    if (!email)
      return r.status(400).json({ error: "Enter your parent email address." });

    const user = await User.findOne({ email, role: "parent", active: true });
    if (!user)
      return r
        .status(404)
        .json({ error: "Parent account or passkey not found." });

    const credentials = await PasskeyCredential.find({ user: user._id });
    if (!credentials.length) {
      return r
        .status(404)
        .json({ error: "No passkey is registered for this account." });
    }

    const options = await generateAuthenticationOptions({
      rpID: PASSKEY_RP_ID,
      allowCredentials: credentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports,
      })),
      userVerification: "required",
    });

    await savePasskeyChallenge(user._id, "authenticate", options.challenge);
    r.json({ options });
  } catch (e) {
    next(e);
  }
});

app.post("/api/auth/passkey/login-verify", async (q, r, next) => {
  try {
    const email = String(q.body?.email || "")
      .trim()
      .toLowerCase();
    const response = q.body?.response;

    if (!email || !response?.id) {
      return r
        .status(400)
        .json({ error: "Passkey login information is incomplete." });
    }

    const user = await User.findOne({ email, role: "parent", active: true });
    if (!user) return r.status(401).json({ error: "Passkey login failed." });

    const credential = await PasskeyCredential.findOne({
      user: user._id,
      credentialId: response.id,
    });

    if (!credential)
      return r.status(401).json({ error: "Passkey login failed." });

    const pending = await PasskeyChallenge.findOne({
      user: user._id,
      purpose: "authenticate",
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!pending)
      return r
        .status(400)
        .json({ error: "Passkey request expired. Try again." });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: PASSKEY_ORIGIN,
      expectedRPID: PASSKEY_RP_ID,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
      },
      requireUserVerification: true,
    });

    await pending.deleteOne();

    if (!verification.verified) {
      return r.status(401).json({ error: "Passkey verification failed." });
    }

    credential.counter = verification.authenticationInfo.newCounter;
    credential.deviceType =
      verification.authenticationInfo.credentialDeviceType;
    credential.backedUp = verification.authenticationInfo.credentialBackedUp;
    await credential.save();

    r.json({ token: token(user), user: safe(user) });
  } catch (e) {
    next(e);
  }
});
// ================= END PARENT PASSKEY AUTHENTICATION =================

app.get("/api/auth/me", protect, async (q, r) => {
  const u = await User.findById(q.auth.sub);
  if (!u || !u.active)
    return r.status(401).json({ error: "Account unavailable." });
  r.json({ user: safe(u) });
});

app.get(
  "/api/messages/contacts",
  protect,
  roles("principal", "teacher", "parent"),
  async (q, r, next) => {
    try {
      const contacts = await User.find({
        _id: { $ne: q.auth.sub },
        role: { $in: ["principal", "teacher", "parent"] },
        active: true,
      }).sort({ name: 1 });
      r.json({ contacts: contacts.map(safe) });
    } catch (e) {
      next(e);
    }
  },
);

app.get(
  "/api/messages/:peerId",
  protect,
  roles("principal", "teacher", "parent"),
  async (q, r, next) => {
    try {
      if (!mongoose.isValidObjectId(q.params.peerId))
        return r.status(400).json({ error: "Invalid contact ID" });
      const peer = await User.findOne({
        _id: q.params.peerId,
        role: { $in: ["principal", "teacher", "parent"] },
        active: true,
      });
      if (!peer) return r.status(404).json({ error: "Contact not found" });
      await Message.updateMany(
        { sender: peer._id, recipient: q.auth.sub, readAt: null },
        { $set: { readAt: new Date() } },
      );
      const messages = await Message.find({
        $or: [
          { sender: q.auth.sub, recipient: peer._id },
          { sender: peer._id, recipient: q.auth.sub },
        ],
      })
        .sort({ createdAt: 1 })
        .limit(100);
      r.json({
        contact: safe(peer),
        messages: messages.map((m) => ({
          id: String(m._id),
          sender: String(m.sender),
          recipient: String(m.recipient),
          body: m.body,
          readAt: m.readAt,
          createdAt: m.createdAt,
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/api/messages/:peerId",
  protect,
  roles("principal", "teacher", "parent"),
  async (q, r, next) => {
    try {
      if (!mongoose.isValidObjectId(q.params.peerId))
        return r.status(400).json({ error: "Invalid recipient ID" });
      const body = typeof q.body.body === "string" ? q.body.body.trim() : "";
      if (!body || body.length > 2000)
        return r
          .status(400)
          .json({ error: "Message must contain 1–2000 characters" });
      const recipient = await User.findOne({
        _id: q.params.peerId,
        role: { $in: ["principal", "teacher", "parent"] },
        active: true,
      });
      if (!recipient)
        return r.status(404).json({ error: "Recipient not found" });
      const message = await Message.create({
        sender: q.auth.sub,
        recipient: recipient._id,
        body,
      });
      r.status(201).json({
        message: {
          id: String(message._id),
          sender: String(message.sender),
          recipient: String(message.recipient),
          body: message.body,
          readAt: message.readAt,
          createdAt: message.createdAt,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/api/presence/heartbeat",
  protect,
  roles("parent", "teacher"),
  (q, r) => {
    onlineUsers.set(String(q.auth.sub), Date.now());
    r.json({ ok: true });
  },
);

app.get(
  "/api/presence/online",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const cutoff = Date.now() - 90000;
      for (const [id, seen] of onlineUsers.entries())
        if (seen < cutoff) onlineUsers.delete(id);
      const ids = [...onlineUsers.keys()];
      const users = ids.length
        ? await User.find({
            _id: { $in: ids },
            role: { $in: ["parent", "teacher"] },
            active: true,
          }).sort({ name: 1 })
        : [];
      r.json({
        users: users.map((u) => ({
          ...safe(u),
          lastSeen: onlineUsers.get(String(u._id)),
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);

app.get(
  "/api/principal/parent-links",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const status = ["pending", "approved", "rejected"].includes(
        q.query.status,
      )
        ? q.query.status
        : "pending";

      const links = await ParentLink.find({ status })
        .populate("parent", "name email phone")
        .populate("student", "name schoolId")
        .populate("reviewedBy", "name")
        .sort({ createdAt: -1 });

      r.json({ links });
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/api/principal/parent-links/:id/review",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const { decision } = q.body;
      if (!["approved", "rejected"].includes(decision)) {
        return r
          .status(400)
          .json({ error: "Decision must be approved or rejected." });
      }

      const link = await ParentLink.findById(q.params.id);
      if (!link) {
        return r
          .status(404)
          .json({ error: "Parent relationship request not found." });
      }
      if (link.status !== "pending") {
        return r
          .status(409)
          .json({ error: "This request has already been reviewed." });
      }

      link.status = decision;
      link.reviewedBy = q.auth.sub;
      link.reviewedAt = new Date();
      await link.save();

      r.json({ message: `Parent relationship ${decision}.`, link });
    } catch (e) {
      next(e);
    }
  },
);

app.get(
  "/api/principal/overview",
  protect,
  roles("principal"),
  async (q, r) => {
    const [teachers, students, classes, subjects, pendingResults] =
      await Promise.all([
        User.countDocuments({ role: "teacher" }),
        User.countDocuments({ role: "student" }),
        Classroom.countDocuments(),
        Subject.countDocuments(),
        Result.countDocuments({ status: "PENDING" }),
      ]);
    r.json({ teachers, students, classes, subjects, pendingResults });
  },
);
app.get("/api/principal/users", protect, roles("principal"), async (q, r) => {
  const role = ["teacher", "student"].includes(q.query.role)
    ? q.query.role
    : { $in: ["teacher", "student"] };
  r.json({ users: (await User.find({ role }).sort({ name: 1 })).map(safe) });
});
app.post(
  "/api/principal/teachers",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const { name, email, staffId, password } = q.body;
      if (!name || !staffId || !password || password.length < 12)
        return r
          .status(400)
          .json({
            error: "Name, staff ID and 12+ character password required.",
          });
      const u = await User.create({
        name,
        email: email || undefined,
        staffId,
        passwordHash: await bcrypt.hash(password, 12),
        role: "teacher",
      });
      r.status(201).json({ user: safe(u) });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/principal/students",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const { name, schoolId, password, classId } = q.body;
      if (!name || !schoolId || !password || password.length < 12 || !classId)
        return r
          .status(400)
          .json({
            error: "Name, UID, class and 12+ character password required.",
          });
      const classroom = await Classroom.findById(classId);
      if (!classroom)
        return r.status(400).json({ error: "Please select a valid class." });
      const u = await User.create({
        name,
        schoolId,
        classId: classroom._id,
        passwordHash: await bcrypt.hash(password, 12),
        role: "student",
      });
      r.status(201).json({ user: safe(u) });
    } catch (e) {
      next(e);
    }
  },
);
app.get("/api/principal/classes", protect, roles("principal"), async (q, r) =>
  r.json({
    classes: await Classroom.find()
      .populate("formTeacher", "name staffId")
      .sort({ name: 1 }),
  }),
);
app.post(
  "/api/principal/classes",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      if (!q.body.name)
        return r.status(400).json({ error: "Class name required." });
      r.status(201).json({
        classroom: await Classroom.create({ name: q.body.name.trim() }),
      });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/principal/form-teachers",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const [c, t] = await Promise.all([
        Classroom.findById(q.body.classId),
        User.findOne({ _id: q.body.teacherId, role: "teacher" }),
      ]);
      if (!c || !t)
        return r.status(404).json({ error: "Class or teacher not found." });
      await Classroom.updateMany(
        { formTeacher: t._id },
        { $set: { formTeacher: null } },
      );
      c.formTeacher = t._id;
      await c.save();
      r.json({ message: "Form teacher assigned." });
    } catch (e) {
      next(e);
    }
  },
);
app.get("/api/principal/subjects", protect, roles("principal"), async (q, r) =>
  r.json({
    subjects: await Subject.find()
      .populate("classId", "name")
      .populate("teacherIds", "name staffId"),
  }),
);
app.post(
  "/api/principal/subjects",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const { name, code, classId } = q.body;
      if (!name || !code || !(await Classroom.exists({ _id: classId })))
        return r
          .status(400)
          .json({ error: "Valid subject name, code and class required." });
      r.status(201).json({
        subject: await Subject.create({ name, code, classId }),
      });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/principal/teacher-subjects",
  protect,
  roles("principal"),
  async (q, r, next) => {
    try {
      const [t, s] = await Promise.all([
        User.findOne({ _id: q.body.teacherId, role: "teacher" }),
        Subject.findById(q.body.subjectId),
      ]);
      if (!t || !s)
        return r.status(404).json({ error: "Teacher or subject not found." });
      if (!s.teacherIds.some((x) => String(x) === String(t._id)))
        s.teacherIds.push(t._id);
      await s.save();
      r.json({ message: "Teacher assigned to subject." });
    } catch (e) {
      next(e);
    }
  },
);
app.get("/api/teacher/dashboard", protect, roles("teacher"), async (q, r) => {
  const subjects = await Subject.find({ teacherIds: q.auth.sub }).populate(
    "classId",
    "name",
  );
  r.json({ subjects });
});
app.get("/api/teacher/results", protect, roles("teacher"), async (q, r) =>
  r.json({
    results: await Result.find({ teacher: q.auth.sub })
      .populate("student", "name schoolId")
      .populate("subjectId", "name code")
      .populate("classId", "name")
      .sort({ createdAt: -1 }),
  }),
);
app.post(
  "/api/teacher/results",
  protect,
  roles("teacher"),
  async (q, r, next) => {
    try {
      const { studentId, subjectId, academicSession, term, score } = q.body;
      const [student, subject] = await Promise.all([
        User.findOne({
          role: "student",
          schoolId: String(studentId || "").trim(),
          active: true,
        }),
        Subject.findOne({ _id: subjectId, teacherIds: q.auth.sub }).populate(
          "classId",
        ),
      ]);
      if (!student || !subject)
        return r
          .status(400)
          .json({ error: "Student or assigned subject not found." });
      if (
        !academicSession ||
        !["First", "Second", "Third"].includes(term) ||
        !Number.isFinite(Number(score)) ||
        score < 0 ||
        score > 100
      )
        return r
          .status(400)
          .json({ error: "Enter valid session, term and score (0–100)." });
      const c = subject.classId;
      const result = await Result.create({
        student: student._id,
        studentId: student.schoolId,
        classId: c._id,
        subjectId: subject._id,
        teacher: q.auth.sub,
        academicSession,
        term,
        score: Number(score),
        formTeacher: c.formTeacher,
      });
      r.status(201).json({
        message: "Submitted for form-teacher review.",
        result,
      });
    } catch (e) {
      next(e);
    }
  },
);
app.get(
  "/api/form-teacher/results",
  protect,
  roles("teacher"),
  async (q, r) => {
    const cs = await Classroom.find({ formTeacher: q.auth.sub }).select("_id");
    r.json({
      results: await Result.find({ classId: { $in: cs.map((c) => c._id) } })
        .populate("student", "name schoolId")
        .populate("subjectId", "name code")
        .populate("teacher", "name")
        .populate("classId", "name")
        .sort({ createdAt: -1 }),
    });
  },
);
app.post(
  "/api/form-teacher/results/:id/review",
  protect,
  roles("teacher"),
  async (q, r, next) => {
    try {
      const { decision, comments = "" } = q.body;
      if (!["APPROVED", "REJECTED"].includes(decision))
        return r.status(400).json({ error: "Choose APPROVED or REJECTED." });
      const x = await Result.findById(q.params.id);
      if (!x) return r.status(404).json({ error: "Result not found." });
      if (
        !(await Classroom.exists({ _id: x.classId, formTeacher: q.auth.sub }))
      )
        return r
          .status(403)
          .json({ error: "Not form teacher for this class." });
      x.status = decision;
      x.comments = String(comments).slice(0, 500);
      x.reviewedAt = new Date();
      x.formTeacher = q.auth.sub;
      await x.save();
      r.json({ message: "Result reviewed." });
    } catch (e) {
      next(e);
    }
  },
);
app.get(
  "/api/student/profile",
  protect,
  roles("student"),
  async (q, r, next) => {
    try {
      const student = await User.findOne({
        _id: q.auth.sub,
        role: "student",
        active: true,
      }).populate("classId", "name");
      if (!student)
        return r.status(404).json({ error: "Student profile not found." });
      const subjects = student.classId
        ? await Subject.find({ classId: student.classId._id })
            .select("name code")
            .sort({ name: 1 })
        : [];
      r.json({
        user: safe(student),
        classroom: student.classId || null,
        subjects,
      });
    } catch (e) {
      next(e);
    }
  },
);
app.get("/api/student/results", protect, roles("student"), async (q, r) =>
  r.json({
    results: await Result.find({ student: q.auth.sub, status: "APPROVED" })
      .populate("subjectId", "name code")
      .populate("classId", "name")
      .select("-teacher -formTeacher")
      .sort({ academicSession: -1, term: 1 }),
  }),
);
app.get("/api/health", (q, r) =>
  r.json({
    ok: true,
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);
app.use("/api", (q, r) =>
  r.status(404).json({ error: "API endpoint not found." }),
);
app.use((e, q, r, n) => {
  console.error(e);
  if (e.code === 11000)
    return r
      .status(409)
      .json({ error: "That ID, email or result already exists." });
  if (e.name === "ValidationError" || e.name === "CastError")
    return r.status(400).json({ error: "Check the information entered." });
  r.status(500).json({ error: "Server error. Check server logs." });
});
async function start() {
  if (
    !process.env.MONGODB_URI ||
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 2
  ) {
    console.error("Configure MONGODB_URI and JWT_SECRET (32+ chars) in .env");
    process.exit(1);
  }
  await connectDatabase();
  app.listen(Number(process.env.PORT || 3000), () =>
    console.log("UDSS Portal listening on port " + (process.env.PORT || 3000)),
  );
}
if (require.main === module) {
  start().catch((e) => {
    console.error("Server failed:", e.message);
    process.exit(1);
  });
}
module.exports = app;
