// server/web-app/pdf-lookup.ts
import { loadConfig } from "../config.ts";

import type { ReportLinkParams } from "../types.ts";

export function findReportPdfId({
  studentId,
  year,
  className,
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
      `Pasta da turma "${className}" não encontrada dentro do ano "${year}".`,
    );
  }

  const prefix = `${studentId}_`;
  const searchQuery = `title contains '${prefix}' and mimeType = 'application/pdf' and trashed = false`;
  const classFolder = classFolderIterator.next();
  const files = classFolder.searchFiles(searchQuery);

  while (files.hasNext()) {
    const file = files.next();
    if (!file.getName().startsWith(prefix)) continue;

    return file.getId();
  }

  return null;
}
