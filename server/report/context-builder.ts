// server/report/context-builder.ts
import { VALID_CLASSES } from "./constants.ts";
import {
  loadGradesBySubject,
  loadGradesForSingleStudent,
  loadGuardiansMap,
  loadSingleStudentGuardiansMap,
  loadSingleStudentMap,
  loadStudentsMap,
} from "./data-access.ts";
import {
  extractYearNumber,
  getOrCreateClassPdfFolder,
  getReportTemplateFile,
} from "../drive/drive-lookup.ts";

import type { AssessmentType } from "../types.ts";
import type {
  BuildReportContextParams,
  BuildSingleStudentReportContextParams,
  ReportContext,
} from "./types.ts";

/**
 * Monta o contexto que `generateReportForStudent` precisa, carregando uma
 * única vez por turma o cadastro de alunos, responsáveis e as notas de
 * todas as disciplinas — usado quando se vai gerar para todos os alunos
 * da turma de uma vez.
 */
export function buildReportContext({
  config,
  classSpreadsheet,
  schoolYearLabel,
  className,
  foundSubjects,
}: BuildReportContextParams): ReportContext {
  const yearNumber = extractYearNumber(schoolYearLabel);
  const assessmentType = getAssessmentType(className);
  const registrationSheet = SpreadsheetApp.openById(
    config.enrollmentSpreadsheetId,
  );

  return {
    yearNumber,
    assessmentType,
    templateFile: getReportTemplateFile(config, assessmentType),
    tempFolder: DriveApp.getFolderById(config.tempFolderId),
    pdfFolder: getOrCreateClassPdfFolder(config, yearNumber, className),
    studentsMap: loadStudentsMap(registrationSheet),
    guardiansMap: loadGuardiansMap(registrationSheet),
    gradesBySubject: loadGradesBySubject(classSpreadsheet, foundSubjects),
  };
}

/**
 * Versão mais leve de `buildReportContext` para gerar o boletim de UM único
 * aluno: em vez de carregar o cadastro inteiro da escola (Alunos,
 * Responsáveis) e todas as linhas de cada disciplina da turma — útil quando
 * se está gerando para todos os alunos de uma vez —, busca diretamente pela
 * matrícula em cada planilha, lendo só a linha necessária.
 */
export function buildSingleStudentReportContext({
  config,
  classSpreadsheet,
  schoolYearLabel,
  className,
  foundSubjects,
  studentId,
}: BuildSingleStudentReportContextParams): ReportContext {
  const yearNumber = extractYearNumber(schoolYearLabel);
  const assessmentType = getAssessmentType(className);
  const registrationSheet = SpreadsheetApp.openById(
    config.enrollmentSpreadsheetId,
  );

  return {
    yearNumber,
    assessmentType,
    templateFile: getReportTemplateFile(config, assessmentType),
    tempFolder: DriveApp.getFolderById(config.tempFolderId),
    pdfFolder: getOrCreateClassPdfFolder(config, yearNumber, className),
    studentsMap: loadSingleStudentMap(registrationSheet, studentId),
    guardiansMap: loadSingleStudentGuardiansMap(registrationSheet, studentId),
    gradesBySubject: loadGradesForSingleStudent(
      classSpreadsheet,
      foundSubjects,
      studentId,
    ),
  };
}

/** Resolve o tipo de avaliação (nota/conceito) configurado para a turma. */
function getAssessmentType(className: string): AssessmentType {
  const classInfo = VALID_CLASSES.find((c) => c.className === className);

  if (!classInfo) {
    throw new Error(
      `Turma "${className}" não está cadastrada em VALID_CLASSES.`,
    );
  }

  return classInfo.assessmentType;
}
