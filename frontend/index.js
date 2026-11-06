let token=localStorage.getItem("udss_token")||"",me=null,chosen="principal";const $=id=>document.getElementById(id);
function show(id){["home","login","parentRegister","dash"].forEach(x=>$(x).classList.toggle("hidden",x!==id))}
function say(t){$("msg").textContent=t;$("msg").className="on";setTimeout(()=>$("msg").className="",4500)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function api(url,opts={}){let h={"Content-Type":"application/json",...(opts.headers||{})};if(token)h.Authorization="Bearer "+token;let r=await fetch(url,{...opts,headers:h}),d=await r.json().catch(()=>({error:"Invalid server response"}));if(!r.ok)throw Error(d.error||"Request failed");return d}
function loginView(role){
 chosen=role;
 $("loginTitle").textContent=({principal:"Principal / Admin Login",teacher:"Teacher Login",student:"Student Login",parent:"Parent Login"})[role];
 $("idLabel").firstChild.textContent=({principal:"Principal email",teacher:"Teacher Staff ID or Email Address",student:"Student UID",parent:"Parent email"})[role];
 $("identifier").type=(role==="principal"||role==="parent")?"email":"text";
 show("login");
 $("registerParentLink").classList.toggle("hidden",role!=="parent");
 const old=document.getElementById("parentPasskeyLogin");
 if(old) old.remove();
 if(role==="parent"){
   const button=document.createElement("button");
   button.type="button";
   button.id="parentPasskeyLogin";
   button.className="secondary";
   button.textContent="Use Passkey";
   button.onclick=parentPasskeyLogin;
   $("loginForm").appendChild(button);
 }
}
$("loginForm").onsubmit=async e=>{e.preventDefault();try{let d=await api("/api/auth/login",{method:"POST",body:JSON.stringify({role:chosen,identifier:$("identifier").value.trim(),password:$("password").value})});token=d.token;me=d.user;localStorage.setItem("udss_token",token);await dashboard()}catch(e){say(e.message)}};
$("parentRegisterForm").onsubmit=async e=>{
 e.preventDefault();
 const f=e.currentTarget;
 const data=Object.fromEntries(new FormData(f));
 try{
  const d=await api("/api/auth/register-parent",{method:"POST",body:JSON.stringify(data)});
  f.reset();
  loginView("parent");
  say(d.message+" Please sign in.");
 }catch(err){say(err.message)}
};
$("setup").onsubmit=async e=>{e.preventDefault();try{let d=await api("/api/auth/bootstrap-principal",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});token=d.token;me=d.user;localStorage.setItem("udss_token",token);await dashboard()}catch(e){say(e.message)}};
function signout(){token="";me=null;localStorage.removeItem("udss_token");$("logout").classList.add("hidden");show("home");say("Signed out.")}
function stat(n,l){return `<div class="stat"><b>${n}</b>${l}</div>`}
function usersTable(a){return `<div class="tablewrap"><table><tr><th>Name</th><th>Role</th><th>Staff ID / UID</th><th>Email</th></tr>${a.map(u=>`<tr><td>${esc(u.name)}</td><td>${u.role}</td><td>${esc(u.staffId||u.schoolId||"—")}</td><td>${esc(u.email||"—")}</td></tr>`).join("")}</table></div>`}
function resultsTable(a){return `<div class="tablewrap"><table><tr><th>Student</th><th>Subject</th><th>Class</th><th>Session</th><th>Term</th><th>Score</th><th>Status</th></tr>${a.map(x=>`<tr><td>${esc(x.student?.name||x.studentId)}</td><td>${esc(x.subjectId?.name)}</td><td>${esc(x.classId?.name)}</td><td>${esc(x.academicSession)}</td><td>${esc(x.term)}</td><td>${x.score}</td><td>${x.status}</td></tr>`).join("")}</table></div>`}
function postForm(id,url,refresh){let f=$(id);if(!f)return;f.onsubmit=async e=>{e.preventDefault();try{await api(url,{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(f)))});say("Saved successfully.");await refresh()}catch(e){say(e.message)}}}
async function dashboard(){try{if(!me)me=(await api("/api/auth/me")).user;$("welcome").textContent="Welcome, "+me.name;$("role").textContent=me.role;$("logout").classList.remove("hidden");show("dash");if(me.role==="principal")await principal();else if(me.role==="teacher")await teacher();else if(me.role==="parent")await parentDashboard();else await student();if(["principal","teacher","parent"].includes(me.role))await renderInbox()}catch(e){signout();say(e.message)}}
async function principal(){
let [o,u,c,s]=await Promise.all([api("/api/principal/overview"),api("/api/principal/users"),api("/api/principal/classes"),api("/api/principal/subjects")]),ts=u.users.filter(x=>x.role==="teacher"),ss=u.users.filter(x=>x.role==="student");
$("content").innerHTML=`<div class="stats">${stat(o.teachers,"Teachers")}${stat(o.students,"Students")}${stat(o.classes,"Classes")}${stat(o.pendingResults,"Pending results")}</div>
<div class="section"><h3>Create teacher</h3><form id="tf" class="inline"><label>Name<input name="name" required></label><label>Staff ID<input name="staffId" required></label><label>Email optional<input name="email" type="email" autocomplete="off"></label><label>Temporary password (12+ chars)<input name="password" minlength="12" required></label><button class="primary">Create teacher</button></form></div>
<div class="section"><h3>Create student</h3><form id="sf" class="inline"><label>Name<input name="name" required></label><label>Student UID<input name="schoolId" required></label><label>Class<select name="classId" required>${c.classes.map(x=>`<option value="${x._id}">${esc(x.name)}</option>`).join("")}</select></label><label>Temporary password (12+ chars)<input name="password" minlength="12" required></label><button class="primary">Create student</button></form></div>
<div class="section"><h3>Assign class to existing student</h3>
<p>Choose the student's current UID and the class they belong to. This updates their class without creating a new account.</p>
<form id="assignStudentClassForm" class="inline">
<label>Student UID<input name="schoolId" required></label>
<label>Class<select name="classId" required>${c.classes.map(x=>`<option value="${x._id}">${esc(x.name)}</option>`).join("")}</select></label>
<button class="primary">Assign class</button>
</form></div>
<div class="section"><h3>Create class</h3><form id="cf" class="inline"><label>Class name<input name="name" placeholder="JSS 1" required></label><button class="primary">Create class</button></form></div>
<div class="section"><h3>Create subject</h3><form id="subf" class="inline"><label>Subject name<input name="name" required></label><label>Code<input name="code" required></label><label>Class<select name="classId">${c.classes.map(x=>`<option value="${x._id}">${esc(x.name)}</option>`).join("")}</select></label><button class="primary">Create subject</button></form></div>
<div class="section"><h3>Assign form teacher</h3><form id="ftf" class="inline"><label>Class<select name="classId">${c.classes.map(x=>`<option value="${x._id}">${esc(x.name)}</option>`).join("")}</select></label><label>Teacher<select name="teacherId">${ts.map(x=>`<option value="${x.id}">${esc(x.name)} (${esc(x.staffId)})</option>`).join("")}</select></label><button class="primary">Assign</button></form></div>
<div class="section"><h3>Existing teacher and subject IDs</h3>
<p>Copy the exact ID of an existing teacher and an existing subject below.</p>
<h4>Teachers</h4>
<div class="tablewrap"><table><tr><th>Name</th><th>Staff ID</th><th>Teacher MongoDB ID</th></tr>${ts.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.staffId||"—")}</td><td><code>${esc(x.id)}</code></td></tr>`).join("")}</table></div>
<h4>Subjects</h4>
<div class="tablewrap"><table><tr><th>Subject</th><th>Class</th><th>Subject MongoDB ID</th></tr>${s.subjects.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.classId?.name||"—")}</td><td><code>${esc(x._id)}</code></td></tr>`).join("")}</table></div>
</div>
<div class="section"><h3>Assign teacher to subject</h3>
<form id="asf" class="inline">
<label>Teacher MongoDB ID<input name="teacherId" required placeholder="Paste teacher ID"></label>
<label>Subject MongoDB ID<input name="subjectId" required placeholder="Paste subject ID"></label>
<button class="primary">Assign subject</button>
</form></div>

<div class="section"><h3>Continuous Assessment Report</h3>
<p>Review marks saved by teachers. Filter by academic session and term.</p>
<form id="principalAssessmentFilter" class="inline">
<label>Academic session<input name="academicSession" placeholder="2026/2027"></label>
<label>Term<select name="term"><option value="">All terms</option><option>First</option><option>Second</option><option>Third</option></select></label>
<button class="primary">Load assessment report</button>
</form>
<div id="principalAssessments">Select filters and load the report.</div>
</div>
<div class="section"><h3>Accounts</h3>${usersTable([...ts,...ss])}</div><div class="section"><h3>Parent / Guardian Requests</h3>
<p>Review requests to link parents or guardians with students.</p>
<label>Filter requests <select id="parentStatus">
<option value="pending">Pending</option>
<option value="approved">Approved</option>
<option value="rejected">Rejected</option>
</select></label>
<button type="button" class="secondary" id="loadParents">Load requests</button>
<div id="parentRequests"></div></div><p class="note">Important: class-roster membership, password reset, audit logs, full result-sheet generation, backups and production security review must be completed before real school records are entered.</p>`;
const assignClassForm = $("assignStudentClassForm");
if (assignClassForm) {
  assignClassForm.onsubmit = async e => {
    e.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(assignClassForm));
      const result = await api("/api/principal/assign-student-class", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      say(result.message || "Student class assigned.");
      assignClassForm.reset();
    } catch (err) {
      say(err.message);
    }
  };
}
postForm("tf","/api/principal/teachers",principal);postForm("sf","/api/principal/students",principal);postForm("cf","/api/principal/classes",principal);postForm("subf","/api/principal/subjects",principal);postForm("ftf","/api/principal/form-teachers",principal);postForm("asf","/api/principal/teacher-subjects",principal)

