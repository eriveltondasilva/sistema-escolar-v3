// server/roster/pdf-history.ts
import { findStudentPdfInFolder } from "#drive/drive-lookup.ts";
import { compareStrings } from "#server/utils/formatters.ts";

interface StudentPdfHistoryEntry {
  schoolYearLabel: string;
  className: string;
  pdfUrl: string;
}

export function findStudentPdfHistory(
  pdfsFolderId: string,
  studentId: string,
): StudentPdfHistoryEntry[] {
  const results: StudentPdfHistoryEntry[] = [];

  const pdfRootFolder = DriveApp.getFolderById(pdfsFolderId);
  const yearFolders = pdfRootFolder.getFolders();

  while (yearFolders.hasNext()) {
    const yearFolder = yearFolders.next();
    const schoolYearLabel = yearFolder.getName();
    const classFolders = yearFolder.getFolders();

    while (classFolders.hasNext()) {
      const classFolder = classFolders.next();
      const file = findStudentPdfInFolder(classFolder, studentId);
      if (file)
        results.push({
          schoolYearLabel,
          className: classFolder.getName(),
          pdfUrl: file.getUrl(),
        });
    }
  }

  return results.toSorted((a, b) =>
    compareStrings(a.schoolYearLabel, b.schoolYearLabel, "desc"),
  );
}
