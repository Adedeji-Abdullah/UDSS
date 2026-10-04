const state = {
  token: localStorage.getItem("udssToken") || "",
  user: JSON.parse(localStorage.getItem("udssUser") || "null"),
};

const elements = {
  authScreen: document.getElementById("authScreen"),
  dashboardScreen: document.getElementById("dashboardScreen"),
  loginForm: document.getElementById("loginForm"),
  bootstrapForm: document.getElementById("bootstrapForm"),
  badge: document.getElementById("userRoleBadge"),
  userName: document.getElementById("userName"),
  logoutBtn: document.getElementById("logoutBtn"),
  roleTabs: document.querySelectorAll(".role-tab"),
  rolePanels: {
    principal: document.getElementById("principalPanel"),
    teacher: document.getElementById("teacherPanel"),
    student: document.getElementById("studentPanel"),
  },
  principalStats: document.getElementById("principalStats"),
  teacherStats: document.getElementById("teacherStats"),
  studentProfile: document.getElementById("studentProfile"),
  studentResults: document.getElementById("studentResults"),
  studentLeaderboard: document.getElementById("studentLeaderboard"),
  teacherResults: document.getElementById("teacherResults"),
  notice: document.getElementById("notice"),
  createTeacherForm: document.getElementById("createTeacherForm"),
  createStudentForm: document.getElementById("createStudentForm"),
  createClassForm: document.getElementById("createClassForm"),
  createSubjectForm: document.getElementById("createSubjectForm"),
  uploadResultForm: document.getElementById("uploadResultForm"),
  reviewResultForm: document.getElementById("reviewResultForm"),
  generateSheetForm: document.getElementById("generateSheetForm"),
};

const API_BASE = "/api";

function showNotice(message, type = "success") {
  elements.notice.textContent = message;
  elements.notice.className = `notice ${type}`;
  elements.notice.classList.remove("hidden");
}

function formatRole(role) {
  return role ? role.toUpperCase() : "USER";
}

function setLoggedInUI() {
  elements.authScreen.classList.add("hidden");
  elements.dashboardScreen.classList.remove("hidden");
  elements.userName.textContent = state.user?.name || "User";
  elements.badge.textContent = formatRole(state.user?.role);
  elements.logoutBtn.classList.remove("hidden");
}

function setLoggedOutUI() {
  elements.authScreen.classList.remove("hidden");
  elements.dashboardScreen.classList.add("hidden");
  localStorage.removeItem("udssToken");
  localStorage.removeItem("udssUser");
  state.token = "";
  state.user = null;
  elements.logoutBtn.classList.add("hidden");
  elements.notice.classList.add("hidden");
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.body && !options.headers?.["Content-Type"] ? { "Content-Type": "application/json" } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function renderStats(container, stats) {
  if (!stats) {
    container.innerHTML = "<p>No stats available.</p>";
    return;
  }

  const items = Object.entries(stats)
    .map(([label, value]) => {
      const displayLabel = label
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (char) => char.toUpperCase());

      return `
        <div class="stat-card">
          <span class="label">${displayLabel}</span>
          <span class="value">${value}</span>
        </div>
      `;
    })
    .join("");

  container.innerHTML = items;
}

