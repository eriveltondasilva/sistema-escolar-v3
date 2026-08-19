// client/dialogs/student-edit.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { parseInitData } from "../utils/parse-init-data.ts";
import { runServerAction } from "../utils/run-server-action.ts";
import { validateStudentForm } from "../utils/validate.ts";

import type {
  StudentEditInitData,
  StudentFormPayload,
} from "#server/roster/types.ts";
import type { GuardianData } from "#server/types.ts";
import type { AlpineComponent } from "alpinejs";

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
    status: "ativo",
    guardians: [],
  };
}

interface InitDialog {
  studentId: string;
  isEditMode: true;
  isLoadingStudent: boolean;
  isSaving: boolean;
  readonly isLoading: boolean;
  error: string;
  form: StudentFormPayload;
  // métodos
  init(): Promise<void>;
  addGuardian(): void;
  removeGuardian(index: number): void;
  setPrimaryGuardian(index: number): void;
  submit(): Promise<void>;
}

function initDialog(el: HTMLElement): AlpineComponent<InitDialog> {
  const { studentId } = parseInitData<StudentEditInitData>(el);

  return {
    studentId,
    isEditMode: true,
    isLoadingStudent: true,
    isSaving: false,
    get isLoading() {
      return this.isLoadingStudent || this.isSaving;
    },
    error: "",
    form: emptyForm(),

    async init() {
      try {
        const student = await runServerAction<StudentFormPayload>((server) =>
          server.getStudentForEditForm(this.studentId),
        );

        this.form = student;

        if (this.form.guardians.length === 0) {
          this.form.guardians = [{ ...emptyGuardian(), isPrimary: true }];
        }
      } catch (error: unknown) {
        this.error = "Erro ao carregar aluno: " + getErrorMsg(error);
      } finally {
        this.isLoadingStudent = false;
      }
    },

    addGuardian() {
      this.form.guardians = [...this.form.guardians, emptyGuardian()];
    },

    removeGuardian(index: number) {
      if (this.form.guardians.length <= 1) return;

      const wasPrimary = this.form.guardians[index]?.isPrimary;
      const updated = this.form.guardians.filter((_, i) => i !== index);

      if (wasPrimary && updated.length > 0) {
        updated[0]!.isPrimary = true;
      }

      this.form.guardians = updated;
    },

    setPrimaryGuardian(index: number) {
      this.form.guardians = this.form.guardians.map((guardian, i) => ({
        ...guardian,
        isPrimary: i === index,
      }));
    },

    async submit() {
      const validationError = validateStudentForm(this.form);

      if (validationError) {
        this.error = validationError;
        return;
      }

      this.error = "";
      this.isSaving = true;

      try {
        await runServerAction((server) =>
          server.submitStudentEdit(this.studentId, this.form),
        );

        google.script.host.close();
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
      } finally {
        this.isSaving = false;
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
