// server/drive/drive-lookup.ts
import type { AppConfig, AssessmentType } from "../types.ts";

export function listSchoolYears({ schoolYearsFolderId }: AppConfig): string[] {
  const rootFolder = DriveApp.getFolderById(schoolYearsFolderId);
  const folderIterator = rootFolder.getFolders();

  const folderNames: string[] = [];

  while (folderIterator.hasNext()) {
    const folder = folderIterator.next().getName();
    if (/\d{4}/.test(folder)) folderNames.push(folder);
  }

  return folderNames.toSorted();
}

export function getSchoolYearFolder(
  config: AppConfig,
  schoolYearLabel: string,
): GoogleAppsScript.Drive.Folder {
  const rootFolder = DriveApp.getFolderById(config.schoolYearsFolderId);
  const subfolders = rootFolder.getFoldersByName(schoolYearLabel);

  if (!subfolders.hasNext()) {
    throw new Error(
      `Pasta do ano letivo "${schoolYearLabel}" não encontrada dentro de "Anos Letivos".`,
    );
  }

  return subfolders.next();
}

export function extractYearNumber(schoolYearLabel: string): number {
  const match = schoolYearLabel.match(/\d{4}/);

  if (!match) {
    throw new Error(
      `Não foi possível identificar um ano de 4 dígitos no nome da pasta "${schoolYearLabel}".`,
    );
  }

  return Number(match[0]);
}

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

export function getReportTemplateFile(
  config: AppConfig,
  assessmentType: AssessmentType,
): GoogleAppsScript.Drive.File {
  const templateId =
    assessmentType === "grade" ? config.gradeReportId : config.conceptReportId;

  const file = DriveApp.getFileById(templateId);

  if (file.getMimeType() !== MimeType.GOOGLE_DOCS) {
    throw new Error(
      `O arquivo de template de boletim (ID: ${templateId}) não é um Google Docs.`,
    );
  }

  return file;
}

export function getClassTemplateFile(
  config: AppConfig,
  assessmentType: AssessmentType,
): GoogleAppsScript.Drive.File {
  const templateId =
    assessmentType === "grade" ?
      config.gradeSpreadsheetId
    : config.conceptSpreadsheetId;

  const file = DriveApp.getFileById(templateId);

  if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) {
    throw new Error(
      `O modelo de planilha de turma (ID: ${templateId}) não é uma planilha do Google Sheets.`,
    );
  }

  return file;
}

export function getOrCreateClassPdfFolder(
  config: AppConfig,
  yearNumber: number,
  className: string,
): GoogleAppsScript.Drive.Folder {
  const rootFolder = DriveApp.getFolderById(config.pdfsFolderId);
  const yearLabel = String(yearNumber);

  const yearFolders = rootFolder.getFoldersByName(yearLabel);
  const yearFolder =
    yearFolders.hasNext() ?
      yearFolders.next()
    : rootFolder.createFolder(yearLabel);

  const classFolders = yearFolder.getFoldersByName(className);
  return classFolders.hasNext() ?
      classFolders.next()
    : yearFolder.createFolder(className);
}

export function findStudentPdfInFolder(
  folder: GoogleAppsScript.Drive.Folder,
  studentId: string,
): GoogleAppsScript.Drive.File | null {
  const prefix = `${studentId}_`;
  const searchQuery = `title contains '${prefix}' and mimeType = 'application/pdf' and trashed = false`;
  const files = folder.searchFiles(searchQuery);

  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().startsWith(prefix)) return file;
  }

  return null;
}
