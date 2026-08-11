// client/dialogs/generate-report-form.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { parseInitData } from "../utils/parse-init-data.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { GenerateReportFormInitData } from "#server/report/types.ts";
import type { StudentSummary } from "#server/types.ts";

type ReportFormState = GenerateReportFormInitData & {
  schoolYear: string;
  className: string;
  studentSearch: string;
  availableStudents: StudentSummary[];
  isLoading: boolean;
  isFetchingStudents: boolean;
  error: string;
  readonly noStudents: boolean;
  init(): void;
  fetchStudents(): void;
  submit(): void;
};

function initDialog(el: HTMLElement): ReportFormState {
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

    init() {
      if (this.actionType === "single") {
        this.fetchStudents();
      }
    },

    fetchStudents() {
      this.isFetchingStudents = true;
      this.availableStudents = [];
      this.studentSearch = "";
      this.error = "";

      runServerAction<StudentSummary[]>((server) =>
        server.getStudentsDataForClass(this.schoolYear, this.className),
      )
        .then((students) => {
          this.availableStudents = students;
        })
        .catch((error: unknown) => {
          this.error = "Erro ao buscar alunos: " + getErrorMsg(error);
        })
        .finally(() => {
          this.isFetchingStudents = false;
        });
    },

    submit() {
      this.error = "";
      this.isLoading = true;

      if (this.actionType === "single") {
        const selectedId = this.studentSearch.trim();
        if (!selectedId) {
          this.error = "Selecione ou digite uma matrícula válida.";
          this.isLoading = false;
          return;
        }

        runServerAction((server) =>
          server.executeStudentReportGeneration(
            this.schoolYear,
            this.className,
            selectedId,
          ),
        )
          .then(() => google.script.host.close())
          .catch((error: unknown) => {
            this.error = getErrorMsg(error);
            this.isLoading = false;
          });
      } else {
        runServerAction((server) =>
          server.executeClassReportsGeneration(this.schoolYear, this.className),
        )
          .then(() => google.script.host.close())
          .catch((error: unknown) => {
            this.error = getErrorMsg(error);
            this.isLoading = false;
          });
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data(initDialog.name, initDialog);
});
