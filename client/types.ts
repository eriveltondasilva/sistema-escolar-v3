// client/types.ts
import type { StudentSearchDetails as ServerStudentSearchDetails } from "#server/roster/dialog-actions.ts";
import type {
  CreateStudentPayload,
  StudentFormPayload,
} from "#server/roster/types.ts";
import type { ClassMatriculationInput } from "#server/school-year/types.ts";
import type { StudentSummary } from "#server/types.ts";

/**
 * Tipos deste arquivo são aliases dos tipos reais do server — o server é
 * a fonte única; o client só reexporta com o nome que faz sentido no
 * contexto de cada dialog, sem redefinir a forma.
 */
export type MatriculationInput = ClassMatriculationInput;

export type StudentOption = StudentSummary;

export type StudentSearchDetails = ServerStudentSearchDetails;

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
  submitStudentRegistration(payload: CreateStudentPayload): string;
  submitStudentEdit(
    studentId: string,
    payload: Omit<StudentFormPayload, "studentId" | "enrollmentDate">,
  ): void;

  // --- Ano Letivo ---
  submitSchoolYearCreation(
    year: string,
    matriculations: MatriculationInput[],
  ): void;
}
