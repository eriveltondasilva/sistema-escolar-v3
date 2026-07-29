// client/dialogs/student-create.ts
import { validateStudentForm } from "../utils.ts";

import type { GuardianData, StudentFormPayload } from "#server/types.ts";

type StudentCreateView = "form" | "success";

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
    guardians: [{ ...emptyGuardian(), isPrimary: true }],
  };
}

type StudentCreateState = {
  view: StudentCreateView;
  studentId: string;
  isLoading: boolean;
  error: string;
  form: StudentFormPayload;
  addGuardian(): void;
  removeGuardian(index: number): void;
  setPrimaryGuardian(index: number): void;
  submit(): void;
};

function studentCreateDialog(): StudentCreateState {
  return {
    view: "form",
    studentId: "",
    isLoading: false,
    error: "",
    form: emptyForm(),

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
      this.isLoading = true;

      // submitStudentRegistration(payload): string (matrícula gerada)
      google.script.run
        .withSuccessHandler((newStudentId: string) => {
          this.isLoading = false;
          this.studentId = newStudentId;
          this.view = "success";
        })
        .withFailureHandler((err: Error) => {
          this.error = err.message;
          this.isLoading = false;
        })
        .submitStudentRegistration(this.form);
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("studentCreateDialog", studentCreateDialog);
});
