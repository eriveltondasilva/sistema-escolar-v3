// client/dialogs/student-create.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { runServerAction } from "../utils/run-server-action.ts";
import { validateStudentForm } from "../utils/validate";

import type { CreateStudentPayload } from "#server/roster/types.ts";
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

interface InitDialog {
  lastStudentId: string;
  isEditMode: false;
  isLoading: boolean;
  isOpeningEdit: boolean;
  error: string;
  form: CreateStudentPayload;
  // Funções
  addGuardian(): void;
  removeGuardian(index: number): void;
  setPrimaryGuardian(index: number): void;
  editStudent(): Promise<void>;
  submit(): Promise<void>;
}

function initDialog(): InitDialog {
  return {
    lastStudentId: "",
    isEditMode: false,
    isLoading: false,
    isOpeningEdit: false,
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

    async editStudent() {
      this.isOpeningEdit = true;
      this.error = "";

      try {
        await runServerAction((server) =>
          server.openStudentEditDialog(this.lastStudentId),
        );

        google.script.host.close();
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
        this.isOpeningEdit = false;
      }
    },

    async submit() {
      const validationError = validateStudentForm(this.form);

      if (validationError) {
        this.error = validationError;
        return;
      }

      this.error = "";
      this.isLoading = true;

      try {
        const newStudentId = await runServerAction<string>((server) =>
          server.submitStudentRegistration(this.form),
        );

        this.lastStudentId = newStudentId;
        this.form = emptyForm();
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
      } finally {
        this.isLoading = false;
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