const parentStatus = document.getElementById("parentStatus");
const loadParents = document.getElementById("loadParents");

if (parentStatus) {
  parentStatus.onchange = () => loadParentRequests(parentStatus.value);
}
if (loadParents) {
  loadParents.onclick = () => loadParentRequests(
    parentStatus ? parentStatus.value : "pending"
  );
}
loadParentRequests("pending");

const assessmentFilter = document.getElementById("principalAssessmentFilter");
if (assessmentFilter) {
  assessmentFilter.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(assessmentFilter);
    const params = new URLSearchParams();
    if (String(f.get("academicSession")||"").trim())
      params.set("academicSession", String(f.get("academicSession")).trim());
    if (f.get("term")) params.set("term", f.get("term"));
    const target = document.getElementById("principalAssessments");
    target.textContent = "Loading report...";
    try {
      const data = await api("/api/principal/assessments?" + params.toString());
      if (!data.assessments.length) {
        target.textContent = "No saved assessments match these filters.";
        return;
      }
      const keys = [
        ["test1","Test 1"],["test2","Test 2"],["ca1","C/A 1"],
        ["ca2","C/A 2"],["assignment","Assignment"]
      ];
      target.innerHTML = `<p><b>Records found:</b> ${data.count}</p>
      <div class="tablewrap"><table>
      <thead><tr><th>Student</th><th>UID</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Session</th><th>Term</th>${keys.map(k=>`<th>${k[1]}</th>`).join("")}<th>Total</th></tr></thead>
      <tbody>${data.assessments.map(a=>{
        let total=0, maxTotal=0;
        const cells=keys.map(([k])=>{
          const m=a.marks?.[k], mx=a.maximums?.[k]??10;
          if(m!==null&&m!==undefined)total+=m;
          maxTotal+=mx;
          return `<td>${m===null||m===undefined?"—":m} / ${mx}</td>`;
        }).join("");
        return `<tr><td>${esc(a.student?.name||"")}</td><td>${esc(a.student?.schoolId||a.studentId||"")}</td><td>${esc(a.classId?.name||"")}</td><td>${esc(a.subjectId?.name||"")}</td><td>${esc(a.teacher?.name||"")}</td><td>${esc(a.academicSession)}</td><td>${esc(a.term)}</td>${cells}<td>${total} / ${maxTotal}</td></tr>`;
      }).join("")}</tbody></table></div>`;
    } catch(err) {
      target.textContent = err.message;
    }
  };
}


}
async function teacher(){
  let d=await api("/api/teacher/dashboard");
  let r=await api("/api/teacher/results");
  window.udssAssessmentCache={};

  $("content").innerHTML=`
  <div class="section"><h3>Assigned subjects</h3>
  ${d.subjects.length?d.subjects.map(s=>`<p>${esc(s.name)} — ${esc(s.classId?.name)}</p>`).join(""):"No subjects assigned. Ask the principal."}</div>

  <div class="section"><h3>Record continuous assessment</h3>
  <p>Enter a student's UID. Leave an assessment mark blank if it has not been recorded yet. Saving an existing student, subject, session and term updates that record.</p>
  <form id="caf" class="inline">
    <label>Student UID<input name="studentId" required></label>
    <label>Subject ID<input name="subjectId" placeholder="Paste MongoDB subject ID" required></label>
    <label>Academic session<input name="academicSession" placeholder="2026/2027" required></label>
    <label>Term<select name="term"><option>First</option><option>Second</option><option>Third</option></select></label>
    <label>Test 1 mark<input name="test1" type="number" min="0" step="0.1"></label>
    <label>Test 1 maximum<input name="max_test1" type="number" min="0.1" max="100" step="0.1" value="10" required></label>
    <label>Test 2 mark<input name="test2" type="number" min="0" step="0.1"></label>
    <label>Test 2 maximum<input name="max_test2" type="number" min="0.1" max="100" step="0.1" value="10" required></label>
    <label>C/A 1 mark<input name="ca1" type="number" min="0" step="0.1"></label>
    <label>C/A 1 maximum<input name="max_ca1" type="number" min="0.1" max="100" step="0.1" value="10" required></label>
    <label>C/A 2 mark<input name="ca2" type="number" min="0" step="0.1"></label>
    <label>C/A 2 maximum<input name="max_ca2" type="number" min="0.1" max="100" step="0.1" value="10" required></label>
    <label>Assignment mark<input name="assignment" type="number" min="0" step="0.1"></label>
    <label>Assignment maximum<input name="max_assignment" type="number" min="0.1" max="100" step="0.1" value="10" required></label>
    <button class="primary">Save assessment</button>
    <button type="button" id="caClear" class="secondary">Clear form</button>
  </form></div>

  <div class="section"><h3>Class continuous assessment mark sheet</h3>
    <p>Load the selected subject, session and term. Enter marks and adjust maximum scores as needed, then save the sheet.</p>
    <form id="classMarkFilter" class="inline">
      <label>Subject ID<input name="subjectId" placeholder="Paste MongoDB subject ID" required></label>
      <label>Academic session<input name="academicSession" placeholder="2026/2027" required></label>
      <label>Term<select name="term"><option>First</option><option>Second</option><option>Third</option></select></label>
      <button class="secondary" type="submit">Load class sheet</button>
    </form>
    <div id="classMarkStatus">Choose a session and load the class sheet.</div>
    <div id="classMarkSheet"></div>
    <button id="saveClassMarks" class="primary" type="button" disabled>Save class marks to database</button>
  </div>

  <div class="section"><h3>Saved assessment records</h3>
    <p>Choose the subject, session and term, then load saved records.</p>
    <form id="caFilter" class="inline">
      <label>Subject ID<input name="subjectId" placeholder="Paste MongoDB subject ID" required></label>
      <label>Academic session<input name="academicSession" placeholder="2026/2027" required></label>
      <label>Term<select name="term"><option>First</option><option>Second</option><option>Third</option></select></label>
      <button class="secondary">Load records</button>
    </form>
    <div id="caRecords">Choose a session and load records.</div>
  </div>

  <div class="section"><h3>Submit result for approval</h3>
    <form id="rf" class="inline">
      <label>Student UID<input name="studentId" required></label>
      <label>Subject<select name="subjectId">${d.subjects.map(s=>`<option value="${s._id}">${esc(s.name)} — ${esc(s.classId?.name)}</option>`).join("")}</select></label>
      <label>Academic session<input name="academicSession" placeholder="2026/2027" required></label>
      <label>Term<select name="term"><option>First</option><option>Second</option><option>Third</option></select></label>
      <label>Score 0–100<input name="score" type="number" min="0" max="100" required></label>
      <button class="primary">Submit for review</button>
    </form>
  </div>
  <div class="section"><h3>Submitted results</h3>${resultsTable(r.results)}</div>
  <div class="section"><h3>Form-teacher review queue</h3><button id="loadq" class="secondary">Load review queue</button><div id="queue"></div></div>`;

  postForm("rf","/api/teacher/results",teacher);

  const caf=$("caf");
  caf.onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(caf);
    const marks={},maximums={};
    for(const k of ["test1","test2","ca1","ca2","assignment"]){
      marks[k]=f.get(k);
      maximums[k]=f.get("max_"+k);
    }
    try{
      const result=await api("/api/teacher/assessments",{
        method:"POST",
        body:JSON.stringify({
          studentId:f.get("studentId"),
          subjectId:f.get("subjectId"),
          academicSession:f.get("academicSession"),
          term:f.get("term"),
          marks,maximums
        })
      });
      say(result.message||"Assessment saved.");
      const filter=$("caFilter");
      filter.elements.subjectId.value=f.get("subjectId");
      filter.elements.academicSession.value=f.get("academicSession");
      filter.elements.term.value=f.get("term");
      await loadAssessmentRecords();
    }catch(e){say(e.message)}
  };

  $("caClear").onclick=()=>caf.reset();
  $("caFilter").onsubmit=async e=>{
    e.preventDefault();
    await loadAssessmentRecords();
  };

  const classMarkFilter=$("classMarkFilter");
  const classMarkSheet=$("classMarkSheet");
  const classMarkStatus=$("classMarkStatus");
  const classKeys=["test1","test2","ca1","ca2","assignment"];
  const classLabels={
    test1:"Test 1",test2:"Test 2",ca1:"C/A 1",
    ca2:"C/A 2",assignment:"Assignment"
  };

  classMarkFilter.onsubmit=async e=>{
    e.preventDefault();
    const f=classMarkFilter;
    const subjectId=f.elements.subjectId.value;
    const academicSession=f.elements.academicSession.value.trim();
    const term=f.elements.term.value;
    const saveButton=$("saveClassMarks");
    saveButton.disabled=true;
    classMarkSheet.innerHTML="";
    classMarkStatus.textContent="Loading students and saved marks...";

    try{
      const query=new URLSearchParams({subjectId,academicSession,term});
      const [roster,data]=await Promise.all([
        api("/api/teacher/assessment-roster?"+new URLSearchParams({subjectId})),
        api("/api/teacher/assessments?"+query.toString())
      ]);

      const savedByUid={};
      for(const a of data.assessments){
        const uid=a.student?.schoolId||a.studentId;
        if(uid)savedByUid[uid]=a;
      }

      if(!roster.students.length){
        classMarkStatus.textContent=
          "No students found in "+roster.subject.className+
          ". Ask the principal to assign students to this class and check the subject's class assignment.";
        return;
      }

      classMarkSheet.innerHTML=`<div class="tablewrap"><table>
        <thead><tr><th>Student</th><th>UID</th>
        ${classKeys.map(k=>`<th>${classLabels[k]} mark / maximum</th>`).join("")}
        <th>Total</th></tr></thead><tbody>
        ${roster.students.map(student=>{
          const a=savedByUid[student.schoolId];
          const marks=a?.marks||{};
          const maximums=a?.maximums||{};
          return `<tr data-uid="${esc(student.schoolId)}" data-existing="${a?"yes":"no"}">
            <td>${esc(student.name)}</td><td>${esc(student.schoolId)}</td>
            ${classKeys.map(k=>`<td>
              <input aria-label="${classLabels[k]} mark for ${esc(student.name)}" data-mark="${k}" type="number" min="0" step="0.1" value="${marks[k]??""}" style="width:78px">
              /
              <input aria-label="${classLabels[k]} maximum for ${esc(student.name)}" data-max="${k}" type="number" min="0.1" max="100" step="0.1" value="${maximums[k]??10}" style="width:70px">
            </td>`).join("")}
            <td data-total>—</td>
          </tr>`;
        }).join("")}
        </tbody></table></div>`;

      for(const row of classMarkSheet.querySelectorAll("tbody tr")){
        const updateTotal=()=>{
          let total=0,maxTotal=0,entered=false,valid=true;
          for(const k of classKeys){
            const markInput=row.querySelector(`[data-mark="${k}"]`);
            const maxInput=row.querySelector(`[data-max="${k}"]`);
            const raw=markInput.value;
            const max=Number(maxInput.value);
            if(!Number.isFinite(max)||max<=0||max>100){
              valid=false;
              continue;
            }
            maxTotal+=max;
            if(raw!==""){
              const mark=Number(raw);
              if(!Number.isFinite(mark)||mark<0||mark>max){
                valid=false;
              }else{
                total+=mark;
                entered=true;
              }
            }
          }
          row.querySelector("[data-total]").textContent=
            valid?(entered?`${total} / ${maxTotal}`:`— / ${maxTotal}`):"Check marks";
          return valid;
        };
        row._updateClassTotal=updateTotal;
        row.querySelectorAll("input").forEach(input=>{
          input.addEventListener("input",updateTotal);
        });
        updateTotal();
      }

      classMarkStatus.textContent=
        `${roster.students.length} students loaded for ${roster.subject.name} — ${roster.subject.className}.`;
      saveButton.disabled=false;
    }catch(err){
      classMarkStatus.textContent=err.message;
    }
  };

  $("saveClassMarks").onclick=async()=>{
    const f=classMarkFilter;
    const subjectId=f.elements.subjectId.value;
    const academicSession=f.elements.academicSession.value.trim();
    const term=f.elements.term.value;
    const rows=[...classMarkSheet.querySelectorAll("tbody tr")];
    if(!rows.length)return;

    for(const row of rows){
      if(!row._updateClassTotal || !row._updateClassTotal()){
        say("Please correct invalid marks or maximum scores before saving.");
        return;
      }
    }

    const toSave=rows.filter(row=>
      row.dataset.existing==="yes" ||
      classKeys.some(k=>row.querySelector(`[data-mark="${k}"]`).value!=="")
    );
    if(!toSave.length){
      say("Enter at least one mark before saving.");
      return;
    }

    const button=$("saveClassMarks");
    button.disabled=true;
    classMarkStatus.textContent=`Saving 0 of ${toSave.length} student records...`;

    try{
      let saved=0;
      for(const row of toSave){
        const marks={},maximums={};
        for(const k of classKeys){
          marks[k]=row.querySelector(`[data-mark="${k}"]`).value;
          maximums[k]=row.querySelector(`[data-max="${k}"]`).value;
        }
        await api("/api/teacher/assessments",{
          method:"POST",
          body:JSON.stringify({
            studentId:row.dataset.uid,subjectId,academicSession,term,marks,maximums
          })
        });
        row.dataset.existing="yes";
        saved++;
        classMarkStatus.textContent=`Saving ${saved} of ${toSave.length} student records...`;
      }

      classMarkStatus.textContent=
        `Saved ${saved} student records to MongoDB.`;
      say("Class marks saved successfully.");
      await loadAssessmentRecords();
    }catch(err){
      classMarkStatus.textContent=
        `Save stopped after some records may have been saved: ${err.message}. You can safely save again.`;
    }finally{
      button.disabled=false;
    }
  };

  window.editAssessment=function(id){
    const a=window.udssAssessmentCache[id];
    if(!a)return;
    const f=$("caf");
    f.elements.studentId.value=a.student?.schoolId||a.studentId||"";
    f.elements.subjectId.value=a.subjectId?._id||a.subjectId||"";
    f.elements.academicSession.value=a.academicSession||"";
    f.elements.term.value=a.term||"First";
    for(const k of ["test1","test2","ca1","ca2","assignment"]){
      f.elements[k].value=a.marks?.[k]??"";
      f.elements["max_"+k].value=a.maximums?.[k]??10;
    }
    f.scrollIntoView({behavior:"smooth",block:"start"});
    say("Record loaded into the form. Save assessment to update it.");
  };

  async function loadAssessmentRecords(){
    const f=$("caFilter");
    const q=new URLSearchParams({
      subjectId:f.elements.subjectId.value,
      academicSession:f.elements.academicSession.value.trim(),
      term:f.elements.term.value
    });
    const target=$("caRecords");
    target.textContent="Loading records...";
    try{
      const data=await api("/api/teacher/assessments?"+q.toString());
      window.udssAssessmentCache={};
      if(!data.assessments.length){
        target.textContent="No records found for these filters yet.";
        return;
      }
      target.innerHTML=`<div class="tablewrap"><table>
      <thead><tr><th>Student</th><th>UID</th><th>Test 1</th><th>Test 2</th><th>C/A 1</th><th>C/A 2</th><th>Assignment</th><th>Total</th><th>Action</th></tr></thead>
      <tbody>${data.assessments.map(a=>{
        window.udssAssessmentCache[a._id]=a;
        const keys=["test1","test2","ca1","ca2","assignment"];
        let total=0,maxTotal=0;
        const cells=keys.map(k=>{
          const mark=a.marks?.[k],max=a.maximums?.[k]??10;
          if(mark!==null&&mark!==undefined)total+=mark;
          maxTotal+=max;
          return `<td>${mark===null||mark===undefined?"—":mark} / ${max}</td>`;
        }).join("");
        return `<tr><td>${esc(a.student?.name||"")}</td><td>${esc(a.student?.schoolId||a.studentId||"")}</td>${cells}<td>${total} / ${maxTotal}</td><td><button type="button" class="secondary" onclick="editAssessment('${a._id}')">Edit</button></td></tr>`;
      }).join("")}</tbody></table></div>`;
    }catch(e){target.textContent=e.message}
  }

  $("loadq").onclick=async()=>{
    try{
      let x=await api("/api/form-teacher/results");
      $("queue").innerHTML=x.results.map(a=>`<p>${esc(a.student?.name)} — ${esc(a.subjectId?.name)} — ${a.score} — ${a.status}<br><small>${a._id}</small> ${a.status==="PENDING"?`<button class="primary" onclick="review('${a._id}','APPROVED')">Approve</button> <button class="secondary" onclick="review('${a._id}','REJECTED')">Reject</button>`:""}</p>`).join("")||"No results in queue.";
    }catch(e){say(e.message)}
  };
}
async function review(id,decision){try{await api("/api/form-teacher/results/"+id+"/review",{method:"POST",body:JSON.stringify({decision})});say("Review saved.");let b=$("loadq");if(b)b.click()}catch(e){say(e.message)}}
async function student(){let [p,r]=await Promise.all([api("/api/student/profile"),api("/api/student/results")]);$("content").innerHTML=`<h2>Student profile</h2><div class="section"><p><b>Name:</b> ${esc(p.user.name)}</p><p><b>UID:</b> ${esc(p.user.schoolId)}</p><p><b>Class:</b> ${esc(p.classroom?.name||"No class assigned yet")}</p></div><div class="section"><h3>Your subjects</h3>${p.subjects?.length?p.subjects.map(s=>`<p>${esc(s.name)} (${esc(s.code)})</p>`).join(""):"No subjects assigned to your class yet."}</div><div class="section"><h3>Your approved results</h3>${r.results.length?resultsTable(r.results):"No approved results available yet."}</div>`}


