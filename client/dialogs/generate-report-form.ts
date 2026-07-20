// client/dialogs/generate-report-form.ts

type ActionType = "single" | "class";

type StudentOption = {
  studentId: string;
  name: string;
};

type ReportFormPayload = {
  actionType: ActionType;
  years: string[];
  classes: string[];
};

type ReportFormState = ReportFormPayload & {
  schoolYear: string;
  className: string;
  studentSearch: string;
  availableStudents: StudentOption[];
  isLoading: boolean;
  isFetchingStudents: boolean;
  error: string;
  readonly noStudents: boolean;
  init(): void;
  fetchStudents(): void;
  submit(): void;
};

function reportFormDialog(el: HTMLElement): ReportFormState {
  const payload: ReportFormPayload = JSON.parse(el.dataset.init as string);

  return {
    ...payload,
    schoolYear: payload.years[0] ?? "",
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

      // getStudentsDataForClass(schoolYearLabel, className): StudentOption[]
      // — ver server/lib/actions.ts
      google.script.run
        .withSuccessHandler((students: StudentOption[]) => {
          this.availableStudents = students;
          this.isFetchingStudents = false;
        })
        .withFailureHandler((err: Error) => {
          this.error = "Erro ao buscar alunos: " + err.message;
          this.isFetchingStudents = false;
        })
        .getStudentsDataForClass(this.schoolYear, this.className);
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

        // executeStudentReportGeneration(schoolYearLabel, className, studentId)
        // — ver server/lib/actions.ts
        google.script.run
          .withSuccessHandler(() => google.script.host.close())
          .withFailureHandler((err: Error) => {
            this.error = err.message;
            this.isLoading = false;
          })
          .executeStudentReportGeneration(
            this.schoolYear,
            this.className,
            selectedId,
          );
      } else {
        // executeClassReportsGeneration(schoolYearLabel, className)
        // — ver server/lib/actions.ts
        google.script.run
          .withSuccessHandler(() => google.script.host.close())
          .withFailureHandler((err: Error) => {
            this.error = err.message;
            this.isLoading = false;
          })
          .executeClassReportsGeneration(this.schoolYear, this.className);
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("reportFormDialog", reportFormDialog);
});
