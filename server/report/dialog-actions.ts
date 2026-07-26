// server/report/dialog-actions.ts
import {
  getClassSpreadsheetFile,
  getSchoolYearFolder,
} from "#server/drive/drive-lookup.ts";
import { loadConfig, MAX_ERRORS_SHOWN } from "../config.ts";
import { generateReportsForClass } from "./batch.ts";
import { buildSingleStudentReportContext } from "./context-builder.ts";
import {
  checkClassSubjects,
  getClassStudentsFromResumo,
  isStudentInClass,
} from "./data-access.ts";
import { generateReportForStudent } from "./generator.ts";
import { withScriptLock } from "../utils/script-lock.ts";

/**
 * Retorna a lista de objetos contendo ID e Nome dos alunos mapeados da aba
 * Resumo. Endpoint consumido pelo Alpine.js para alimentar o datalist de
 * autocompletar.
 */
export function getStudentsDataForClass(
  schoolYearLabel: string,
  className: string,
): Array<{ studentId: string; name: string }> {
  const config = loadConfig();
  const yearFolder = getSchoolYearFolder(config, schoolYearLabel);
  const classFile = getClassSpreadsheetFile(
    yearFolder,
    schoolYearLabel,
    className,
  );
  const classSpreadsheet = SpreadsheetApp.openById(classFile.getId());

  const students = getClassStudentsFromResumo(classSpreadsheet);

  return students.map((s) => ({
    studentId: s.studentId,
    name: s.name,
  }));
}

export function executeClassReportsGeneration(
  schoolYearLabel: string,
  className: string,
): void {
  withScriptLock((ui) => {
    executeClassReportsGenerationInternal_(ui, schoolYearLabel, className);
  }, "Já existe uma geração de boletins em andamento. Tente novamente em alguns instantes.");
}

export function executeStudentReportGeneration(
  schoolYearLabel: string,
  className: string,
  studentId: string,
): void {
  const trimmedId = String(studentId ?? "").trim();
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");

  withScriptLock((ui) => {
    executeStudentReportGenerationInternal_(
      ui,
      schoolYearLabel,
      className,
      trimmedId,
    );
  }, "Já existe uma geração de boletim em andamento. Tente novamente em alguns instantes.");
}

function executeClassReportsGenerationInternal_(
  ui: GoogleAppsScript.Base.Ui,
  schoolYearLabel: string,
  className: string,
): void {
  const config = loadConfig();
  const yearFolder = getSchoolYearFolder(config, schoolYearLabel);
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

  const errorsToShow = result.errors.slice(0, MAX_ERRORS_SHOWN);
  const truncatedCount = result.errors.length - errorsToShow.length;

  const template = HtmlService.createTemplateFromFile(
    "ClassReportResultDialog",
  );
  template.successCount = result.successCount;
  template.className = className;
  template.schoolYearLabel = schoolYearLabel;
  template.errors = errorsToShow;
  template.truncatedCount = truncatedCount;
  template.pdfFolderUrl = result.pdfFolderUrl;
  template.interrupted = result.interrupted;
  template.interruptedMessage = result.interruptedMessage;

  const height = result.errors.length > 0 ? 600 : 240;
  const htmlOutput = template.evaluate().setWidth(440).setHeight(height);

  ui.showModalDialog(htmlOutput, "Boletins Gerados");
}

function executeStudentReportGenerationInternal_(
  ui: GoogleAppsScript.Base.Ui,
  schoolYearLabel: string,
  className: string,
  studentId: string,
): void {
  const config = loadConfig();
  const yearFolder = getSchoolYearFolder(config, schoolYearLabel);
  const classFile = getClassSpreadsheetFile(
    yearFolder,
    schoolYearLabel,
    className,
  );
  const classSpreadsheet = SpreadsheetApp.openById(classFile.getId());

  const { found: foundSubjects } = checkClassSubjects(classSpreadsheet);
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

  const template = HtmlService.createTemplateFromFile("ReportSuccessDialog");
  template.studentId = studentId;
  template.className = className;
  template.schoolYearLabel = schoolYearLabel;
  template.pdfUrl = pdfUrl;
  template.pdfFolderUrl = context.pdfFolder.getUrl();

  const htmlOutput = template.evaluate().setWidth(400).setHeight(360);
  ui.showModalDialog(htmlOutput, "Boletim Gerado");
}
