# School Portal / Student Result Management System

## 1. Overall system architecture

This project follows a backend-first architecture with a Node.js + Express API, MongoDB + Mongoose persistence, JWT authentication, and role-based access control. The frontend is intentionally thin and should only consume the API; it never decides authorization.

### Core architecture

- API layer: Express routes for authentication, administration, teaching workflows, form-teacher review, and student access.
- Authentication layer: JWT-based login with secure password hashing via bcrypt.
- Authorization layer: backend permission checks based on role and ownership.
- Data layer: MongoDB collections for users, classrooms, subjects, teacher profiles, student profiles, and results.
- Business workflow: subject teacher uploads -> form teacher review -> final student result sheet generation.

### Why this architecture is better

This design improves on a simple frontend-only setup because all critical rules are enforced on the server:

- a student cannot access another student's result by URL manipulation;
- a subject teacher cannot upload results for an unassigned subject or class;
- a form teacher can only review results for their assigned class;
- principal-only actions are guarded by backend role checks.

---

## 2. Database models / schema

### User

Stores shared authentication information:

- name
- email
- password
- role: principal | teacher | student
- schoolId for students
- staffId for teachers

### TeacherProfile

Stores teacher-specific assignment data:

- user
- teacherId
- subjects
- classes
- isFormTeacher
- formTeacherClass

### StudentProfile

Stores student-specific data:

- user
- studentId
- class
- registeredSubjects

### Classroom

Stores class setup:

- name
- formTeacher
- subjects
- students

### Subject

Stores subject definitions:

- name
- code
- isElective
- classIds
- teacherAssignments

### ResultSubmission

Stores a single subject result record:

- student
- studentId
- class
- subject
- teacher
- score
- academicSession
- term
- status: PENDING | APPROVED | REJECTED
- formTeacher
- comments
- uploadedAt
- reviewedAt

### ResultSheet

Stores the final compiled sheet for one student, one class, one academic session, and one term.

---

## 3. Relationships between models

- User has one role and can be either principal, teacher, or student.
- TeacherProfile belongs to User.
- StudentProfile belongs to User.
- Classroom has many StudentProfile records.
- Classroom has many Subject records.
- Subject can be taught by many TeacherProfile records.
- ResultSubmission belongs to a student, subject, teacher, and class.
- ResultSheet belongs to a student and class.

This design keeps the core data normalized and avoids unnecessary duplication while preserving per-subject result records.

---

## 4. Authentication flow

1. User submits credentials to /api/auth/login.
2. Server verifies the email or schoolId/staffId and password.
3. Server creates a JWT with the user ID and role.
4. The client sends the token in the Authorization header as Bearer <token>.
5. protect middleware validates the token and attaches the user to req.user.

---

## 5. Authorization / role system

### Principal

Can manage:

- teachers
- students
- classes
- subjects
- assignments
- form teachers
- school dashboard

### Teacher

Can:

- view assigned classes
- upload results for assigned subjects
- see uploaded result records

Cannot:

- upload unrelated results
- approve unrelated class submissions
- access a different student's result beyond their own profile as a student

### Form Teacher

Can:

- review results for the assigned class
- approve or reject results
- generate result sheets for that class

Cannot:

- access a different class without assignment

### Student

Can:

- view own profile
- view own student result records
- view own final result sheet

Cannot:

- access another student's result
- upload or edit results
- access principal or teacher dashboards

---

## 6. API endpoints

### Authentication

- POST /api/auth/bootstrap-principal
- POST /api/auth/login
- GET /api/auth/me

### Principal

- GET /api/principal/dashboard
- POST /api/principal/teachers
- POST /api/principal/students
- POST /api/principal/classes
- POST /api/principal/subjects
- POST /api/principal/classes/subjects
- POST /api/principal/teacher-subjects
- POST /api/principal/form-teachers

### Teacher

- GET /api/teacher/dashboard
- GET /api/teacher/students
- GET /api/teacher/results
- POST /api/teacher/results

### Form Teacher

- GET /api/form-teacher/dashboard
- POST /api/form-teacher/results/:resultId/review
- POST /api/form-teacher/generate-result-sheets

### Student

- GET /api/student/profile
- GET /api/student/results
- GET /api/student/results/:studentId
- GET /api/student/result-sheet

---

## 7. Result upload workflow

1. A teacher logs in and loads the dashboard.
2. Only assigned classes and subjects are available to that teacher.
3. Teacher submits result entries for a class and subject.
4. Server validates:
   - teacher is assigned to the class;
   - teacher is assigned to the subject;
   - subject is offered in that class;
   - each student belongs to the class.
