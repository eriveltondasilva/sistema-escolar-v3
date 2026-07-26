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

/**
 * Modelo de planilha de turma (usado na criação do ano letivo, ver
 * school-year/creation.ts) — não confundir com getClassSpreadsheetFile,
 * que abre a planilha JÁ CRIADA de uma turma existente. Assim como o
 * boletim, o modelo varia por assessmentType (nota/conceito), pois as
 * colunas de lançamento diferem entre os dois.
 */
export function getClassTemplateFile(
  config: AppConfig,
  assessmentType: AssessmentType,
): GoogleAppsScript.Drive.File {
  const templateId =
    assessmentType === "grade" ?
      config.gradeSpreadsheetId
    : config.conceptSpreadsheetId;

  const file = DriveApp.getFileById(templateId);

  // Ver comentário em getClassSpreadsheetFile sobre o bug de tipos do MimeType.
  if (file.getMimeType() !== "application/vnd.google-apps.spreadsheet") {
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
