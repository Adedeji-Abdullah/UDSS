# UDSS School Portal — application starter

Includes a responsive UDSS-branded frontend, Node.js/Express API, MongoDB models, bcrypt password hashing, expiring JWT authentication, role checks, principal account setup, teacher/student account creation, classes, subjects, teacher assignments, result submission, form-teacher review, and student-only approved-result access.

## Requirements
Node.js 20+, npm, and a MongoDB database (for example MongoDB Atlas).

## Install
1. Extract the folder.
2. Copy `.env.example` to `.env`.
3. Fill in `MONGODB_URI`, `JWT_SECRET` (at least 32 characters), and a private `BOOTSTRAP_KEY`.
4. Run `npm install`
5. Run `npm start`
6. Open `http://127.0.0.1:3000`

Principal uses email + password; teachers use staff ID + password; students use UID + password. The first principal setup needs the private setup key and becomes disabled after a principal is created. Never share `.env`, passwords or setup keys.

## Must be completed before school-wide production use
This is a real backend-connected starter, but it is NOT yet production-ready. In particular, student-to-class roster membership is not implemented, so teacher result submission must not be used with real school records yet. Add and enforce roster validation; password reset/change; audit logs; full result-sheet calculation/printing and grading rules; term/session controls; tests; HTTPS deployment; backups/restore; monitoring; and a security review. Use synthetic test accounts until your school/team approves the system.

## API highlights
`POST /api/auth/bootstrap-principal`, `POST /api/auth/login`, `GET /api/auth/me`; principal endpoints under `/api/principal`; teacher endpoints under `/api/teacher`; form-teacher review under `/api/form-teacher`; student endpoints under `/api/student`; `GET /api/health`.

Work with your programming group using Git branches and code review. Never commit `.env` or credentials.
