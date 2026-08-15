// server/entry.js

function onOpen() {
  globalThis._onOpen();
}
function generateStudentReport() {
  globalThis._generateStudentReport();
}
function generateClassReports() {
  globalThis._generateClassReports();
}
function getStudentsDataForClass(year, cls) {
  return globalThis._getStudentsDataForClass(year, cls);
}
function executeClassReportsGeneration(year, cls) {
  globalThis._executeClassReportsGeneration(year, cls);
}
function continueClassReportsGeneration() {
  globalThis._continueClassReportsGeneration();
}
function cancelClassReportsGeneration() {
  globalThis._cancelClassReportsGeneration();
}
function executeStudentReportGeneration(year, cls, id) {
  globalThis._executeStudentReportGeneration(year, cls, id);
}
function checkSystem() {
  globalThis._checkSystem();
}
function openStudentSearchDialog() {
  globalThis._openStudentSearchDialog();
}
function openStudentCreationDialog() {
  globalThis._openStudentCreationDialog();
}
function openStudentEditDialog(id) {
  globalThis._openStudentEditDialog(id);
}
function getStudentSearchResults(query, status) {
  return globalThis._getStudentSearchResults(query, status);
}
function getStudentDetailsForSearch(id) {
  return globalThis._getStudentDetailsForSearch(id);
}
function getStudentForEditForm(id) {
  return globalThis._getStudentForEditForm(id);
}
function submitStudentRegistration(payload) {
  return globalThis._submitStudentRegistration(payload);
}
function submitStudentEdit(id, payload) {
  globalThis._submitStudentEdit(id, payload);
}
function openCreateSchoolYearFormDialog() {
  globalThis._openCreateSchoolYearFormDialog();
}
function submitSchoolYearCreation(year, matriculations) {
  globalThis._submitSchoolYearCreation(year, matriculations);
}