5. Each result is saved as a ResultSubmission with status = PENDING.
6. The system routes every submission to the correct form teacher for the class.

---

## 8. Form Teacher approval workflow

1. Form Teacher loads results for assigned class.
2. Server filters results by formTeacherClass.
3. Teacher reviews each result and sets APPROVED or REJECTED.
4. The server updates the result record and stores form teacher identity and timestamps.
5. Once approved results exist, the form teacher can generate a per-student result sheet.

---

## 9. Student result access workflow

1. Student authenticates and receives a JWT.
2. Every student dashboard call runs through protect middleware.
3. When a student requests a result, the server compares the requested student ID to req.user.schoolId.
4. If they mismatch, the request is rejected with 403.
5. This prevents IDOR/BOLA-style attacks even when a malicious user alters URL parameters.

---

## 10. Recommended folder structure

```text
udss/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── principalController.js
│   │   ├── teacherController.js
│   │   ├── formTeacherController.js
│   │   └── studentController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── authorize.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Classroom.js
│   │   ├── Subject.js
│   │   ├── TeacherProfile.js
│   │   ├── StudentProfile.js
│   │   ├── ResultSubmission.js
│   │   └── ResultSheet.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── principalRoutes.js
│   │   ├── teacherRoutes.js
│   │   ├── formTeacherRoutes.js
│   │   └── studentRoutes.js
│   └── utils/
│       └── permissions.js
├── .env.example
├── server.js
├── README.md
├── index.html
├── package.json
└── .gitignore
```

---

## Implementation status

The backend core is now implemented with:

- secure authentication;
- role-based access control;
- structured MongoDB models;
- teacher upload flow;
- form-teacher review flow;
- student-only result access enforcement;
- result-sheet generation.

Next steps for the project would be to add the frontend pages, integrate Swagger documentation, and extend the result logic with grade computation and subject completeness checks.

- Design dashboards.
- Design login and authentication screens.
- Design student profiles.
- Design result pages.
- Create responsive layouts.
- Establish typography, colors, spacing and component guidelines.
- Ensure the application is easy to navigate.
- Work closely with frontend developers during implementation.

Deliverables

Wireframes
UI Designs
Prototypes
User Flows
Design System
Responsive Designs

---

💻 Frontend Developer

The Frontend Developer is responsible for building the user-facing part of the application.

Responsibilities

- Convert UI/UX designs into functional interfaces.
- Build reusable components.
- Implement routing.
- Build forms.
- Implement frontend validation.
- Connect the frontend to backend APIs.
- Build dashboards.
- Display student results.
- Handle loading states.
- Handle errors.
- Implement responsive layouts.
- Maintain clean and reusable code.

Frontend Flow

UI/UX Design
     ↓
Components
     ↓
Pages
     ↓
Routing
     ↓
API Integration
     ↓
State Management
     ↓
User Interface

---

⚙️ Backend Developer

The Backend Developer is responsible for the server-side architecture and business logic.

Responsibilities

- Design and develop APIs.
- Design database schemas.
- Manage database operations.
- Implement authentication.
- Implement authorization.
- Implement result calculations.
- Validate incoming data.
- Manage users and roles.
- Protect sensitive endpoints.
- Handle errors.
- Optimize database queries.
- Implement backend security.

Backend Flow

Frontend Request
       ↓
      API
       ↓
Authentication
       ↓
Authorization
       ↓
Business Logic
       ↓
   Database
       ↓
 API Response

---

🔄 Full-Stack Developer

The Full-Stack Developer works across both the frontend and backend.

Responsibilities

- Build frontend features.
- Build backend features.
- Connect frontend and backend.
- Develop complete features from start to finish.
- Debug integration issues.
- Assist frontend and backend developers.
- Work with APIs.
- Work with databases.
- Help maintain application architecture.

Example

A full-stack developer may implement an entire result feature:

Result Page
     ↓
API Request
     ↓
Backend Controller
     ↓
Result Service
     ↓
Database
     ↓
API Response
     ↓
Result Display

---

🗂️ Project Structure

A possible project structure:

school-portal/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── types/
│   │   └── context/
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   └── config/
│   │
│   └── package.json
│
├── docs/
│
├── .gitignore
└── README.md

The final structure may change as development progresses.

---

🔌 API Structure

The backend may provide endpoints such as:

