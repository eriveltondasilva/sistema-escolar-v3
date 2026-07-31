// server/report/context-builder.ts
import {
  extractYear,
  getOrCreateClassPdfFolder,
  getReportTemplateFile,
} from "../drive/drive-lookup.ts";
import { VALID_CLASSES } from "./constants.ts";
import {
  loadGradesBySubject,
  loadGradesForSingleStudent,
  loadGuardiansMap,
  loadSingleStudentGuardiansMap,
  loadSingleStudentMap,
  loadStudentsMap,
} from "./data-access.ts";

import type { AssessmentType } from "../types.ts";
import type {
  BuildReportContextParams,
  BuildSingleStudentReportContextParams,
  ReportContext,
} from "./types.ts";

export function buildReportContext({
  config,
  classSpreadsheet,
  schoolYearLabel,
  className,
  foundSubjects,
}: BuildReportContextParams): ReportContext {
  const year = extractYear(schoolYearLabel);
  const assessmentType = getAssessmentType(className);
  const registrationSheet = SpreadsheetApp.openById(
    config.enrollmentSpreadsheetId,
  );

  return {
    year,
    assessmentType,
    templateFile: getReportTemplateFile(config, assessmentType),
    tempFolder: DriveApp.getFolderById(config.tempFolderId),
    pdfFolder: getOrCreateClassPdfFolder(config, year, className),
    studentsMap: loadStudentsMap(registrationSheet),
    guardiansMap: loadGuardiansMap(registrationSheet),
    gradesBySubject: loadGradesBySubject(
      classSpreadsheet,
      foundSubjects,
      assessmentType,
    ),
  };
}

export function buildSingleStudentReportContext({
  config,
  classSpreadsheet,
  schoolYearLabel,
  className,
  foundSubjects,
  studentId,
}: BuildSingleStudentReportContextParams): ReportContext {
  const year = extractYear(schoolYearLabel);
  const assessmentType = getAssessmentType(className);
  const registrationSheet = SpreadsheetApp.openById(
    config.enrollmentSpreadsheetId,
  );

  return {
    year,
    assessmentType,
    templateFile: getReportTemplateFile(config, assessmentType),
    tempFolder: DriveApp.getFolderById(config.tempFolderId),
    pdfFolder: getOrCreateClassPdfFolder(config, year, className),
    studentsMap: loadSingleStudentMap(registrationSheet, studentId),
    guardiansMap: loadSingleStudentGuardiansMap(registrationSheet, studentId),
    gradesBySubject: loadGradesForSingleStudent(
      classSpreadsheet,
      foundSubjects,
      studentId,
      assessmentType,
    ),
  };
}

/** Resolve o tipo de avaliação (nota/conceito) configurado para a turma. */
function getAssessmentType(className: string): AssessmentType {
  const classInfo = VALID_CLASSES.find(
    (validClass) => validClass.className === className,
  );

  if (!classInfo) {
    throw new Error(
      `Turma "${className}" não está cadastrada em VALID_CLASSES.`,
    );
  }

  return classInfo.assessmentType;
}
