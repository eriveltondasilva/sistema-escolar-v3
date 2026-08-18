// client/dialogs/generate-report-form.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { parseInitData } from "../utils/parse-init-data.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { GenerateReportFormInitData } from "#server/report/types.ts";
import type { StudentSummary } from "#server/types.ts";
import type { AlpineComponent } from "alpinejs";

interface InitDialog extends GenerateReportFormInitData {
  schoolYear: string;
  className: string;
  studentSearch: string;
  availableStudents: StudentSummary[];
  isLoading: boolean;
  isFetchingStudents: boolean;
  error: string;
  readonly noStudents: boolean;
  // Funções
  init(): Promise<void>;
  fetchStudents(): Promise<void>;
  submit(): Promise<void>;
}

function initDialog(el: HTMLElement): AlpineComponent<InitDialog> {
  const payload = parseInitData<GenerateReportFormInitData>(el);

  return {
    ...payload,
    schoolYear: payload.schoolYearLabels[0] ?? "",
    className: payload.classes[0] ?? "",
    studentSearch: "",
    availableStudents: [],
    isLoading: false,
    isFetchingStudents: false,
    error: "",

    get noStudents() {
      return !this.isFetchingStudents && this.availableStudents.length === 0;
    },

    async init() {
      if (this.actionType === "single") {
        await this.fetchStudents();
      }
    },

    async fetchStudents() {
      this.isFetchingStudents = true;
      this.availableStudents = [];
      this.studentSearch = "";
      this.error = "";

      try {
        this.availableStudents = await runServerAction<StudentSummary[]>(
          (server) =>
            server.getStudentsDataForClass(this.schoolYear, this.className),
        );
      } catch (error: unknown) {
        this.error = "Erro ao buscar alunos: " + getErrorMsg(error);
      } finally {
        this.isFetchingStudents = false;
      }
    },

    async submit() {
      this.error = "";
      this.isLoading = true;

      try {
        if (this.actionType === "single") {
          const selectedId = this.studentSearch.trim();

          if (!selectedId) {
            this.error = "Selecione ou digite uma matrícula válida.";
            this.isLoading = false;
            return;
          }

          await runServerAction((server) =>
            server.executeStudentReportGeneration(
              this.schoolYear,
              this.className,
              selectedId,
            ),
          );
        } else {
          await runServerAction((server) =>
            server.executeClassReportsGeneration(
              this.schoolYear,
              this.className,
            ),
          );
        }

        google.script.host.close();
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
        this.isLoading = false;
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
