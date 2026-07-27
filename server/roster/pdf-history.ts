// server/roster/pdf-history.ts
import { findStudentPdfInFolder } from "#server/drive/drive-lookup.ts";

import type { AppConfig } from "#server/types.ts";

export interface StudentPdfHistoryEntry {
  yearLabel: string;
  className: string;
  pdfUrl: string;
}

export function findStudentPdfHistory(
  config: AppConfig,
  studentId: string,
): StudentPdfHistoryEntry[] {
  const results: StudentPdfHistoryEntry[] = [];

  const pdfRootFolder = DriveApp.getFolderById(config.pdfsFolderId);
  const yearFolders = pdfRootFolder.getFolders();

  while (yearFolders.hasNext()) {
    const yearFolder = yearFolders.next();
    const yearLabel = yearFolder.getName();
    const classFolders = yearFolder.getFolders();

    while (classFolders.hasNext()) {
      const classFolder = classFolders.next();
      const file = findStudentPdfInFolder(classFolder, studentId);
      if (file)
        results.push({
          yearLabel,
          className: classFolder.getName(),
          pdfUrl: file.getUrl(),
        });
    }
  }

  return results.sort((a, b) => b.yearLabel.localeCompare(a.yearLabel));
}
