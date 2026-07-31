// client/dialogs/student-edit.ts
import { runServerAction, validateStudentForm } from "../utils.ts";

import type { StudentFormPayload } from "#server/roster/types.ts";
import type { GuardianData } from "#server/types.ts";

function emptyGuardian(): GuardianData {
  return {
    name: "",
    address: "",
    relationship: "",
    phone: "",
    isPrimary: false,
  };
}

function emptyForm(): StudentFormPayload {
  return {
    studentId: "",
    name: "",
    address: "",
    nationality: "",
    sex: "",
    birthDate: "",
    enrollmentDate: "",
    status: "",
    guardians: [],
  };
}

type StudentEditState = {
  studentId: string;
  isLoadingStudent: boolean;
  isSaving: boolean;
  error: string;
  form: StudentFormPayload;
  readonly isLoading: boolean; // true durante carregamento OU salvamento — usado pelo partial de campos
  readonly loadingLabel: string;
  init(): void;
  addGuardian(): void;
  removeGuardian(index: number): void;
  setPrimaryGuardian(index: number): void;
  submit(): void;
};

function studentEditDialog(el: HTMLElement): StudentEditState {
  const studentId = el.dataset.studentId || "";

  return {
    studentId,
    isLoadingStudent: false,
    isSaving: false,
    error: "",
    form: emptyForm(),

    get isLoading() {
      return this.isLoadingStudent || this.isSaving;
    },

    get loadingLabel() {
      return this.isLoadingStudent ? "Carregando..." : "Salvando...";
    },

    init() {
      this.isLoadingStudent = true;

      runServerAction<StudentFormPayload>((server) =>
        server.getStudentForEditForm(this.studentId),
      )
        .then((student) => {
          this.form = student;
          if (this.form.guardians.length === 0) {
            this.form.guardians.push({ ...emptyGuardian(), isPrimary: true });
          }
        })
        .catch((err: Error) => {
          this.error = "Erro ao carregar aluno: " + err.message;
        })
        .finally(() => {
          this.isLoadingStudent = false;
        });
    },

    addGuardian() {
      this.form.guardians.push(emptyGuardian());
    },

    removeGuardian(index: number) {
      if (this.form.guardians.length <= 1) return;

      const wasPrimary = this.form.guardians[index]?.isPrimary;
      this.form.guardians.splice(index, 1);

      if (wasPrimary && this.form.guardians.length > 0) {
        this.form.guardians[0]!.isPrimary = true;
      }
    },

    setPrimaryGuardian(index: number) {
      this.form.guardians.forEach((guardian, i) => {
        guardian.isPrimary = i === index;
      });
    },

    submit() {
      const validationError = validateStudentForm(this.form);
      if (validationError) {
        this.error = validationError;
        return;
      }

      this.error = "";
      this.isSaving = true;

      runServerAction((server) =>
        server.submitStudentEdit(this.studentId, this.form),
      )
        .then(() => google.script.host.close())
        .catch((err: Error) => {
          this.error = err.message;
          this.isSaving = false;
        });
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("studentEditDialog", studentEditDialog);
});
