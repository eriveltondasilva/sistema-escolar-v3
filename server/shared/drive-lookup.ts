// server/shared/drive-lookup.ts
import type { AssessmentType } from "../types.ts";

/**
 * Retorna uma lista decrescente de anos letivos cadastrados na pasta "Anos Letivos".
 */
export function listSchoolYears(schoolYearsFolderId: string): string[] {
  const rootFolder = DriveApp.getFolderById(schoolYearsFolderId);
  const folderIterator = rootFolder.getFolders();

  const years: string[] = [];

  while (folderIterator.hasNext()) {
    const name = folderIterator.next().getName();
    const match = name.trim().match(/\d{4}$/);
    if (match) years.push(match[0]);
  }

  return years.toSorted((a, b) => b.localeCompare(a));
}

/**
 * Retorna a pasta do ano letivo dentro da pasta "Anos Letivos".
 */
export function getSchoolYearFolder(
  schoolYearsFolderId: string,
  schoolYearLabel: string,
): GoogleAppsScript.Drive.Folder {
  const rootFolder = DriveApp.getFolderById(schoolYearsFolderId);
  const subfolders = rootFolder.getFoldersByName(schoolYearLabel);

  if (!subfolders.hasNext()) {
    throw new Error(
      `Pasta do ano letivo "${schoolYearLabel}" não encontrada dentro de "Anos Letivos".`,
    );
  }

  return subfolders.next();
}

/**
 * Extrai o ano de 4 dígitos do nome da pasta de um ano letivo.
 */
export function extractYear(schoolYearLabel: string): string {
  const match = schoolYearLabel.trim().match(/\d{4}$/);

  if (!match) {
    throw new Error(
      `Não foi possível identificar um ano de 4 dígitos no nome da pasta "${schoolYearLabel}".`,
    );
  }

  return match[0];
}

/**
 * Retorna a planilha da turma dentro da pasta do ano letivo.
 */
export function getClassSpreadsheetFile(
  yearFolder: GoogleAppsScript.Drive.Folder,
  schoolYearLabel: string,
  className: string,
): GoogleAppsScript.Drive.File {
  const files = yearFolder.getFilesByName(className);

  if (!files.hasNext()) {
    throw new Error(
      `Planilha da turma "${className}" não encontrada dentro de "Anos Letivos/${schoolYearLabel}".`,
    );
  }

  const file = files.next();

  if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) {
    throw new Error(
      `O arquivo "${className}" em "Anos Letivos/${schoolYearLabel}" não é uma planilha do Google Sheets.`,
    );
  }

  return file;
}

/**
 * Retorna o arquivo de template de boletim.
 */
export function getReportTemplateFile(
  conceptReportId: string,
  gradeReportId: string,
  assessmentType: AssessmentType,
): GoogleAppsScript.Drive.File {
  const templateId =
    assessmentType === "grade" ? gradeReportId : conceptReportId;
  const file = DriveApp.getFileById(templateId);

  if (file.getMimeType() !== MimeType.GOOGLE_DOCS) {
    throw new Error(
      `O arquivo de template de boletim (ID: ${templateId}) não é um Google Docs.`,
    );
  }

  return file;
}

/**
 * Retorna o modelo de planilha de turma.
 */
export function getClassTemplateFile(
  conceptSpreadsheetId: string,
  gradeSpreadsheetId: string,
  assessmentType: AssessmentType,
): GoogleAppsScript.Drive.File {
  const templateId =
    assessmentType === "grade" ? gradeSpreadsheetId : conceptSpreadsheetId;
  const file = DriveApp.getFileById(templateId);

  if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) {
    throw new Error(
      `O modelo de planilha de turma (ID: ${templateId}) não é uma planilha do Google Sheets.`,
    );
  }

  return file;
}

/**
 * Retorna ou cria a pasta de PDFs da turma.
 */
export function getOrCreateClassPdfFolder(
  pdfsFolderId: string,
  className: string,
  year: string,
): GoogleAppsScript.Drive.Folder {
  const rootFolder = DriveApp.getFolderById(pdfsFolderId);

  const yearFolders = rootFolder.getFoldersByName(year);
  const yearFolder =
    yearFolders.hasNext() ? yearFolders.next() : rootFolder.createFolder(year);
  const classFolders = yearFolder.getFoldersByName(className);

  return classFolders.hasNext() ?
      classFolders.next()
    : yearFolder.createFolder(className);
}

/**
 * Retorna o PDF do aluno dentro da pasta da turma.
 */
export function findStudentPdfInFolder(
  folder: GoogleAppsScript.Drive.Folder,
  studentId: string,
): GoogleAppsScript.Drive.File | null {
  const prefix = `${studentId}_`;
  const searchQuery =
    `title contains '${prefix}' ` +
    "and mimeType = 'application/pdf' " +
    "and trashed = false";
  const files = folder.searchFiles(searchQuery);

  while (files.hasNext()) {
    const file = files.next();
    const isFileNameValid = file.getName().startsWith(prefix);

    if (isFileNameValid) return file;
  }

  return null;
}
