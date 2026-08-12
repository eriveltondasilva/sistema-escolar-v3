// client/utils/run-server-action.ts
import type { StudentSearchDetails } from "#server/roster/dialog-actions.ts";
import type {
  CreateStudentPayload,
  StudentFormPayload,
} from "#server/roster/types.ts";
import type { ClassMatriculationInput } from "#server/school-year/types.ts";
import type { StudentStatus, StudentSummary } from "#server/types.ts";

/** Funções expostas pelo server via google.script.run (ver server/main.ts). */
export interface GasServerFunctions {
  // --- Boletim ---
  getStudentsDataForClass(
    schoolYearLabel: string,
    className: string,
  ): StudentSummary[];
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
  getStudentSearchResults(
    query: string,
    status: StudentStatus,
  ): StudentSummary[];
  getStudentDetailsForSearch(studentId: string): StudentSearchDetails;
  getStudentForEditForm(studentId: string): StudentFormPayload;
  submitStudentRegistration(payload: CreateStudentPayload): string;
  submitStudentEdit(
    studentId: string,
    payload: Omit<StudentFormPayload, "studentId" | "enrollmentDate">,
  ): void;

  // --- Ano Letivo ---
  submitSchoolYearCreation(
    yearInput: string,
    matriculationsByClass: ClassMatriculationInput[],
  ): void;
}

export function runServerAction<TReturn = void, TServer = GasServerFunctions>(
  actionCallback: (server: TServer) => void,
): Promise<TReturn> {
  return new Promise<TReturn>((resolve, reject) => {
    const runner = google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject);

    // Fazemos um cast para a interface do servidor para habilitar o autocomplete
    actionCallback(runner as unknown as TServer);
  });
}
