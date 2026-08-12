// server/report/dialog-actions.ts
import { loadConfig } from "#config/app-config.ts";
import { DIALOG_NAMES } from "#config/constants.ts";
import {
  getClassSpreadsheetFile,
  getSchoolYearFolder,
} from "#drive/drive-lookup.ts";
import { renderView } from "#utils/render-view.ts";
import { withScriptLock } from "#utils/script-lock.ts";
import {
  clearClassReportJob,
  loadClassReportJob,
} from "#utils/script-properties.ts";
import { continueReportsForClass, generateReportsForClass } from "./batch.ts";
import { buildSingleStudentReportContext } from "./context-builder.ts";
import {
  checkClassSubjects,
  getClassStudentsFromSummary,
  isStudentInClass,
} from "./data-access.ts";
import { generateReportForStudent } from "./generator.ts";

import type { StudentSummary } from "../types.ts";
import type { ClassReportsGenerationResult } from "./batch.ts";
import type {
  ClassReportJob,
  ClassReportResultInitData,
  ReportSuccessInitData,
} from "./types.ts";

interface ShowClassReportsResult {
  ui: GoogleAppsScript.Base.Ui;
  result: ClassReportsGenerationResult;
  schoolYearLabel: string;
  className: string;
}

function showClassReportsResult_({
  ui,
  result,
  schoolYearLabel,
  className,
}: ShowClassReportsResult): void {
  const errorsToShow = result.errors;
  const truncatedCount = result.errorCount - errorsToShow.length;
  const height = result.errorCount > 0 || result.interrupted ? 600 : 260;

  const initData: ClassReportResultInitData = {
    ...result,
    className,
    schoolYearLabel,
    truncatedCount,
    errors: errorsToShow,
  };

  const htmlOutput = renderView(DIALOG_NAMES.classReportResult, initData);
  htmlOutput.setWidth(440).setHeight(height);

  ui.showModalDialog(htmlOutput, "Boletins Gerados");
}

function executeClassReports_(
  ui: GoogleAppsScript.Base.Ui,
  schoolYearLabel: string,
  className: string,
): void {
  const config = loadConfig();
  const yearFolder = getSchoolYearFolder(
    config.schoolYearsFolderId,
    schoolYearLabel,
  );
  const classFile = getClassSpreadsheetFile(
    yearFolder,
    schoolYearLabel,
    className,
  );
  const classSpreadsheet = SpreadsheetApp.openById(classFile.getId());
  const result = generateReportsForClass(
    config,
    classSpreadsheet,
    schoolYearLabel,
    className,
  );

  showClassReportsResult_({ ui, result, schoolYearLabel, className });
}

function continueClassReports_(
  ui: GoogleAppsScript.Base.Ui,
  pendingJob: ClassReportJob,
): void {
  const config = loadConfig();
  const yearFolder = getSchoolYearFolder(
    config.schoolYearsFolderId,
    pendingJob.schoolYearLabel,
  );
  const classFile = getClassSpreadsheetFile(
    yearFolder,
    pendingJob.schoolYearLabel,
    pendingJob.className,
  );
  const classSpreadsheet = SpreadsheetApp.openById(classFile.getId());
  const result = continueReportsForClass(config, classSpreadsheet, pendingJob);

  showClassReportsResult_({
    ui,
    result,
    schoolYearLabel: pendingJob.schoolYearLabel,
    className: pendingJob.className,
  });
}

interface ExecuteStudentReport {
  ui: GoogleAppsScript.Base.Ui;
  schoolYearLabel: string;
  className: string;
  studentId: string;
}

function executeStudentReport_({
  ui,
  schoolYearLabel,
  className,
  studentId,
}: ExecuteStudentReport): void {
  const config = loadConfig();
  const yearFolder = getSchoolYearFolder(
    config.schoolYearsFolderId,
    schoolYearLabel,
  );
  const classFile = getClassSpreadsheetFile(
    yearFolder,
    schoolYearLabel,
    className,
  );
  const classSpreadsheet = SpreadsheetApp.openById(classFile.getId());

  const { foundSubjects } = checkClassSubjects(classSpreadsheet);
  if (foundSubjects.length === 0) {
    throw new Error("Nenhuma disciplina reconhecida nessa turma.");
  }

  if (!isStudentInClass(classSpreadsheet, studentId)) {
    throw new Error(
      `Matrícula ${studentId} não encontrada na turma "${className}" (${schoolYearLabel}).`,
    );
  }

  const context = buildSingleStudentReportContext({
    config,
    classSpreadsheet,
    schoolYearLabel,
    className,
    foundSubjects,
    studentId,
  });
  const pdfUrl = generateReportForStudent({
    studentId,
    className,
    foundSubjects,
    context,
  });

  const initData: ReportSuccessInitData = {
    studentId,
    className,
    schoolYearLabel,
    pdfUrl,
    pdfFolderUrl: context.pdfFolder.getUrl(),
  };

  const htmlOutput = renderView(DIALOG_NAMES.reportSuccess, initData);
  htmlOutput.setWidth(400).setHeight(360);

  ui.showModalDialog(htmlOutput, "Boletim Gerado");
}

// -------------------------------------

export function getStudentsDataForClass(
  schoolYearLabel: string,
  className: string,
): StudentSummary[] {
  const { schoolYearsFolderId } = loadConfig();
  const yearFolder = getSchoolYearFolder(schoolYearsFolderId, schoolYearLabel);
  const classFile = getClassSpreadsheetFile(
    yearFolder,
    schoolYearLabel,
    className,
  );
  const classSpreadsheet = SpreadsheetApp.openById(classFile.getId());
  const students = getClassStudentsFromSummary(classSpreadsheet);

  return students.map(({ studentId, name }) => ({ studentId, name }));
}

export function executeClassReportsGeneration(
  schoolYearLabel: string,
  className: string,
): void {
  withScriptLock((ui) => {
    const pendingJob = loadClassReportJob();

    if (pendingJob) {
      if (
        pendingJob.schoolYearLabel !== schoolYearLabel ||
        pendingJob.className !== className
      ) {
        throw new Error(
          `Existe uma geração pendente para a turma "${pendingJob.className}" ` +
            `(${pendingJob.schoolYearLabel}). Retome ou cancele essa geração antes de iniciar outra.`,
        );
      }

      continueClassReports_(ui, pendingJob);
      return;
    }

    executeClassReports_(ui, schoolYearLabel, className);
  }, "Já existe uma geração de boletins em andamento. Tente novamente em alguns instantes.");
}

export function continueClassReportsGeneration(): void {
  withScriptLock((ui) => {
    const pendingJob = loadClassReportJob();
    if (!pendingJob) {
      throw new Error(
        "Não existe uma geração de boletins pendente para retomar.",
      );
    }

    continueClassReports_(ui, pendingJob);
  }, "Já existe uma geração de boletins em andamento. Tente novamente em alguns instantes.");
}

export function cancelClassReportsGeneration(): void {
  withScriptLock(() => {
    if (!loadClassReportJob()) return;
    clearClassReportJob();
  }, "Não foi possível cancelar enquanto uma geração está em andamento. Tente novamente em alguns instantes.");
}

export function executeStudentReportGeneration(
  schoolYearLabel: string,
  className: string,
  studentId: string,
): void {
  const trimmedId = String(studentId ?? "").trim();
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");

  withScriptLock((ui) => {
    executeStudentReport_({
      ui,
      schoolYearLabel,
      className,
      studentId: trimmedId,
    });
  }, "Já existe uma geração de boletim em andamento. Tente novamente em alguns instantes.");
}
