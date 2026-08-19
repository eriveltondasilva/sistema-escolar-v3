// client/utils/run-server-action.ts

import type { StudentSearchResult } from "#server/roster/data-access.ts";
import type { StudentSearchDetails } from "#server/roster/dialog-actions.ts";
import type {
  CreateStudentPayload,
  StudentFormPayload,
} from "#server/roster/types.ts";
import type { ClassMatriculationInput } from "#server/school-year/types.ts";
import type { StudentStatus } from "#server/types.ts";

/** Funções expostas pelo server via google.script.run (ver server/main.ts). */
export interface GasServerFunctions {
  // --- Boletim ---
  getStudentsDataForClass(
    schoolYearLabel: string,
    className: string,
  ): import("#server/types.ts").StudentSummary[];
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
  ): StudentSearchResult;
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

const TIMEOUT_MS = 1000 * 50;

export function runServerAction<TReturn = void, TServer = GasServerFunctions>(
  action: (server: TServer) => void,
  timeoutMs = TIMEOUT_MS,
): Promise<TReturn> {
  const serverActionPromise = new Promise<TReturn>((resolve, reject) => {
    const runner = google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject);

    action(runner as unknown as TServer);
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `A requisição excedeu o tempo limite de ${timeoutMs / 1000} segundos.\n` +
            "A operação pode ainda estar em andamento no servidor - " +
            "feche este painel e aguarde antes de tentar novamente.",
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([serverActionPromise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}