POST   /api/auth/login
POST   /api/auth/register

GET    /api/students
GET    /api/students/:id
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id

GET    /api/classes
GET    /api/classes/:id

GET    /api/sets
GET    /api/sets/:id

POST   /api/results
GET    /api/results/:studentId
PUT    /api/results/:id

GET    /api/dashboard/school
GET    /api/dashboard/class/:id
GET    /api/dashboard/set/:id

The final API structure will be determined during backend development.

---

📈 Result Processing

The result-processing system will handle calculations automatically.

Subject Scores
      ↓
Total Score
      ↓
Grade
      ↓
Average
      ↓
Overall Result
      ↓
Publish Result

The grading system should be configurable rather than permanently hard-coded.

Example:

70 – 100  → A
60 – 69   → B
50 – 59   → C
45 – 49   → D
40 – 44   → E
0 – 39    → F

«The actual grading system will be determined by the school's official requirements.»

---

🛡️ Security

Student academic information is sensitive and must be properly protected.

The system should implement:

- Secure authentication
- Role-based authorization
- Password hashing
- Input validation
- API protection
- Rate limiting
- Secure token/cookie handling
- Database access control
- Environment variables for secrets
- CORS configuration
- Audit logging for sensitive operations

Users must not be able to modify data they are not authorized to modify.

---

🧪 Testing

Testing should be performed throughout development.

Frontend Testing

- Component testing
- Form validation
- User interaction testing
- Responsive design testing

Backend Testing

- API testing
- Authentication testing
- Authorization testing
- Database testing
- Result calculation testing

Integration Testing

The complete workflow should be tested:

Login
  ↓
Dashboard
  ↓
Select Student
  ↓
Enter Result
  ↓
Calculate Result
  ↓
Save Result
  ↓
Publish Result
  ↓
Student Views Result

---

🌳 Git & GitHub Workflow

Developers should use Git branches for feature development.

Example:

main
│
└── develop
    │
    ├── feature/student-management
    ├── feature/result-calculation
    ├── feature/student-dashboard
    ├── feature/class-dashboard
    └── feature/authentication

Development Workflow

Create Issue
     ↓
Create Branch
     ↓
Develop Feature
     ↓
Test
     ↓
Commit
     ↓
Push
     ↓
Create Pull Request
     ↓
Code Review
     ↓
Merge

Developers should avoid pushing unfinished features directly to "main".

---

📝 Commit Convention

Use clear and descriptive commit messages.

Examples:

feat: add student result calculation

feat: add class dashboard

fix: resolve result loading issue

fix: correct student authentication

refactor: improve result service

docs: update API documentation

---

🛣️ Development Roadmap

Phase 1 — Planning

- Define requirements
- Define user roles
- Define database structure
- Define grading system
- Define API architecture
- Create UI/UX designs

Phase 2 — Authentication

- Registration
- Login
- Logout
- Role management
- Protected routes

Phase 3 — Student Management

- Student registration
- Student profiles
- Classes
- Sets
- Student assignment

Phase 4 — Result Management

- Subject management
- Score entry
- Result calculation
- Grade calculation
- Result storage
- Result publication

Phase 5 — Dashboards

- School dashboard
- Class dashboard
- Set dashboard
- Student dashboard

Phase 6 — Testing & Security

- Unit testing
- Integration testing
- Security testing
- Performance testing
- Bug fixing
- Code review

Phase 7 — Deployment

- Production database
- Backend deployment
- Frontend deployment
- Environment configuration
- Domain configuration
- Monitoring

---

🤝 Contribution Guidelines

Before submitting code:

- Test your changes locally.
- Follow the project's coding standards.
- Do not commit API keys or secrets.
- Keep pull requests focused.
- Write meaningful commit messages.
- Document major changes.
- Communicate before modifying another developer's feature.
- Ensure your code does not break existing functionality.

---

🌟 Project Vision

The long-term goal is to build a reliable, secure, and scalable digital school platform that simplifies academic administration, provides students with easy access to their results, and gives school administrators useful insights into academic performance.

«Build it clean. Build it securely. Build it to scale.»

---

👥 Development Team

Role| Status
👑 Lead Developer| 🔄 In Development
🎨 UI/UX Designer| 🔄 In Development
💻 Frontend Developer| 🔄 In Development
⚙️ Backend Developer| 🔄 In Development
🔄 Full-Stack Developer| 🔄 In Development

---

📄 License

This project is currently under development.

The licensing terms will be defined by the project owners before public release.
  
