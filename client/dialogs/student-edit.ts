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
  error: string;
  form: StudentFormPayload;
  readonly isLoading: boolean;
  readonly loadingLabel: string;
  // Funções
  init(): Promise<void>;
  addGuardian(): void;
  removeGuardian(index: number): void;
  setPrimaryGuardian(index: number): void;
  submit(): Promise<void>;
}

function initDialog(el: HTMLElement): InitDialog {
  const { studentId } = parseInitData<StudentEditInitData>(el);

  return {
    studentId,
    isLoadingStudent: false,
    isEditMode: true,
    isSaving: false,
    error: "",
    form: emptyForm(),

    get isLoading() {
      return this.isLoadingStudent || this.isSaving;
    },

    get loadingLabel() {
      return this.isLoadingStudent ? "Carregando..." : "Salvando...";
    },

    async init() {
      this.isLoadingStudent = true;
      this.error = "";

      try {
        const student = await runServerAction<StudentFormPayload>((server) =>
          server.getStudentForEditForm(this.studentId),
        );

        this.form = student;

        if (this.form.guardians.length === 0) {
          this.form.guardians.push({ ...emptyGuardian(), isPrimary: true });
        }
      } catch (error: unknown) {
        this.error = "Erro ao carregar aluno: " + getErrorMsg(error);
      } finally {
        this.isLoadingStudent = false;
      }
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
        this.isSaving = false;
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
