// client/dialogs/student-create.ts
import { runServerAction } from "../utils/run-server-action.ts";
import { validateStudentForm } from "../utils/validate";

import type { CreateStudentPayload } from "#server/roster/types.ts";
import type { GuardianData } from "#server/types.ts";

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

function emptyForm(): CreateStudentPayload {
  return {
    name: "",
    address: "",
    nationality: "Brasileiro(a)",
    sex: "M",
    birthDate: "",
    guardians: [{ ...emptyGuardian(), isPrimary: true }],
  };
}

type StudentCreateState = {
  view: StudentCreateView;
  studentId: string;
  isLoading: boolean;
  error: string;
  form: CreateStudentPayload;
  addGuardian(): void;
  removeGuardian(index: number): void;
  setPrimaryGuardian(index: number): void;
  submit(): void;
};

function initDialog(): StudentCreateState {
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

      runServerAction<string>((server) =>
        server.submitStudentRegistration(this.form),
      )
        .then((newStudentId) => {
          this.studentId = newStudentId;
          this.view = "success";
        })
        .catch((err: Error) => {
          this.error = err.message;
        })
        .finally(() => {
          this.isLoading = false;
          this.form = emptyForm();
        });
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data(initDialog.name, initDialog);
});