async function parentPasskeyLogin() {
  try {
    if (!window.UDSSPasskeys) throw Error("Passkey library did not load. Refresh the page.");
    const email = $("identifier").value.trim().toLowerCase();
    if (!email) throw Error("Enter your parent email first.");

    const data = await api("/api/auth/passkey/login-options", {
      method:"POST",
      body:JSON.stringify({email})
    });

    const response = await UDSSPasskeys.startAuthentication({
      optionsJSON:data.options
    });

    const result = await api("/api/auth/passkey/login-verify", {
      method:"POST",
      body:JSON.stringify({email,response})
    });

    token = result.token;
    me = result.user;
    localStorage.setItem("udss_token", token);
    await dashboard();
  } catch(e) {
    say(e.message || "Passkey login failed.");
  }
}

async function registerParentPasskey() {
  try {
    if (!window.UDSSPasskeys) throw Error("Passkey library did not load. Refresh the page.");

    const data = await api("/api/auth/passkey/register-options", {
      method:"POST",
      body:"{}"
    });

    const response = await UDSSPasskeys.startRegistration({
      optionsJSON:data.options
    });

    const result = await api("/api/auth/passkey/register-verify", {
      method:"POST",
      body:JSON.stringify(response)
    });

    say(result.message || "Passkey registered successfully.");
  } catch(e) {
    say(e.message || "Passkey registration failed.");
  }
}