function renderResultRows(container, results, emptyMessage = "No results found.") {
  if (!results || !results.length) {
    container.innerHTML = `<p>${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = results
    .map((result) => {
      const subjectName = result.subject?.name || result.subject || result.name || "Subject";
      const score = result.score ?? "N/A";
      const status = (result.status || "PENDING").toUpperCase();
      const className = result.class?.name || "Class";
      const subjectLabel = result.subject?.name ? `${result.subject.name}` : subjectName;

      return `
        <li>
          <div>
            <strong>${subjectLabel}</strong><br />
            <small>${className}</small>
          </div>
          <div class="score-status">
            <span>${score}</span>
            <span class="badge ${status.toLowerCase()}">${status}</span>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderRoleTabs() {
  const currentRole = state.user?.role;

  elements.roleTabs.forEach((tab) => {
    const tabRole = tab.dataset.role;
    const isCurrentRole = tabRole === currentRole;
    const isAllowed = !currentRole || tabRole === currentRole;

    tab.classList.toggle("active", isCurrentRole);
    tab.disabled = !isAllowed;
    tab.style.display = currentRole ? (isAllowed ? "inline-flex" : "none") : "inline-flex";
  });
}

function renderStudentProfile(profile) {
  const profileData = profile?.studentProfile || profile;
  if (!profileData) {
    elements.studentProfile.innerHTML = "<p>No student profile.</p>";
    return;
  }

  const studentUser = profileData.user || {};
  const className = profileData.class?.name || "N/A";

  elements.studentProfile.innerHTML = `
    <ul class="list detail-list">
      <li><span>Name</span><span>${studentUser.name || "Unknown"}</span></li>
      <li><span>Student ID</span><span>${profileData.studentId || "N/A"}</span></li>
      <li><span>Class</span><span>${className}</span></li>
      <li><span>Email</span><span>${studentUser.email || "N/A"}</span></li>
    </ul>
  `;
}

function renderLeaderboard(list, currentStudent = null) {
  if (!list || !list.length) {
    elements.studentLeaderboard.innerHTML = "<li class='leaderboard-empty'>No approved results yet.</li>";
    return;
  }

  elements.studentLeaderboard.innerHTML = list
    .map((entry, index) => {
      const isCurrent = currentStudent && entry.studentId === currentStudent.studentId;
      const extraClass = isCurrent ? "leaderboard-item current" : "leaderboard-item";
      return `
        <li class="${extraClass}">
          <span class="leaderboard-rank">#${index + 1}</span>
          <div class="leaderboard-meta">
            <strong>${entry.name}</strong>
            <small>${entry.className}</small>
          </div>
          <span class="leaderboard-score">${entry.average}%</span>
        </li>
      `;
    })
    .join("");

  if (currentStudent) {
    const currentLine = document.createElement("li");
    currentLine.className = "leaderboard-current-summary";
    currentLine.innerHTML = `You are ranked <strong>#${currentStudent.rank}</strong> with an average of <strong>${currentStudent.average}%</strong>.`;
    elements.studentLeaderboard.appendChild(currentLine);
  }
}

function updateRolePanels() {
  const role = state.user?.role;
  Object.entries(elements.rolePanels).forEach(([key, panel]) => {
    const isAllowed = !role || key === role;
    panel.classList.toggle("hidden", !isAllowed);
  });
}

async function loadPrincipalDashboard() {
  try {
    const data = await apiRequest("/principal/dashboard");
    renderStats(elements.principalStats, data.stats);
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function loadTeacherDashboard() {
  try {
    const data = await apiRequest("/teacher/dashboard");
    const resultData = await apiRequest("/teacher/results");
    renderStats(elements.teacherStats, data.summary || {});
    renderResultRows(elements.teacherResults, resultData.results || [], "No uploaded results yet.");
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function loadStudentDashboard() {
  try {
    const profile = await apiRequest("/student/profile");
    const results = await apiRequest("/student/results");
    const leaderboardData = await apiRequest("/student/leaderboard");
    renderStudentProfile(profile);
    renderResultRows(elements.studentResults, results.results || [], "No result records yet.");

    const leaderboard = (leaderboardData.leaderboard || []).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
    const currentStudent = leaderboardData.currentStudent
      ? { ...leaderboardData.currentStudent, rank: leaderboardData.currentRank }
      : null;

    renderLeaderboard(leaderboard, currentStudent);
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function loadDashboardForRole() {
  if (!state.user) return;
  updateRolePanels();

  if (state.user.role === "principal") {
    await loadPrincipalDashboard();
  }

  if (state.user.role === "teacher") {
    await loadTeacherDashboard();
  }

  if (state.user.role === "student") {
    await loadStudentDashboard();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const identifier = formData.get("identifier");
  const password = formData.get("password");

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("udssToken", state.token);
    localStorage.setItem("udssUser", JSON.stringify(state.user));
    setLoggedInUI();
    renderRoleTabs();
    await loadDashboardForRole();
    showNotice(`${formatRole(state.user.role)} dashboard loaded successfully.`, "success");
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function handleBootstrap(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const response = await fetch(`${API_BASE}/auth/bootstrap-principal`, {
      method: "POST",
      headers: {
        "x-bootstrap-secret": formData.get("secret") || "udss-bootstrap",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Bootstrap failed.");
    }

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("udssToken", state.token);
    localStorage.setItem("udssUser", JSON.stringify(state.user));
    setLoggedInUI();
    renderRoleTabs();
    await loadDashboardForRole();
    showNotice("Principal account created successfully.", "success");
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function handlePrincipalCreateTeacher(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    subjectIds: (formData.get("subjectIds") || "").split(",").map((id) => id.trim()).filter(Boolean),
    classIds: (formData.get("classIds") || "").split(",").map((id) => id.trim()).filter(Boolean),
  };

  try {
    const data = await apiRequest("/principal/teachers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showNotice(data.message || "Teacher created successfully.", "success");
    event.currentTarget.reset();
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function handlePrincipalCreateStudent(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    classId: formData.get("classId"),
    subjectIds: (formData.get("subjectIds") || "").split(",").map((id) => id.trim()).filter(Boolean),
  };

  try {
    const data = await apiRequest("/principal/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showNotice(data.message || "Student created successfully.", "success");
    event.currentTarget.reset();
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function handleCreateClass(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const data = await apiRequest("/principal/classes", {
      method: "POST",
      body: JSON.stringify({ name: formData.get("name") }),
    });
    showNotice(data.message || "Class created successfully.", "success");
    event.currentTarget.reset();
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function handleCreateSubject(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const data = await apiRequest("/principal/subjects", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        code: formData.get("code"),
        isElective: formData.get("isElective") === "on",
      }),
    });
    showNotice(data.message || "Subject created successfully.", "success");
    event.currentTarget.reset();
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function handleUploadResult(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const entries = JSON.parse(formData.get("entries") || "[]");
    const data = await apiRequest("/teacher/results", {
      method: "POST",
      body: JSON.stringify({
        classId: formData.get("classId"),
        subjectId: formData.get("subjectId"),
        academicSession: formData.get("academicSession"),
        term: formData.get("term"),
        entries,
      }),
    });
    showNotice(data.message || "Results uploaded successfully.", "success");
    event.currentTarget.reset();
    await loadTeacherDashboard();
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function handleReviewResult(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const resultId = formData.get("resultId");
  const status = formData.get("status");

  try {
    const data = await apiRequest(`/form-teacher/results/${resultId}/review`, {
      method: "POST",
      body: JSON.stringify({
        status,
        comments: formData.get("comments") || "",
      }),
    });
    showNotice(data.message || "Result reviewed successfully.", "success");
    event.currentTarget.reset();
    await loadTeacherDashboard();
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function handleGenerateSheets(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const data = await apiRequest("/form-teacher/generate-result-sheets", {
      method: "POST",
      body: JSON.stringify({
        classId: formData.get("classId"),
        academicSession: formData.get("academicSession"),
        term: formData.get("term"),
      }),
    });
    showNotice(data.message || "Sheets generated successfully.", "success");
    event.currentTarget.reset();
  } catch (error) {
    showNotice(error.message, "error");
  }
}

async function init() {
  if (state.token && state.user) {
    setLoggedInUI();
    renderRoleTabs();
    await loadDashboardForRole();
  } else {
    setLoggedOutUI();
  }

  elements.loginForm.addEventListener("submit", handleLogin);
  elements.bootstrapForm.addEventListener("submit", handleBootstrap);
  elements.logoutBtn.addEventListener("click", setLoggedOutUI);
  elements.createTeacherForm.addEventListener("submit", handlePrincipalCreateTeacher);
  elements.createStudentForm.addEventListener("submit", handlePrincipalCreateStudent);
  elements.createClassForm.addEventListener("submit", handleCreateClass);
  elements.createSubjectForm.addEventListener("submit", handleCreateSubject);
  elements.uploadResultForm.addEventListener("submit", handleUploadResult);
  elements.reviewResultForm.addEventListener("submit", handleReviewResult);
  elements.generateSheetForm.addEventListener("submit", handleGenerateSheets);

  elements.roleTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!state.user) return;
      const role = tab.dataset.role;

      if (state.user.role !== role) {
        return;
      }

      Object.entries(elements.rolePanels).forEach(([key, panel]) => {
        panel.classList.toggle("hidden", key !== role);
      });
    });
  });
}

init();
