// server/shared/drive-lookup.ts
import {
  GoogleMimeType,
  SCHOOL_YEAR_LABEL_PREFIX,
} from "#server/config/constants.ts";
import { compareStrings, padStudentId } from "#server/utils/formatters.ts";

import type { AssessmentType } from "../types.ts";

const SCHOOL_YEAR_REGEX = new RegExp(
  `^${SCHOOL_YEAR_LABEL_PREFIX}(\\d{4})$`,
  "i",
);

/**
 * Retorna uma lista decrescente de anos letivos cadastrados da pasta "Anos Letivos".
 * @example ["Ano Letivo - 2026", "Ano Letivo - 2025"]
 */
export function listSchoolYears(schoolYearsFolderId: string): string[] {
  const rootFolder = DriveApp.getFolderById(schoolYearsFolderId);
  const folderIterator = rootFolder.getFolders();

  const schoolYearLabels: string[] = [];

  while (folderIterator.hasNext()) {
    const name = folderIterator.next().getName();
    const match = name.trim().match(SCHOOL_YEAR_REGEX);
    if (match) schoolYearLabels.push(match[0]!);
  }

  return schoolYearLabels.toSorted((a, b) => compareStrings(a, b, "desc"));
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
 * Extrai do nome da pasta o ano de 4 dígitos do nome da pasta de um ano letivo.
 * @example "Ano Letivo - 2026" -> "2026".
 */
export function extractYear(schoolYearLabel: string): string {
  const match = schoolYearLabel.trim().match(SCHOOL_YEAR_REGEX);

  if (!match) {
    throw new Error(
      `Não foi possível identificar um ano de 4 dígitos no nome da pasta "${schoolYearLabel}".`,
    );
  }

  return match[1]!;
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

  if (file.getMimeType() !== GoogleMimeType.SHEETS) {
    throw new Error(
      `O arquivo "${className}" em "Anos Letivos/${schoolYearLabel}" não é uma planilha do Google Sheets.`,
    );
  }

  return file;
}

interface GetReportTemplateFile {
  conceptReportId: string;
  gradeReportId: string;
  assessmentType: AssessmentType;
}

/**
 * Retorna o arquivo de template de boletim.
 */
export function getReportTemplateFile({
  conceptReportId,
  gradeReportId,
  assessmentType,
}: GetReportTemplateFile): GoogleAppsScript.Drive.File {
  const templateId =
    assessmentType === "numeric" ? gradeReportId : conceptReportId;
  const file = DriveApp.getFileById(templateId);

  if (file.getMimeType() !== GoogleMimeType.DOCS) {
    throw new Error(
      `O arquivo de template de boletim (ID: ${templateId}) não é um Google Docs.`,
    );
  }

  return file;
}

interface GetClassTemplateFile {
  conceptSpreadsheetId: string;
  gradeSpreadsheetId: string;
  assessmentType: AssessmentType;
}

/**
 * Retorna o modelo de planilha de turma.
 */
export function getClassTemplateFile({
  conceptSpreadsheetId,
  gradeSpreadsheetId,
  assessmentType,
}: GetClassTemplateFile): GoogleAppsScript.Drive.File {
  const templateId =
    assessmentType === "numeric" ? gradeSpreadsheetId : conceptSpreadsheetId;
  const file = DriveApp.getFileById(templateId);

  if (file.getMimeType() !== GoogleMimeType.SHEETS) {
    throw new Error(
      `O modelo de planilha de turma (ID: ${templateId}) não é uma planilha do Google Sheets.`,
    );
  }

  return file;
}

interface GetOrCreateClassPdfFolder {
  pdfsFolderId: string;
  className: string;
  schoolYearLabel: string;
}

/**
 * Retorna ou cria a pasta de PDFs da turma.
 */
export function getOrCreateClassPdfFolder({
  pdfsFolderId,
  className,
  schoolYearLabel,
}: GetOrCreateClassPdfFolder): GoogleAppsScript.Drive.Folder {
  const rootFolder = DriveApp.getFolderById(pdfsFolderId);

  const yearFolders = rootFolder.getFoldersByName(schoolYearLabel);
  const yearFolder =
    yearFolders.hasNext() ?
      yearFolders.next()
    : rootFolder.createFolder(schoolYearLabel);

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
  const prefix = `${padStudentId(studentId)}_`;
  const searchQuery =
    `title contains '${prefix}' ` +
    `and mimeType = '${GoogleMimeType.PDF}' ` +
    "and trashed = false";

  const files = folder.searchFiles(searchQuery);

  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().startsWith(prefix)) return file;
  }

  return null;
}