async function parentDashboard() {
  $("content").innerHTML = `
    <div class="section">
      <h3>Parent Profile</h3>
      <p><b>Name:</b> ${esc(me.name)}</p>
      <p><b>Email:</b> ${esc(me.email || "Not provided")}</p>
      <p>Use the inbox below to contact the school.</p>
      <button type="button" class="secondary" id="registerParentPasskey">Register Device Passkey</button>
      <p class="note">Use your device fingerprint, face verification or screen lock when supported.</p>
    </div>`;
  $("registerParentPasskey").onclick = registerParentPasskey;
}

async function renderInbox() {
  if ($("udssInbox")) return;
  try {
    if (me.role === "parent" || me.role === "teacher") {
      await api("/api/presence/heartbeat", {
        method: "POST",
        body: "{}"
      }).catch(() => {});
      if (!window.udssPresenceTimer) {
        window.udssPresenceTimer = setInterval(() => {
          if (token && me && ["parent", "teacher"].includes(me.role)) {
            api("/api/presence/heartbeat", {
              method: "POST",
              body: "{}"
            }).catch(() => {});
          }
        }, 30000);
      }
    }

    const c = await api("/api/messages/contacts");
    const contacts = c.contacts || [];
    let onlineUsers = [];

    if (me.role === "principal") {
      try {
        const online = await api("/api/presence/online");
        onlineUsers = online.users || [];
      } catch (err) {
        console.error("Could not load online users:", err.message);
      }
    }

    const onlinePanel = me.role === "principal" ? `
      <h3>Parents and Teachers Online</h3>
      <div id="inboxOnline">
        ${onlineUsers.length
          ? onlineUsers.map(u => `<p>${esc(u.name)} — ${esc(u.role)} · Online</p>`).join("")
          : "<p>No parents or teachers currently online.</p>"}
      </div>
    ` : "";

    $("content").insertAdjacentHTML("beforeend", `
      <div class="section" id="udssInbox">
        <h3>Inbox</h3>
        <label>Choose contact
          <select id="inboxContact">
            <option value="">Select a contact</option>
            ${contacts.map(u =>
              `<option value="${esc(u.id)}">${esc(u.name)} — ${esc(u.role)}</option>`
            ).join("")}
          </select>
        </label>
        <div id="inboxMessages" class="section">Choose a contact to open a conversation.</div>
        <form id="inboxSend" class="inline">
          <label>Message
            <input id="inboxBody" maxlength="2000" required placeholder="Write a message">
          </label>
          <button class="primary" type="submit">Send message</button>
        </form>
        <p id="inboxStatus"></p>
${onlinePanel}
      </div>
    `);

    const picker = $("inboxContact");
    const messageBox = $("inboxMessages");
    const form = $("inboxSend");
    const status = $("inboxStatus");

    async function loadConversation() {
      if (!picker.value) {
        messageBox.textContent = "Choose a contact to open a conversation.";
        return;
      }
      try {
        const d = await api("/api/messages/" + encodeURIComponent(picker.value));
        messageBox.innerHTML = (d.messages || []).map(m => `
          <p><b>${String(m.sender) === String(me.id) ? "You" : esc(d.contact.name)}:</b>
          ${esc(m.body)} <small>${esc(new Date(m.createdAt).toLocaleString())}</small></p>
        `).join("") || "<p>No messages yet. Start the conversation.</p>";
        messageBox.scrollTop = messageBox.scrollHeight;
      } catch (e) {
        status.textContent = e.message;
      }
    }

    picker.onchange = loadConversation;

    form.onsubmit = async e => {
      e.preventDefault();
      const body = $("inboxBody").value.trim();
      if (!picker.value) {
        status.textContent = "Choose a contact first.";
        return;
      }
      if (!body) return;
      try {
        await api("/api/messages/" + encodeURIComponent(picker.value), {
          method: "POST",
          body: JSON.stringify({body})
        });
        $("inboxBody").value = "";
        status.textContent = "Message sent.";
        await loadConversation();
      } catch (e) {
        status.textContent = e.message;
      }
    };
  } catch (e) {
    say("Inbox: " + e.message);
  }
}


