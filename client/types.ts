// client/types.ts
import type { StudentFormPayload } from "#server/types.ts";

/**
 * Tipos auxiliares que trafegam entre client e server, mas não vivem em
 * server/types.ts porque são específicos do payload de cada dialog.
 */
export type MatriculationInput = {
  className: string;
  studentIds: string[];
};

export type StudentOption = {
  studentId: string;
  name: string;
};

export type PdfHistoryEntry = {
  pdfUrl: string;
  yearLabel: string;
  className: string;
};

export type StudentSearchDetails = {
  student: {
    studentId: string;
    name: string;
    address: string;
    birthDate: string;
  };
  guardianNamesFormatted: string;
  pdfHistory: PdfHistoryEntry[];
};

/** Funções expostas pelo server via google.script.run (ver server/main.ts). */
export interface GasServerFunctions {
  // --- Boletim ---
  getStudentsDataForClass(
    schoolYearLabel: string,
    className: string,
  ): StudentOption[];
  executeClassReportsGeneration(
    schoolYearLabel: string,
    className: string,
  ): void;
  executeStudentReportGeneration(
    schoolYearLabel: string,
    className: string,
    studentId: string,
  ): void;
  continueClassReportsGeneration(): void;
  cancelClassReportsGeneration(): void;

  // --- Aluno ---
  openStudentEditDialog(studentId: string): void;
  getStudentSearchResults(query: string): StudentOption[];
  getStudentDetailsForSearch(studentId: string): StudentSearchDetails;
  getStudentForEditForm(studentId: string): StudentFormPayload;
  submitStudentRegistration(payload: StudentFormPayload): string;
  submitStudentEdit(studentId: string, payload: StudentFormPayload): void;

  // --- Ano Letivo ---
  submitSchoolYearCreation(
    year: string,
    matriculations: MatriculationInput[],
  ): void;
}
