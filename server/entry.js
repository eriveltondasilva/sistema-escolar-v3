// server/entry.js

function onOpen() {
  globalThis._onOpen();
}
//
function openStudentSearchDialog() {
  globalThis._openStudentSearchDialog();
}
function openStudentCreationDialog() {
  globalThis._openStudentCreationDialog();
}
function openStudentEditDialog(id) {
  globalThis._openStudentEditDialog(id);
}
function openCreateSchoolYearFormDialog() {
  globalThis._openCreateSchoolYearFormDialog();
}
//
function checkSystem() {
  globalThis._checkSystem();
}
//
function generateStudentReport() {
  globalThis._generateStudentReport();
}
function generateClassReports() {
  globalThis._generateClassReports();
}
function getStudentsDataForClass(year, cls) {
  return globalThis._getStudentsDataForClass(year, cls);
}
//
function getStudentSearchResults(query, status) {
  return globalThis._getStudentSearchResults(query, status);
}
function getStudentDetailsForSearch(id) {
  return globalThis._getStudentDetailsForSearch(id);
}
function getStudentForEditForm(id) {
  return globalThis._getStudentForEditForm(id);
}
//
function executeClassReportsGeneration(year, cls) {
  globalThis._executeClassReportsGeneration(year, cls);
}
function executeStudentReportGeneration(year, cls, id) {
  globalThis._executeStudentReportGeneration(year, cls, id);
}
function continueClassReportsGeneration() {
  globalThis._continueClassReportsGeneration();
}
function cancelClassReportsGeneration() {
  globalThis._cancelClassReportsGeneration();
}
//
function submitStudentRegistration(payload) {
  return globalThis._submitStudentRegistration(payload);
}
function submitStudentEdit(id, payload) {
  globalThis._submitStudentEdit(id, payload);
}
function submitSchoolYearCreation(year, matriculations) {
  globalThis._submitSchoolYearCreation(year, matriculations);
}
