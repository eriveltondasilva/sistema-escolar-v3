// client/dialogs/student-edit.ts
import { validateStudentForm } from "../utils.ts";

import type { GuardianData, StudentFormPayload } from "#server/types.ts";

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
    name: "",
    address: "",
    nationality: "",
    sex: "",
    birthDate: "",
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

      // getStudentForEditForm(studentId): StudentFormPayload
      google.script.run
        .withSuccessHandler((student: StudentFormPayload) => {
          this.form = student;
          if (this.form.guardians.length === 0) {
            this.form.guardians.push({ ...emptyGuardian(), isPrimary: true });
          }
          this.isLoadingStudent = false;
        })
        .withFailureHandler((err: Error) => {
          this.error = "Erro ao carregar aluno: " + err.message;
          this.isLoadingStudent = false;
        })
        .getStudentForEditForm(this.studentId);
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

      // submitStudentEdit(studentId, payload): void
      google.script.run
        .withSuccessHandler(() => google.script.host.close())
        .withFailureHandler((err: Error) => {
          this.error = err.message;
          this.isSaving = false;
        })
        .submitStudentEdit(this.studentId, this.form);
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("studentEditDialog", studentEditDialog);
});
