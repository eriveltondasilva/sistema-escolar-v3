// server/web-app/pdf-lookup.ts
import { loadConfig } from "../config.ts";
import { findStudentPdfInFolder } from "../shared/drive-lookup.ts";

import type { ReportLinkParams } from "../types.ts";

export function findReportPdfId({
  studentId,
  className,
  year,
}: ReportLinkParams): string | null {
  const { pdfsFolderId } = loadConfig();

  const pdfFolder = DriveApp.getFolderById(pdfsFolderId);
  const yearFolderIterator = pdfFolder.getFoldersByName(year);

  if (!yearFolderIterator.hasNext()) {
    throw new Error(
      `Pasta do ano letivo "${year}" não encontrada dentro de "${pdfFolder.getName()}".`,
    );
  }

  const yearFolder = yearFolderIterator.next();
  const classFolderIterator = yearFolder.getFoldersByName(className);

  if (!classFolderIterator.hasNext()) {
    throw new Error(
      `Pasta da turma "${className}" não encontrada dentro do ano letivo "${year}".`,
    );
  }

  const classFolder = classFolderIterator.next();

  return findStudentPdfInFolder(classFolder, studentId)?.getId() ?? null;
}
