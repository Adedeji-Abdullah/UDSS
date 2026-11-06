export const isStudentRequestAuthorized = (authenticatedStudentId, requestedStudentId) => {
  return authenticatedStudentId === requestedStudentId;
};

export const isTeacherAssignedToSubjectAndClass = (teacherProfile, subjectId, classId) => {
  const hasSubject = teacherProfile?.subjects?.some((id) => id.toString() === subjectId);
  const hasClass = teacherProfile?.classes?.some((id) => id.toString() === classId);
  return Boolean(hasSubject && hasClass);
};