if(token)dashboard();else show("home");

function togglePassword(button) {
  const input = button.parentElement.querySelector("input");
  const showing = input.type === "password";

  input.type = showing ? "text" : "password";

  button.innerHTML = showing
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A11 11 0 0112 5c5 0 9 5 9 7a10 10 0 01-3 4.2M6.2 6.2C3.9 7.7 3 10 3 12c0 1.2 1.5 3.4 3.8 5.1A10.8 10.8 0 0012 19c1.1 0 2.1-.2 3-.6"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

  button.setAttribute("aria-label", showing ? "Hide password" : "Show password");
}

async function loadParentRequests(status = "pending") {
  try {
    const data = await api("/api/principal/parent-links?status=" + encodeURIComponent(status));
    const box = document.getElementById("parentRequests");
    if (!box) return;

    box.innerHTML = data.links.length
      ? data.links.map(link => `
        <div class="section">
          <p><b>Parent:</b> ${esc(link.parent?.name || "Unknown")}</p>
          <p><b>Email:</b> ${esc(link.parent?.email || "Not provided")}</p>
          <p><b>Phone:</b> ${esc(link.parent?.phone || "Not provided")}</p>
          <p><b>Student:</b> ${esc(link.student?.name || "Unknown")} (${esc(link.student?.schoolId || "No UID")})</p>
          <p><b>Relationship:</b> ${esc(link.relationship)}</p>
          <p><b>Status:</b> ${esc(link.status)}</p>
          ${link.status === "pending" ? `
            <button class="primary" onclick="reviewParentLink('${link._id}', 'approved')">Approve</button>
            <button class="secondary" onclick="reviewParentLink('${link._id}', 'rejected')">Reject</button>
          ` : ""}
        </div>
      `).join("")
      : "<p>No " + esc(status) + " parent requests found.</p>";
  } catch (e) {
    say("Parent requests: " + e.message);
  }
}

async function reviewParentLink(id, decision) {
  if (!confirm("Are you sure you want to " + decision + " this parent relationship?")) return;

  try {
    const result = await api("/api/principal/parent-links/" + encodeURIComponent(id) + "/review", {
      method: "POST",
      body: JSON.stringify({ decision })
    });
    say(result.message || "Parent relationship updated.");
    await loadParentRequests("pending");
  } catch (e) {
    say(e.message);
  }
}
